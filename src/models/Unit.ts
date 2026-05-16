import { Position } from "./Types";

export class Unit {
    id: string;       // Identifiant unique de l'unité sur le plateau (ex: "1_5_Guerrier")
    name: string;     // Nom du personnage (ex: "Guerrier")

    // Propriétaire
    ownerId: number;       // userId MySQL du joueur propriétaire (ex: 42)
    ownerTeamSlot: number; // Camp du propriétaire dans la partie : 1 ou 2

    position: Position;

    // Stats
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    moveRange: number;
    range: number;

    hasMoved: boolean; // true si l'unité a déjà agi ce tour

    constructor(
        id: string,
        name: string,
        ownerId: number,
        ownerTeamSlot: number,
        x: number,
        y: number,
        z: number
    ) {
        this.id            = id;
        this.name          = name;
        this.ownerId       = ownerId;
        this.ownerTeamSlot = ownerTeamSlot;

        this.position = { x, y, z };

        this.hp        = 20;
        this.maxHp     = 20;
        this.atk       = 8;
        this.def       = 3;
        this.moveRange = 4;
        this.range     = 1;
        this.hasMoved  = false;
    }
}
