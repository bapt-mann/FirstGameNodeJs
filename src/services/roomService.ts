import db from "../config/db";
import { RowDataPacket, ResultSetHeader } from "mysql2";

// Génère un code aléatoire (ex: "K9X2")
function generateRoomCode(length: number = 4): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// 1. Créer une Room
export async function createRoomInDB(hostId: number) {
    const code = generateRoomCode();
    
    // On insère la room
    const [result] = await db.promise().query<ResultSetHeader>(
        "INSERT INTO rooms (code, host_id, status) VALUES (?, ?, 'WAITING')",
        [code, hostId]
    );

    const roomDbId = result.insertId;

    // On ajoute automatiquement le Host dans la liste des joueurs
    await addPlayerToRoomDB(roomDbId, hostId);

    return { roomDbId, code };
}

// 2. Rejoindre une Room (par Code)
export async function joinRoomByCode(userId: number, roomCode: string) {
    // 1. Récupérer l'ID de la room
    const [rows] = await db.promise().query<RowDataPacket[]>(
        "SELECT id FROM rooms WHERE code = ? AND status = 'WAITING'",
        [roomCode]
    );

    if (rows.length === 0) throw new Error("Room introuvable !");
    const roomId = rows[0].id;

    // --- VÉRIFIER SI ON EST DÉJÀ DEDANS ---
    const [alreadyIn] = await db.promise().query<RowDataPacket[]>(
        "SELECT * FROM active_room_players WHERE room_id = ? AND user_id = ?",
        [roomId, userId]
    );

    if (alreadyIn.length > 0) {
        throw new Error("Tu es déjà dans cette room (rafraîchis la page) !");
    }

    // 2. Vérifier le nombre de joueurs (max 2)
    const [countRes] = await db.promise().query<RowDataPacket[]>(
        "SELECT COUNT(*) as count FROM active_room_players WHERE room_id = ?",
        [roomId]
    );

    if (countRes[0].count >= 2) throw new Error("La room est complète !");

    // 3. Ajouter le joueur
    await addPlayerToRoomDB(roomId, userId);

    return { roomId, code: roomCode };
}

// Helper : Ajouter dans la table de liaison
async function addPlayerToRoomDB(roomId: number, userId: number) {
    try {
        await db.promise().query(
            "INSERT INTO active_room_players (room_id, user_id) VALUES (?, ?)",
            [roomId, userId]
        );
    } catch (e: any) {
        // Si l'erreur est "Duplicate entry", ça veut dire qu'il est déjà dedans, c'est pas grave
        if (e.code !== 'ER_DUP_ENTRY') throw e;
    }
}

export async function leaveRoomInDB(userId: number, roomCode: string) {
    // 1. On récupère l'ID de la room et l'ID du Host
    const [rooms] = await db.promise().query<RowDataPacket[]>(
        "SELECT id, host_id FROM rooms WHERE code = ?", 
        [roomCode]
    );

    if (rooms.length === 0) return null; // La room n'existe pas

    const room = rooms[0];

    // 2. LOGIQUE DE SUPPRESSION
    if (room.host_id === userId) {
        // C'est le CHEF -> On supprime TOUTE la room
        await db.promise().query("DELETE FROM rooms WHERE id = ?", [room.id]);
        return { action: 'ROOM_DELETED' };
    } else {
        // C'est un INVITÉ -> On le retire juste de la liste
        await db.promise().query(
            "DELETE FROM active_room_players WHERE room_id = ? AND user_id = ?",
            [room.id, userId]
        );
        return { action: 'PLAYER_LEFT' };
    }
}