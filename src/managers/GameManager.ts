import { Game } from "../models/Game";
import { Player } from "../models/Player";

class GameManager {
    private games: Map<string, Game> = new Map();

    createGame(roomCode: string, roomDbId: number, hostInfo: { socketId: string; pseudo: string; userId: number }): Game {
        const hostPlayer = new Player(hostInfo.socketId, hostInfo.pseudo, hostInfo.userId, 1);
        const newGame    = new Game(roomCode, roomDbId, hostPlayer);
        this.games.set(roomCode, newGame);
        return newGame;
    }

    getGame(roomCode: string): Game | undefined {
        return this.games.get(roomCode);
    }

    addPlayerToGame(roomCode: string, playerInfo: { socketId: string; pseudo: string; userId: number }) {
        const game = this.getGame(roomCode);
        if (game) {
            const newPlayer = new Player(playerInfo.socketId, playerInfo.pseudo, playerInfo.userId, 2);
            game.addPlayer(newPlayer);
        }
    }

    removePlayer(roomCode: string, userId: number) {
        const game = this.games.get(roomCode);
        if (!game) return;

        game.players = game.players.filter(p => p.userId !== userId);

        if (game.players.length === 0) {
            this.removeGame(roomCode);
        }
    }

    removeGame(roomCode: string) {
        this.games.delete(roomCode);
    }
}

export const gameManager = new GameManager();
