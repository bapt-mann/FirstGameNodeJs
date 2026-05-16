import { Server, Socket } from "socket.io";
import bcrypt from 'bcryptjs';
import db from "../config/db";
import { createRoomInDB, joinRoomByCode } from "../services/roomService";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { getAllCharacters, toggleCharacterSelection, moveUnit, getSelectedCharacters, automaticPlaceUnit } from "../services/gameService";
import { leaveRoomInDB } from "../services/roomService";
import { gameManager } from "../managers/GameManager";
import { Unit } from "../models/Unit";
import { setDevRoomCode } from "../server";

const BCRYPT_ROUNDS = 10;

export default function setupSocket(io: Server) {

    io.on("connection", (socket: Socket) => {

        // ── Variables de session (propres à cette connexion socket) ──────
        let myUserId: number | null = null;  // userId MySQL du joueur connecté
        let myUsername: string      = "";
        let currentRoomCode: string | null = null;

        console.log("Connecté : " + socket.id);

        // ================================================================
        // 1. LOGIN
        // ================================================================
        socket.on("login", async (data: { pseudo: string; password: string }) => {
            try {
                const pseudo   = (data?.pseudo   || "").trim();
                const password = (data?.password || "").trim();

                if (!pseudo || pseudo.length < 2)
                    return socket.emit("login_error", "Le pseudo doit faire au moins 2 caractères.");
                if (!password || password.length < 4)
                    return socket.emit("login_error", "Le mot de passe doit faire au moins 4 caractères.");

                const [rows] = await db.promise().query<RowDataPacket[]>(
                    "SELECT id, username, password_hash FROM users WHERE username = ?",
                    [pseudo]
                );

                if (rows.length > 0) {
                    const user = rows[0];

                    if (!user.password_hash) {
                        // Ancien compte sans mot de passe — on lui en affecte un
                        const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
                        await db.promise().query(
                            "UPDATE users SET password_hash = ? WHERE id = ?",
                            [hash, user.id]
                        );
                    } else {
                        const valid = await bcrypt.compare(password, user.password_hash);
                        if (!valid) return socket.emit("login_error", "Mot de passe incorrect.");
                    }

                    myUserId   = user.id;
                    myUsername = user.username;

                } else {
                    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
                    const [res] = await db.promise().query<ResultSetHeader>(
                        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                        [pseudo, hash]
                    );
                    myUserId   = res.insertId;
                    myUsername = pseudo;
                    console.log(`🆕 Nouveau compte : ${pseudo}`);
                }

                console.log(`✅ ${myUsername} connecté (userId: ${myUserId})`);

                // Vérifier si le joueur était déjà dans une room
                const [activeRooms] = await db.promise().query<RowDataPacket[]>(
                    `SELECT r.code
                     FROM active_room_players arp
                     JOIN rooms r ON r.id = arp.room_id
                     WHERE arp.user_id = ? AND r.status IN ('WAITING', 'PLAYING')`,
                    [myUserId]
                );

                if (activeRooms.length > 0) {
                    const roomCode = activeRooms[0].code;
                    currentRoomCode = roomCode;
                    socket.join(roomCode);

                    // Mettre à jour le socketId dans la game en mémoire
                    const game = gameManager.getGame(roomCode);
                    if (game) {
                        const player = game.players.find(p => p.userId === myUserId);
                        if (player) player.socketId = socket.id;
                        console.log(`🔄 Reconnexion de ${myUsername} dans la room ${roomCode}`);
                    }

                    socket.emit("login_success", { id: myUserId, pseudo: myUsername });
                    socket.emit("reconnect_room", { code: roomCode });
                } else {
                    socket.emit("login_success", { id: myUserId, pseudo: myUsername });
                }

            } catch (err) {
                console.error(err);
                socket.emit("login_error", "Erreur serveur lors du login.");
            }
        });

        // ================================================================
        // 2. CRÉER UNE ROOM
        // ================================================================
        socket.on("create_room", async () => {
            if (!myUserId) return socket.emit("error_msg", "Tu dois te connecter d'abord !");

            try {
                const { roomDbId, code } = await createRoomInDB(myUserId);

                gameManager.createGame(code, roomDbId, {
                    socketId: socket.id,
                    pseudo:   myUsername,
                    userId:   myUserId
                });

                socket.join(code);
                currentRoomCode = code;

                if (process.env.DEV_MODE === 'true') setDevRoomCode(code);

                socket.emit("room_created", code);
                console.log(`Room créée : ${code} par ${myUsername}`);

            } catch (err) {
                console.error(err);
                socket.emit("error_msg", "Impossible de créer la room.");
            }
        });

        // ================================================================
        // 3. REJOINDRE UNE ROOM
        // ================================================================
        socket.on("join_room", async (code: string) => {
            if (!myUserId) return socket.emit("error_msg", "Tu dois te connecter d'abord !");

            try {
                await joinRoomByCode(myUserId, code);

                const game = gameManager.getGame(code);
                if (!game) return socket.emit("error_msg", "Cette partie n'est plus active en mémoire.");

                gameManager.addPlayerToGame(code, {
                    socketId: socket.id,
                    pseudo:   myUsername,
                    userId:   myUserId
                });

                socket.join(code);
                currentRoomCode = code;

                socket.emit("room_joined", code);
                io.to(code).emit("player_arrived", myUsername);
                console.log(`${myUsername} a rejoint la room ${code}`);

            } catch (err: any) {
                socket.emit("error_msg", err.message);
            }
        });

        // ================================================================
        // 4. GESTION PERSONNAGES
        // ================================================================
        socket.on('get_characters', async () => {
            try {
                socket.emit('list_characters', await getAllCharacters());
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('toggle_char', async (charId: number) => {
            if (!currentRoomCode || !myUserId) return;
            try {
                const game = gameManager.getGame(currentRoomCode);
                if (!game) return socket.emit('error_msg', "Partie introuvable !");
                const newTeam = await toggleCharacterSelection(game.roomDbId, myUserId, charId);
                socket.emit('team_update', newTeam);
            } catch (err: any) {
                socket.emit('error_msg', err.message);
            }
        });

        // ================================================================
        // 5. GAMEPLAY — MOUVEMENT
        // ================================================================
        socket.on('move_unit', (data: { unitId: string; tile: any }) => {
            if (!currentRoomCode || !myUserId) return;

            const game = gameManager.getGame(currentRoomCode);
            if (!game) return socket.emit('error_message', "Partie non trouvée !");

            try {
                const updatedGame = moveUnit(game, data.unitId, data.tile, myUserId);
                io.to(currentRoomCode).emit('update_game', updatedGame);
            } catch (e: any) {
                socket.emit('error_message', e.message);
            }
        });

        // ================================================================
        // 6. DÉCONNEXION
        // ================================================================
        socket.on("disconnect", () => {
            console.log(`Déconnexion : ${myUsername || socket.id}`);
        });

        // ================================================================
        // 7. QUITTER LA ROOM
        // ================================================================
        socket.on("leave_room", async () => {
            if (!currentRoomCode || !myUserId) return;

            try {
                const code   = currentRoomCode;
                const result = await leaveRoomInDB(myUserId, code);

                if (result?.action === 'ROOM_DELETED') {
                    gameManager.removeGame(code);
                    if (process.env.DEV_MODE === 'true') setDevRoomCode(null);
                    io.to(code).emit("room_closed", "Le créateur a fermé la room.");
                    io.in(code).socketsLeave(code);
                } else {
                    gameManager.removePlayer(code, myUserId);
                    socket.leave(code);
                    socket.emit("left_success");
                    io.to(code).emit("player_left", myUsername);
                }

                currentRoomCode = null;
                console.log(`${myUsername} a quitté la room ${code}`);

            } catch (e) {
                console.error(e);
            }
        });

        // ================================================================
        // 8. PRÊT / DÉBUT DE PARTIE
        // ================================================================
        socket.on('player_ready', async () => {
            if (!currentRoomCode) return;

            const roomCode = currentRoomCode;
            const game     = gameManager.getGame(roomCode);
            if (!game) return;

            // On identifie le joueur par son userId (stable, contrairement au socketId)
            const player = game.players.find(p => p.userId === myUserId);
            if (!player) return;

            try {
                const selectedIds = await getSelectedCharacters(game.roomDbId, player.userId);
                player.selectedCharacterIds = selectedIds;
                player.isReady = true;

                for (const charId of player.selectedCharacterIds) {
                    const charData = { name: "Guerrier", hp: 20, atk: 8 }; // TODO: stats depuis BDD

                    const unitId  = `${player.teamSlot}_${charId}_${charData.name}`;
                    const newUnit = new Unit(
                        unitId,
                        charData.name,
                        player.userId,      // ownerId
                        player.teamSlot,    // ownerTeamSlot
                        1, 1, 1
                    );
                    game.units.push(newUnit);
                }

                console.log(`Joueur ${player.pseudo} (slot ${player.teamSlot}) prêt — ${player.selectedCharacterIds.length} unités`);
                socket.to(roomCode).emit('opponent_ready', player.pseudo);

                const allReady = game.players.length === 2 && game.players.every(p => p.isReady);
                if (allReady) {
                    console.log(`Room ${roomCode} : lancement !`);
                    game.status = 'PLAYING';
                    automaticPlaceUnit(game);
                    io.to(roomCode).emit('game_start', game);
                    io.to(roomCode).emit('first_placement', game);
                }

            } catch (err) {
                console.error("Erreur player_ready :", err);
            }
        });
    });
}
