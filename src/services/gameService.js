import Player from '../models/Player.js';
let joueurs = {};

function addPlayer(socketId, pseudo) {
  joueurs[socketId] = new Player(socketId, pseudo);
  return joueurs;
}

function incrementMessages(socketId) {
  if (joueurs[socketId]) {
    joueurs[socketId].increment();
  }
  return joueurs;
}

function removePlayer(socketId) {
  delete joueurs[socketId];
  return joueurs;
}

function getPlayers() {
  return joueurs;
}

export { addPlayer, incrementMessages, removePlayer, getPlayers };
