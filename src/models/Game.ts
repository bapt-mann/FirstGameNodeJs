// src/models/Game.ts
import { Player } from "./Player";
import { Unit } from "./Unit";
import { GameMap} from "./GameMap";
import { Tile, TileType } from "./Tile";
import { Floor } from "./Floor";

export class Game {
  roomCode: string;
  roomDbId: number;
  
  // On stocke la map ici
  map: GameMap;
  
  units: Unit[] = [];
  players: Player[] = [];
  turn: Player;
  status: 'LOBBY' | 'PLACEMENT' | 'PLAYING' | 'FINISHED' = 'LOBBY';

  constructor(roomCode: string, roomDbId: number, host: Player) {
    this.roomCode = roomCode;
    this.roomDbId = roomDbId;
    
    // On instancie la Map (10x15 sur 3 étages)
    this.map = new GameMap(10, 15, 1, 1);
    host.playerGameId = 1; // Premier joueur
    this.players.push(host);
    this.turn = host; 
  }

  addPlayer(player: Player) {
    if (this.players.length >= 2) throw new Error("Partie pleine !");
    player.playerGameId = 2; // Deuxième joueur
    this.players.push(player);
  }

  // --- C'EST ICI QUE ÇA DEVIENT PROPRE ---

  // Trouver une unité (Ça reste ici car 'units' est dans Game)
  getUnitAt(tile: Tile): Unit | undefined {
    return this.units.find(u => u.position.x === tile.x && u.position.y === tile.y && u.position.z === tile.floorZ);
  }

  // Vérifier si on peut aller sur une case
  isCellFree(tile: Tile): boolean {
    // 1. On demande à la MAP si c'est un mur ou le vide
    if (!tile.isWalkable) {
        return false;
    }

    // 2. On demande au JEU s'il y a déjà une unité dessus
    const unitHere = this.getUnitAt(tile);
    if (unitHere) {
        return false; 
    }

    return true;
  }

  startPlacement() {
      this.status = 'PLACEMENT';
      let posJ1: number = 0;
      let posJ2: number = 0;
      
      // initialise toutes les unités à une position "virtuelle"
      this.units.forEach(u => {
          if (u.ownerId === 1) {
              u.position = {x: posJ1, y: 0, z: 0};
              posJ1++;
          }
          else if (u.ownerId === 2) {
              u.position = { x: posJ2, y: this.map.height - 1, z: 0};
              posJ2++;
          }
      });
  }

  placeUnit(unitId: string, player: Player, tile: Tile) {
      if (this.status !== 'PLACEMENT') throw new Error("Pas en phase de placement");

      const unit = this.units.find(u => u.id === unitId);
      if (!unit) throw new Error("Unité introuvable");
      if (unit.ownerId !== player.dbId) throw new Error("Ce n'est pas ton unité");
      
      if (!tile || tile.isWalkable === false) {
           throw new Error("Tu ne peux pas placer ici !");
      }

      // 2. Vérifier si case occupée
      if (!this.isCellFree(tile)) throw new Error("Case occupée");
      unit.position = { x: tile.x, y: tile.y, z: tile.floorZ };
  }
}