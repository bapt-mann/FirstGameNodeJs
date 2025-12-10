
const socket = io();

// 1. On demande le pseudo au chargement de la page
const monPseudo = prompt("Quel est ton pseudo ?") || "Anonyme";
socket.emit('nouveau_joueur', monPseudo);

// Éléments du DOM
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const scoreList = document.getElementById('score-list');
const btnTerminer = document.getElementById('btn-terminer');

// ENVOI MESSAGE
form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value) {
    socket.emit('chat message', input.value);
    input.value = '';
    }
});

// RÉCEPTION MESSAGE (Mise à jour pour afficher le pseudo)
socket.on('chat message', (data) => {
    const item = document.createElement('li');
    item.textContent = `${data.pseudo} : ${data.text}`;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

// MISE À JOUR DES SCORES (Temps réel)
socket.on('maj_scores', (listeJoueurs) => {
    scoreList.innerHTML = ""; // On vide la liste
    // On transforme l'objet en tableau pour pouvoir boucler dessus
    for (let idSocket in listeJoueurs) {
        const info = listeJoueurs[idSocket];
        const li = document.createElement('li');
        li.textContent = `${info.pseudo} : ${info.count} msg`;
        scoreList.appendChild(li);
    }
});

// BOUTON TERMINER
btnTerminer.addEventListener('click', () => {
    if(confirm("Veux-tu vraiment sauvegarder ton score en BDD ?")) {
        socket.emit('sauvegarder_score');
    }
});

// CONFIRMATION SAUVEGARDE
socket.on('confirmation_save', (message) => {
    alert(message);
});

