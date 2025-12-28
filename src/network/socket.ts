import { Server, Socket } from "socket.io";
import db from "../config/db";
import { createRoomInDB, joinRoomByCode } from "../services/roomService";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import { getAllCharacters, toggleCharacterSelection, moveUnit } from "../services/gameService";
import { Debug } from "../models/Debug";
import { leaveRoomInDB } from "../services/roomService";
import { gameManager } from "../managers/GameManager"; // Assure-toi que le chemin est bon (G majuscule ?)  

var path = require('path');
var scriptName = path.basename(__filename);

export default function setupSocket(io: Server) {

    io.on("connection", (socket: Socket) => {
        
        // --- VARIABLES DE SESSION ---
        // On se souvient de qui est le joueur et où il se trouve
        let myUserId: number | null = null;
        let myUsername: string = "";
        let currentRoomCode: string | null = null; // Important : Stocke le code de la room actuelle

        console.log("Connecté : " + socket.id);
 
        // --- 1. LOGIN ---
        socket.on("login", async (pseudo: string) => {
            try {
                // 1. Authentification / Création (Code existant)
                const [rows] = await db.promise().query<RowDataPacket[]>(
                    "SELECT id, username FROM users WHERE username = ?", [pseudo]
                );

                if (rows.length > 0) {
                    myUserId = rows[0].id;
                    myUsername = rows[0].username;
                } else {
                    const [res] = await db.promise().query<ResultSetHeader>(
                        "INSERT INTO users (username) VALUES (?)", [pseudo]
                    );
                    myUserId = res.insertId;
                    myUsername = pseudo;
                }

                console.log(`${myUsername} est connecté (ID: ${myUserId})`);

                // ============================================================
                // 2. NOUVEAU : VÉRIFICATION DE RECONNEXION
                // ============================================================
                
                // On cherche si ce joueur est déjà dans une room active
                const [activeRooms] = await db.promise().query<RowDataPacket[]>(
                    `SELECT r.code, r.id as roomId 
                    FROM active_room_players arp
                    JOIN rooms r ON r.id = arp.room_id
                    WHERE arp.user_id = ? AND (r.status = 'WAITING' OR r.status = 'PLAYING')`,
                    [myUserId]
                );

                if (activeRooms.length > 0) {
                    // --- CAS 1 : LE JOUEUR EST DÉJÀ DANS UNE PARTIE ---
                    const roomCode = activeRooms[0].code;
                    const roomId = activeRooms[0].roomId;

                    // A. On remet la variable de session
                    currentRoomCode = roomCode;

                    // B. On remet le socket dans le canal Socket.IO
                    socket.join(roomCode);

                    // C. Mise à jour de la mémoire RAM (GameManager)
                    // C'est CRUCIAL : l'ancien socketId est mort, il faut mettre le nouveau
                    const game = gameManager.getGame(roomCode);
                    if (game) {
                        const player = game.players.find(p => p.dbId === myUserId);
                        if (player) {
                            player.socketId = socket.id; // Mise à jour de l'ID technique
                            console.log(`Reconnexion de ${myUsername} dans la room ${roomCode}`);
                        }
                    } else {
                        // Si la game est en BDD mais pas en RAM (ex: Serveur a redémarré)
                        // On pourrait la recréer ici, mais pour l'instant, on gère l'erreur
                        // ou on le laisse aller au menu.
                    }

                    // D. On dit au client : "Va direct au lobby !"
                    socket.emit("login_success", { id: myUserId, pseudo: myUsername });
                    socket.emit("reconnect_room", { code: roomCode });

                    // E. On rafraichit les données pour lui (liste des persos choisis, etc.)
                    // (Tu pourras ajouter l'envoi de l'état du jeu ici plus tard)
                    
                } else {
                    // --- CAS 2 : LE JOUEUR EST LIBRE ---
                    socket.emit("login_success", { id: myUserId, pseudo: myUsername });
                }

            } catch (err) {
                console.error(err);
                socket.emit("error_msg", "Erreur lors du login BDD");
            }
        });

        // --- 2. CRÉER UNE ROOM ---
        socket.on("create_room", async () => {
            if (!myUserId) return socket.emit("error_msg", "Tu dois te connecter d'abord !");

            try {
                // A. Création en BDD
                const { roomDbId, code } = await createRoomInDB(myUserId);

                // B. Création en Mémoire (RAM) via GameManager
                gameManager.createGame(code, roomDbId, {
                    socketId: socket.id,
                    pseudo: myUsername,
                    dbId: myUserId
                });

                // C. Socket rejoint le canal
                socket.join(code);
                currentRoomCode = code; // On mémorise le code !

                socket.emit("room_created", code);
                console.log(`Room créée : ${code} par ${myUsername}`);

            } catch (err) {
                console.error(err);
                socket.emit("error_msg", "Impossible de créer la room.");
            }
        });

        // --- 3. REJOINDRE UNE ROOM ---
        socket.on("join_room", async (code: string) => {
            if (!myUserId) return socket.emit("error_msg", "Tu dois te connecter d'abord !");

            try {
                // A. Validation BDD
                await joinRoomByCode(myUserId, code);

                // B. Ajout du joueur en Mémoire (RAM)
                // Attention : joinRoomByCode vérifie déjà si la game existe en BDD
                // Mais il faut vérifier si elle est chargée en mémoire
                const game = gameManager.getGame(code);
                
                if (game) {
                    gameManager.addPlayerToGame(code, {
                        socketId: socket.id,
                        pseudo: myUsername,
                        dbId: myUserId
                    });
                } else {
                    // Cas rare : Si le serveur a redémarré entre temps, la game existe en SQL mais pas en RAM.
                    // Pour l'instant, on renvoie une erreur, on gérera le "rechargement" plus tard.
                    return socket.emit("error_msg", "Cette partie n'est plus active en mémoire.");
                }

                // Socket rejoint le canal
                socket.join(code);
                currentRoomCode = code;

                socket.emit("room_joined", code);
                io.to(code).emit("player_arrived", myUsername);
                
                console.log(`${myUsername} a rejoint la room ${code}`);

            } catch (err: any) {
                socket.emit("error_msg", err.message);
            }
        });

        // --- 4. GESTION PERSONNAGES ---
        socket.on('get_characters', async () => {
            try {
                const chars = await getAllCharacters();
                socket.emit('list_characters', chars);
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('toggle_char', async (charId: number) => {        
            if (!currentRoomCode || !myUserId) return; // Sécurité

            try {
                // On récupère la game grâce au code stocké dans la variable de session
                const game = gameManager.getGame(currentRoomCode);
                
                if (game) {
                    // On utilise l'ID BDD stocké dans l'objet Game
                    const newTeam = await toggleCharacterSelection(game.roomDbId, myUserId, charId);
                    socket.emit('team_update', newTeam);
                } else {
                    socket.emit('error_msg', "Partie introuvable !");
                }
                
            } catch (err: any) {
                socket.emit('error_msg', err.message);
            }
        });

        // --- 5. GAMEPLAY (Mouvement) ---
        socket.on('move_unit', (data) => {
            if (!currentRoomCode) return;
            
            const game = gameManager.getGame(currentRoomCode);

            if (!game) {
                return socket.emit('error_message', "Partie non trouvée !");
            }

            try {
                // data contient { unitId, x, y }
                const updatedGame = moveUnit(game, data.unitId, data.x, data.y, socket.id);
                
                // On envoie la mise à jour à tout le monde DANS LA ROOM (via le code)
                io.to(currentRoomCode).emit('update_game', updatedGame);
            } catch (e: any) {
                socket.emit('error_message', e.message);
            }
        });

        // --- 6. DÉCONNEXION ---
        socket.on("disconnect", () => {
            console.log("Déconnexion : " + socket.id);
            // Ici, tu pourras ajouter une logique pour dire "Mario s'est déconnecté" aux autres
        });

        // --- 7. QUITTER LA ROOM ---
        socket.on("leave_room", async () => {
            if (!currentRoomCode || !myUserId) return;

            try {
                const code = currentRoomCode;
                
                // 1. Nettoyage BDD
                const result = await leaveRoomInDB(myUserId, code);

                // 2. Nettoyage Mémoire
                if (result?.action === 'ROOM_DELETED') {
                    // Si le chef est parti, on supprime tout le jeu en mémoire
                    gameManager.removeGame(code);
                    
                    // On prévient tout le monde (même le chef) que c'est fini
                    io.to(code).emit("room_closed", "Le créateur a fermé la room.");
                    
                    // On fait quitter le canal Socket à tout le monde
                    io.in(code).socketsLeave(code); 
                    
                } else {
                    // Si c'est juste un joueur qui part
                    gameManager.removePlayer(code, myUserId);
                    
                    // On le sort du canal
                    socket.leave(code);
                    socket.emit("left_success"); // Juste pour lui
                    
                    // On prévient les autres
                    io.to(code).emit("player_left", myUsername);
                }

                // 3. Reset de la variable locale
                currentRoomCode = null;
                console.log(`${myUsername} a quitté la room ${code}`);

            } catch (e) {
                console.error(e);
            }
        });
    });
}