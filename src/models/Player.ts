export class Player {

    // Identité réseau (temporaire — change à chaque reconnexion)
    public socketId: string;

    // Identité persistante
    public userId: number;   // ID MySQL de l'utilisateur (ex: 42)
    public pseudo: string;

    // Position dans la partie : 1 = premier joueur, 2 = second joueur
    public teamSlot: number;

    // État dans le lobby
    public isReady: boolean = false;
    public selectedCharacterIds: number[] = [];

    constructor(socketId: string, pseudo: string, userId: number, teamSlot: number) {
        this.socketId  = socketId;
        this.pseudo    = pseudo;
        this.userId    = userId;
        this.teamSlot  = teamSlot;
    }
}
