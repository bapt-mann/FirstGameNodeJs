import { Server, Socket } from "socket.io";
import {
  addPlayer,
  incrementMessages,
  removePlayer,
  getPlayers,
} from "../services/gameService";

import { saveScore } from "../services/scoreService"; 

// 1. On définit une Interface pour savoir ce qu'est un Joueur
// Cela permet à TS de savoir que 'joueur.count' existe.
interface PlayerData {
    pseudo: string;
    count: number;
}

// 2. On type la liste des joueurs (une clé ID -> un objet PlayerData)
interface PlayersList {
    [socketId: string]: PlayerData;
}

// 3. On type l'argument 'io' avec le type 'Server' officiel
export default function setupSocket(io: Server) {
    
  io.on("connection", (socket: Socket) => {
    console.log("Nouveau joueur :", socket.id);

    // On précise que 'pseudo' doit être une string
    socket.on("nouveau_joueur", (pseudo: string) => {
      addPlayer(socket.id, pseudo);
      io.emit("maj_scores", getPlayers());
    });

    socket.on("chat message", (msg: string) => {
      incrementMessages(socket.id);
      
      // On récupère la liste et on dit à TS que c'est bien notre type PlayersList
      const players = getPlayers() as PlayersList;
      const p = players[socket.id];

      // Sécurité : on vérifie que le joueur existe bien avant d'envoyer
      if (p) {
          io.emit("chat message", { pseudo: p.pseudo, text: msg });
          io.emit("maj_scores", players);
      }
    });

    socket.on("sauvegarder_score", () => {
      const players = getPlayers() as PlayersList;
      const joueur = players[socket.id];

      if (joueur) {
          // On type l'erreur (soit une Error, soit null)
          saveScore(joueur.pseudo, joueur.count, (err: Error | null) => {
            if (err) {
              socket.emit("confirmation_save", "Erreur lors de la sauvegarde.");
              console.error(err);
            } else {
              socket.emit("confirmation_save", "Score sauvegardé !");
            }
          });
      }
    });

    socket.on("disconnect", () => {
      removePlayer(socket.id);
      io.emit("maj_scores", getPlayers());
    });
  });
}