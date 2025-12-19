// 1. On déclare 'io' car il vient du script chargé dans le HTML
// (TypeScript ne le connait pas par défaut sans bundler)
declare var io: any;

const socket = io();

const scriptName = "client";


// 2. Interfaces pour définir la forme des données reçues
interface ChatMessage {
    pseudo: string;
    text: string;
}

interface PlayerInfo {
    pseudo: string;
    count: number;
}

interface PlayersList {
    [socketId: string]: PlayerInfo;
}

// 3. On demande le pseudo
// prompt() peut retourner null, on assure que c'est une string
const monPseudo: string = prompt("Quel est ton pseudo ?") || "Anonyme";


socket.emit('nouveau_joueur', monPseudo);

// 4. Éléments du DOM avec "Casting" (Typage forcé)
// On utilise 'as HTML...' pour dire à TS : "T'inquiète, je sais que cet ID correspond à un Input"
const form = document.getElementById('form') as HTMLFormElement;
const input = document.getElementById('input') as HTMLInputElement;
const messages = document.getElementById('messages') as HTMLUListElement;
const scoreList = document.getElementById('score-list') as HTMLUListElement;
const btnTerminer = document.getElementById('btn-terminer') as HTMLButtonElement;

// ENVOI MESSAGE
// On ajoute une sécurité (?) optionnelle au cas où 'form' n'existe pas
form?.addEventListener('submit', (e: Event) => {
    e.preventDefault();
    if (input.value) {
        socket.emit('chat message', input.value);
        input.value = '';
    }
});

// RÉCEPTION MESSAGE
socket.on('chat message', (data: ChatMessage) => {
    const item = document.createElement('li');
    item.textContent = `${data.pseudo} : ${data.text}`;
    messages.appendChild(item);
    window.scrollTo(0, document.body.scrollHeight);
});

// MISE À JOUR DES SCORES
socket.on('maj_scores', (listeJoueurs: PlayersList) => {
    if (scoreList) {
        scoreList.innerHTML = ""; 
        
        for (let idSocket in listeJoueurs) {
            const info = listeJoueurs[idSocket];
            const li = document.createElement('li');
            li.textContent = `${info.pseudo} : ${info.count} msg`;
            scoreList.appendChild(li);
        }
    }
});

// BOUTON TERMINER
btnTerminer?.addEventListener('click', () => {
    if(confirm("Veux-tu vraiment sauvegarder ton score en BDD ?")) {
        socket.emit('sauvegarder_score');
    }
});

// CONFIRMATION SAUVEGARDE
socket.on('confirmation_save', (message: string) => {
    alert(message);
});