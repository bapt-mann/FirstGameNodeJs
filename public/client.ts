declare var io: any;
const socket = io();

let currentTeam: number[] = [];

// Éléments du DOM
const screens = {
    login: document.getElementById('screen-login')!,
    menu: document.getElementById('screen-menu')!,
    lobby: document.getElementById('screen-lobby')!
};

const inputs = {
    pseudo: document.getElementById('pseudo-input') as HTMLInputElement,
    code: document.getElementById('code-input') as HTMLInputElement
};

// Fonction pour changer d'écran
function showScreen(screenName: 'login' | 'menu' | 'lobby') {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

// --- LOGIQUE LOGIN ---
document.getElementById('btn-login')?.addEventListener('click', () => {
    const pseudo = inputs.pseudo.value;
    if (pseudo) socket.emit('login', pseudo);
});

socket.on('login_success', (user: any) => {
    document.getElementById('welcome-msg')!.textContent = `Bonjour ${user.pseudo}`;
    showScreen('menu');
});

// --- LOGIQUE CRÉATION ---
document.getElementById('btn-create')?.addEventListener('click', () => {
    socket.emit('create_room');
});

socket.on('room_created', (code: string) => {
    document.getElementById('display-code')!.textContent = code;
    showScreen('lobby');
    // On s'ajoute nous-même à la liste visuelle
    addLog(`Vous avez créé la room ${code}`);
    socket.emit('get_characters');
});

// --- LOGIQUE REJOINDRE ---
document.getElementById('btn-join')?.addEventListener('click', () => {
    const code = inputs.code.value.toUpperCase();
    if (code) socket.emit('join_room', code);
});

socket.on('room_joined', (code: string) => {
    document.getElementById('display-code')!.textContent = code;
    showScreen('lobby');
    addLog(`Vous avez rejoint la room ${code}`);
    socket.emit('get_characters');
});

// --- ÉVÉNEMENTS LOBBY ---
socket.on('player_arrived', (pseudo: string) => {
    addLog(`👋 ${pseudo} a rejoint la partie !`);
});

// Gérer la reconnexion automatique
socket.on('reconnect_room', (data: any) => {
    console.log("Reconnexion à la room " + data.code);
    
    // 1. Mettre à jour l'affichage du code
    document.getElementById('display-code')!.textContent = data.code;
    
    // 2. Afficher le bon écran
    showScreen('lobby');
    
    // 3. Demander l'état actuel (les persos, etc.)
    socket.emit('get_characters');
    // Ici, plus tard, on demandera aussi "get_game_state" si la partie a commencé
});

socket.on('error_msg', (msg: string) => {
    alert("Erreur : " + msg);
});

// Helper pour afficher dans la liste
function addLog(text: string) {
    const li = document.createElement('li');
    li.textContent = text;
    document.getElementById('players-list')?.appendChild(li);
}

socket.on('list_characters', (chars: any[]) => {
    const container = document.getElementById('characters-container')!;
    container.innerHTML = ""; // On vide

    chars.forEach(c => {
        const div = document.createElement('div');
        div.className = 'char-card';
        div.dataset.id = c.id; // On stocke l'ID dans le HTML
        div.innerHTML = `
            <strong>${c.name}</strong><br>
            <small>PV: ${c.base_hp} / ATK: ${c.base_atk}</small>
        `;
        
        // Clic sur la carte
        div.addEventListener('click', () => {
            socket.emit('toggle_char', c.id);
        });

        container.appendChild(div);
    });
});

socket.on('team_update', (teamIds: number[]) => {
    currentTeam = teamIds;
    
    // On met à jour les bordures
    document.querySelectorAll('.char-card').forEach((div: any) => {
        const id = parseInt(div.dataset.id);
        if (teamIds.includes(id)) {
            div.classList.add('selected');
        } else {
            div.classList.remove('selected');
        }
    });

    // Gestion du bouton PRÊT
    const btnReady = document.getElementById('btn-ready') as HTMLButtonElement;
    if (teamIds.length === 3) {
        btnReady.disabled = false;
        btnReady.textContent = "JE SUIS PRÊT !";
        btnReady.style.backgroundColor = "#4CAF50";
        btnReady.style.color = "white";
    } else {
        btnReady.disabled = true;
        btnReady.textContent = `Choisis encore ${3 - teamIds.length} persos`;
        btnReady.style.backgroundColor = "";
    }
});


// LEAVE ROOM LOGIC
document.getElementById('btn-leave')?.addEventListener('click', () => {
    if (confirm("Voulez-vous vraiment quitter ?")) {
        socket.emit('leave_room');
    }
});

socket.on('left_success', () => {
    // On nettoie l'interface
    document.getElementById('players-list')!.innerHTML = "";
    document.getElementById('characters-container')!.innerHTML = "";
    // Retour au menu
    showScreen('menu');
});

socket.on('player_left', (pseudo: string) => {
    addLog(`👋 ${pseudo} est parti.`);
    // recharger la liste des joueurs ici si tu veux
});

socket.on('room_closed', (reason: string) => {
    alert(reason);
    showScreen('menu');
});