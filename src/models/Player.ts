export class Player {

  // 1. IDENTIFICATION
  public socketId: string; // L'adresse temporaire (ex: "Xy9z...") pour Socket.IO
  public dbId: number; // L'ID unique MySQL (ex: 42) pour la BDD
  public gameId: number; // 1 ou 2 pour différencier les joueurs dans la partie
  public pseudo: string;

  // 2. ÉTAT DANS LE LOBBY
  public isReady: boolean = false;   
  public selectedCharacterIds: number[] = []; // IDs des persos choisis

  constructor(socketId: string, pseudo: string, dbId: number, playerGameId: number) {
    this.socketId = socketId;
    this.pseudo = pseudo;
    this.dbId = dbId;
    this.gameId = playerGameId;
  }
}