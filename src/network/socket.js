import {
  addPlayer,
  incrementMessages,
  removePlayer,
  getPlayers,
} from "../services/gameService.js";

import { saveScore } from "../services/scoreService.js";

export default function setupSocket(io) {
  io.on("connection", (socket) => {
    console.log("Nouveau joueur :", socket.id);

    socket.on("nouveau_joueur", (pseudo) => {
      addPlayer(socket.id, pseudo);
      io.emit("maj_scores", getPlayers());
    });

    socket.on("chat message", (msg) => {
      incrementMessages(socket.id);
      const p = getPlayers()[socket.id];

      io.emit("chat message", { pseudo: p.pseudo, text: msg });
      io.emit("maj_scores", getPlayers());
    });

    socket.on("sauvegarder_score", () => {
      const joueur = getPlayers()[socket.id];

      saveScore(joueur.pseudo, joueur.count, (err) => {
        if (err)
          socket.emit("confirmation_save", "Erreur lors de la sauvegarde.");
        else socket.emit("confirmation_save", "Score sauvegardé !");
      });
    });

    socket.on("disconnect", () => {
      removePlayer(socket.id);
      io.emit("maj_scores", getPlayers());
    });
  });
}
