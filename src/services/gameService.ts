import { Player } from '../models/Player';

// 1. On définit le type de notre "dictionnaire" de joueurs
// Cela dit : "C'est un objet dont les clés sont des strings (id) et les valeurs des Player"
interface PlayersList {
  [socketId: string]: Player;
}

let joueurs: PlayersList = {};

function addPlayer(socketId: string, pseudo: string): PlayersList {
  // TypeScript sait maintenant que c'est légal d'assigner un Player ici
  joueurs[socketId] = new Player(socketId, pseudo);
  return joueurs;
}

function incrementMessages(socketId: string): PlayersList {
  const player = joueurs[socketId];
  if (player) {
    player.increment(); 
  }
  return joueurs;
}

function removePlayer(socketId: string): PlayersList {
  delete joueurs[socketId];
  return joueurs;
}

function getPlayers(): PlayersList {
  return joueurs;
}

export { addPlayer, incrementMessages, removePlayer, getPlayers };