import { Player } from "./Player";

export class Game {
    public id : string;
    public players : Player[];
    public code : string;

    constructor(id: string, code: string) {
        this.id = id;
        this.code = code;
        this.players = [];
    }

    public addPlayer(player: Player) {
        this.players.push(player);
    }
}