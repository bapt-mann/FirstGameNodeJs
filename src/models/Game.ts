import { Player } from "./Player";
import { Unit } from "./Unit";
import { GameMap } from "./GameMap";
import { Tile } from "./Tile";

export class Game {
    roomCode:  string;
    roomDbId:  number; // ID MySQL de la room (pas un userId !)

    map:     GameMap;
    units:   Unit[]   = [];
    players: Player[] = [];
    turn:    Player;

    status: 'LOBBY' | 'PLACEMENT' | 'PLAYING' | 'FINISHED' = 'LOBBY';

    constructor(roomCode: string, roomDbId: number, host: Player) {
        this.roomCode = roomCode;
        this.roomDbId = roomDbId;
        this.map      = new GameMap(10, 15, 1, 1);

        host.teamSlot = 1;
        this.players.push(host);
        this.turn = host;
    }

    addPlayer(player: Player) {
        if (this.players.length >= 2) throw new Error("Partie pleine !");
        player.teamSlot = 2;
        this.players.push(player);
    }

    // Trouver une unité à une position donnée
    getUnitAt(tile: Tile): Unit | undefined {
        return this.units.find(u =>
            u.position.x === tile.x &&
            u.position.y === tile.y &&
            u.position.z === tile.floorZ
        );
    }

    // Vérifier si une case est libre (marchable + pas d'unité)
    isCellFree(tile: Tile): boolean {
        if (!tile.isWalkable) return false;
        return !this.getUnitAt(tile);
    }

    startPlacement() {
        this.status = 'PLACEMENT';
        let slotJ1 = 0;
        let slotJ2 = 0;

        this.units.forEach(u => {
            if (u.ownerTeamSlot === 1) {
                u.position = { x: slotJ1, y: 0, z: 0 };
                slotJ1++;
            } else if (u.ownerTeamSlot === 2) {
                u.position = { x: slotJ2, y: this.map.height - 1, z: 0 };
                slotJ2++;
            }
        });
    }

    placeUnit(unitId: string, player: Player, tile: Tile) {
        if (this.status !== 'PLACEMENT') throw new Error("Pas en phase de placement.");

        const unit = this.units.find(u => u.id === unitId);
        if (!unit) throw new Error("Unité introuvable.");

        // ✅ Fix : on compare bien ownerId (userId) avec player.userId
        if (unit.ownerId !== player.userId) throw new Error("Ce n'est pas ton unité.");

        if (!tile?.isWalkable) throw new Error("Tu ne peux pas placer ici !");
        if (!this.isCellFree(tile)) throw new Error("Case occupée.");

        unit.position = { x: tile.x, y: tile.y, z: tile.floorZ };
    }
}
