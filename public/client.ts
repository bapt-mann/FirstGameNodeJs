declare var io: any;
const socket = io();

let myUserId: number | null = null;
let currentTeam: number[] = [];

// Variable pour savoir quel étage on regarde (Caméra)
let viewingFloor = 0; 
let gameData: any = null; // Stockera les données reçues du serveur

//#region Éléments du DOM
const screens = {
    login: document.getElementById('screen-login')!,
    menu: document.getElementById('screen-menu')!,
    lobby: document.getElementById('screen-lobby')!,
    game: document.getElementById('game-ui')! // Écran de jeu
};

const inputs = {
    pseudo: document.getElementById('pseudo-input') as HTMLInputElement,
    code: document.getElementById('code-input') as HTMLInputElement
};

// Fonction pour changer d'écran
function showScreen(screenName: 'login' | 'menu' | 'lobby' | 'game') {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}
//#endregion

//#region  --- LOGIQUE LOGIN ---
document.getElementById('btn-login')?.addEventListener('click', () => {
    const pseudo = inputs.pseudo.value;
    if (pseudo) socket.emit('login', pseudo);
});

socket.on('login_success', (user: any) => {
    myUserId = user.id;
    document.getElementById('welcome-msg')!.textContent = `Bonjour ${user.pseudo}`;
    showScreen('menu');
});
//#endregion

//#region  --- LOGIQUE CRÉATION ---
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
//#endregion

//#region  --- LOGIQUE REJOINDRE ---
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
//#endregion

//#region  --- ÉVÉNEMENTS LOBBY ---
socket.on('player_arrived', (pseudo: string) => {
    addLog(`👋 ${pseudo} a rejoint la partie !`);
});
//#endregion

//#region  Gérer la reconnexion automatique
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
//#endregion

//#region  Helper pour afficher dans la liste
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
//#endregion


//#region  LEAVE ROOM LOGIC
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
//#endregion


//#region  READY BUTTON LOGIC
document.getElementById('btn-ready')?.addEventListener('click', () => {
    socket.emit('player_ready');
    // On grise le bouton
    const btn = document.getElementById('btn-ready') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = "En attente de l'adversaire...";
    btn.style.backgroundColor = "orange";
});

socket.on('opponent_ready', (pseudo: string) => {
    addLog(`⚡ ${pseudo} est prêt !`);
});

socket.on('game_start', (gameData: any) => {
    console.log("LA PARTIE COMMENCE !", gameData);

    // C'est ici qu'on change d'écran automatiquement
    showScreen('game');
    renderMap();
});
//#endregion

//#region  --- LOGIQUE DE JEU ---

socket.on('game_update', (game: any) => {
    gameData = game;
    // Par défaut, on regarde l'étage où se trouve notre première unité, ou l'étage 0
    renderMap();
});

function renderMap() {
    const board = document.getElementById('game-board')!;
    board.innerHTML = ''; // On efface tout (bourrin mais simple au début)

    // On récupère juste la grille de l'étage qu'on regarde
    const floorMap = gameData.map[viewingFloor];

    // Double boucle pour dessiner Y puis X
    for (let y = 0; y < 15; y++) {
        for (let x = 0; x < 10; x++) {
            
            // 1. Créer la case (Terrain)
            const cellData = floorMap[y][x];
            const cellDiv = document.createElement('div');
            cellDiv.className = 'cell';
            
            // Appliquer le style selon le type (mur, eau...)
            if (cellData.type === 'WALL') cellDiv.classList.add('wall');
            if (cellData.type === 'STAIRS_UP') cellDiv.classList.add('stairs-up');

            // Gestion du clic (Déplacement)
            cellDiv.addEventListener('click', () => onCellClick(x, y, viewingFloor));

            // 2. Vérifier s'il y a une unité ICI ET à cet ÉTAGE
            const unit = gameData.units.find((u: any) => 
                u.position.x === x && 
                u.position.y === y && 
                u.position.z === viewingFloor
            );

            if (unit) {
                const unitDiv = document.createElement('div');
                unitDiv.className = 'unit';
                // Si c'est mon unité ou celle de l'ennemi
                unitDiv.classList.add(unit.ownerId === myUserId ? 'me' : 'enemy');
                
                // (Optionnel) Ajouter une image
                // unitDiv.style.backgroundImage = `url(${unit.spriteUrl})`;
                
                cellDiv.appendChild(unitDiv);
            }

            board.appendChild(cellDiv);
        }
    }
    
    document.getElementById('current-floor-display')!.innerText = (viewingFloor + 1).toString();
}

// Boutons pour changer d'étage (Caméra)
document.getElementById('btn-floor-up')?.addEventListener('click', () => {
    if (viewingFloor < gameData.floors - 1) {
        viewingFloor++;
        renderMap();
    }
});

function onCellClick(x: number, y: number, viewingFloor: number): any {
    console.log("You clicked on cell (" + x + ", " + y + ") on floor " + viewingFloor);

}

//#endregion