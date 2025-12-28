import db from "../config/db";
import { RowDataPacket } from "mysql2";
import { Game } from "../models/Game";

// =========================================================
// 1. PARTIE BDD : GESTION DES PERSONNAGES
// =========================================================

// Récupérer tous les persos disponibles
export async function getAllCharacters() {
    const [rows] = await db.promise().query<RowDataPacket[]>(
        "SELECT * FROM characters"
    );
    return rows;
}

// Gérer la sélection (Click sur une carte)
export async function toggleCharacterSelection(roomDbId: number, userId: number, charId: number) {
    // 1. On regarde ce qu'il a déjà choisi
    const [currentSelection] = await db.promise().query<RowDataPacket[]>(
        "SELECT character_id FROM room_team_selection WHERE room_id = ? AND user_id = ?",
        [roomDbId, userId]
    );

    const isSelected = currentSelection.some(row => row.character_id === charId);

    if (isSelected) {
        // SI DÉJÀ LÀ : On supprime
        await db.promise().query(
            "DELETE FROM room_team_selection WHERE room_id = ? AND user_id = ? AND character_id = ?",
            [roomDbId, userId, charId]
        );
    } else {
        // SI PAS LÀ : On vérifie la limite (3 max)
        if (currentSelection.length >= 3) {
            throw new Error("Ton équipe est complète (3 max) !");
        }
        // On ajoute
        await db.promise().query(
            "INSERT INTO room_team_selection (room_id, user_id, character_id) VALUES (?, ?, ?)",
            [roomDbId, userId, charId]
        );
    }

    // On renvoie la nouvelle liste d'IDs mise à jour
    const [newSelection] = await db.promise().query<RowDataPacket[]>(
        "SELECT character_id FROM room_team_selection WHERE room_id = ? AND user_id = ?",
        [roomDbId, userId]
    );
    
    return newSelection.map(row => row.character_id);
}

// =========================================================
// 2. PARTIE JEU : LOGIQUE TACTIQUE (MÉMOIRE)
// =========================================================

export function moveUnit(game: Game, unitId: string, targetX: number, targetY: number, playerId: string) {
    const unit = game.units.find(u => u.id === unitId);

    // 1. Vérifications de base
    if (!unit) throw new Error("Unité introuvable");
    if (unit.ownerId !== playerId) throw new Error("Ce n'est pas votre unité !");
    
    // (Tu pourras ajouter ici la logique de 'hasMoved' plus tard)
    // if (unit.hasMoved) throw new Error("Cette unité a déjà bougé.");
    
    // 2. Vérifier la distance (Maths simples : |x1-x2| + |y1-y2|)
    const distance = Math.abs(unit.position.x - targetX) + Math.abs(unit.position.y - targetY);
    if (distance > unit.moveRange) throw new Error("Trop loin !");

    // 3. Vérifier si la case est occupée
    if (!game.isCellFree(targetX, targetY)) throw new Error("Case occupée !");

    // 4. Appliquer le mouvement
    unit.position.x = targetX;
    unit.position.y = targetY;
    // unit.hasMoved = true; 

    return game; // On renvoie l'état mis à jour
}