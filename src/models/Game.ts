import { Player } from "./Player";
import { Unit } from "./Unit";

export class Game {
  roomCode: string;          // ✅ AJOUT : Pour identifier la game par son code (ex: "X7B2")
  roomDbId: number;          // ID SQL
  
  mapWidth: number = 10;
  mapHeight: number = 10;
  
  units: Unit[] = [];
  players: Player[] = [];    // La liste grandira quand le J2 rejoindra
  turn: Player;              
  
  status: 'LOBBY' | 'PLAYING' | 'FINISHED' = 'LOBBY'; // ✅ AJOUT : Pour savoir si on joue ou si on attend

  // Le constructeur prend maintenant le Host (le créateur)
  constructor(roomCode: string, roomDbId: number, host: Player) {
    this.roomCode = roomCode;
    this.roomDbId = roomDbId;
    
    // On initialise la liste avec le créateur
    this.players.push(host);
    
    // Par défaut, le tour est au créateur (sera changé au start)
    this.turn = host; 
  }

  // Méthode pour ajouter le 2ème joueur quand il rejoint
  addPlayer(player: Player) {
    if (this.players.length >= 2) throw new Error("Partie pleine !");
    this.players.push(player);
  }

  isCellFree(x: number, y: number): boolean {
    return !this.units.some(u => u.position.x === x && u.position.y === y);
  }

  getUnitAt(x: number, y: number): Unit | undefined {
    return this.units.find(u => u.position.x === x && u.position.y === y);
  }
}