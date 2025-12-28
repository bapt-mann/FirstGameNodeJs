import { Game } from "../models/Game";
import { Player } from "../models/Player";

class GameManager {
    private games: Map<string, Game> = new Map();

    // On passe toutes les infos nécessaires pour créer le Host et la Game
    createGame(roomCode: string, roomDbId: number, hostInfo: { socketId: string, pseudo: string, dbId: number }): Game {
        
        // 1. On crée l'objet Player pour le Host
        const hostPlayer = new Player(hostInfo.socketId, hostInfo.pseudo, hostInfo.dbId);
        
        // 2. On crée la Game avec ce Host
        const newGame = new Game(roomCode, roomDbId, hostPlayer);
        
        // 3. On stocke
        this.games.set(roomCode, newGame);
        
        return newGame;
    }

    getGame(roomCode: string): Game | undefined {
        return this.games.get(roomCode);
    }
    
    // Utile quand le J2 rejoint
    addPlayerToGame(roomCode: string, playerInfo: { socketId: string, pseudo: string, dbId: number }) {
        const game = this.getGame(roomCode);
        if (game) {
            const newPlayer = new Player(playerInfo.socketId, playerInfo.pseudo, playerInfo.dbId);
            game.addPlayer(newPlayer);
        }
    }

    // Retirer un joueur d'une partie
    removePlayer(roomCode: string, dbId: number) {
        const game = this.games.get(roomCode);
        if (!game) return;

        // On filtre la liste pour enlever ce joueur
        game.players = game.players.filter(p => p.dbId !== dbId);

        // Si la game est vide, on la supprime de la mémoire
        if (game.players.length === 0) {
            this.removeGame(roomCode);
        }
    }

    removeGame(roomCode: string) {
        this.games.delete(roomCode);
    }
}

export const gameManager = new GameManager();