import db from "../config/db";
import { RowDataPacket } from "mysql2";
import { Game } from "../models/Game";
import { Tile } from "../models/Tile";

// =========================================================
// 1. BDD — GESTION DES PERSONNAGES
// =========================================================

export async function getAllCharacters() {
    const [rows] = await db.promise().query<RowDataPacket[]>("SELECT * FROM characters");
    return rows;
}

export async function toggleCharacterSelection(roomDbId: number, userId: number, charId: number) {
    const [currentSelection] = await db.promise().query<RowDataPacket[]>(
        "SELECT character_id FROM room_team_selection WHERE room_id = ? AND user_id = ?",
        [roomDbId, userId]
    );

    const isSelected = currentSelection.some(row => row.character_id === charId);

    if (isSelected) {
        await db.promise().query(
            "DELETE FROM room_team_selection WHERE room_id = ? AND user_id = ? AND character_id = ?",
            [roomDbId, userId, charId]
        );
    } else {
        if (currentSelection.length >= 3) throw new Error("Ton équipe est complète (3 max) !");
        await db.promise().query(
            "INSERT INTO room_team_selection (room_id, user_id, character_id) VALUES (?, ?, ?)",
            [roomDbId, userId, charId]
        );
    }

    const [newSelection] = await db.promise().query<RowDataPacket[]>(
        "SELECT character_id FROM room_team_selection WHERE room_id = ? AND user_id = ?",
        [roomDbId, userId]
    );
    return newSelection.map(row => row.character_id);
}

export async function getSelectedCharacters(roomDbId: number, userId: number) {
    const [rows] = await db.promise().query<RowDataPacket[]>(
        "SELECT character_id FROM room_team_selection WHERE room_id = ? AND user_id = ?",
        [roomDbId, userId]
    );
    return rows.map(row => row.character_id);
}

// =========================================================
// 2. LOGIQUE DE JEU (mémoire)
// =========================================================

// Placement automatique au début de la partie
export function automaticPlaceUnit(game: Game) {
    let slotJ1 = 0;
    let slotJ2 = 0;

    game.units.forEach(u => {
        if (u.ownerTeamSlot === 1) {
            u.position = { x: slotJ1, y: 0, z: 0 };
            slotJ1++;
        } else if (u.ownerTeamSlot === 2) {
            u.position = { x: slotJ2, y: game.map.height - 1, z: 0 };
            slotJ2++;
        }
    });
}

// Déplacement d'une unité
export function moveUnit(game: Game, unitId: string, targetTile: Tile, userId: number): Game {
    const unit = game.units.find(u => u.id === unitId);

    if (!unit)                        throw new Error("Unité introuvable.");
    if (unit.ownerId !== userId)      throw new Error("Ce n'est pas ton unité !");

    const distance = Math.abs(unit.position.x - targetTile.x)
                   + Math.abs(unit.position.y - targetTile.y);

    if (distance > unit.moveRange)    throw new Error(`Trop loin ! (distance: ${distance}, portée: ${unit.moveRange})`);
    if (!game.isCellFree(targetTile)) throw new Error("Case occupée ou non accessible.");

    unit.position.x = targetTile.x;
    unit.position.y = targetTile.y;
    unit.position.z = targetTile.floorZ;

    return game;
}
