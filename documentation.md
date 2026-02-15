
# 📘 Documentation Rapide : Projet Jeu Node.js/TS

Ce projet est un jeu multijoueur temps réel utilisant **Node.js**, **Socket.io** et **TypeScript**.

## 🚀 1. Les Commandes Vitales

C'est le plus important pour reprendre le projet. Ouvre ton terminal à la racine du projet.

### **Pour lancer le serveur**

```bash
npm start

```

* Lance le serveur web sur `http://localhost:3000`.
* *Note : Assure-toi que WAMP/XAMPP est lancé pour la base de données MySQL.*

### **Pour compiler le code (TypeScript -> JavaScript)**

```bash
npx tsc

```

* Transforme tes fichiers `.ts` (dossier `src`) en fichiers `.js` (dossier `dist`).
* **À faire obligatoirement** après chaque modification d'un fichier `.ts`.

### **Pour compiler automatiquement (Mode Dév)**

```bash
npx tsc -w

```

* Garde cette commande ouverte dans un terminal séparé. Elle recompilera toute seule dès que tu sauvegardes un fichier.

---

## 📂 2. Architecture des Dossiers

Voici où se trouvent les choses importantes.

```text
MonProjet/
├── dist/                ⛔ NE PAS TOUCHER
│   └── ...              (C'est le code compilé généré par TypeScript)
│
├── public/              🎨 FICHIERS STATIQUES
│   ├── index.html       (Ton interface HTML)
│   ├── style.css        (Ton design)
│   └── assets/          (Images, sprites...)
│
├── src/                 🛠️ TON CODE SOURCE (TypeScript)
│   ├── server.ts        (Le cerveau du serveur, configure Express et Socket.io)
│   ├── network/         (Gestion des événements socket côté serveur)
│   ├── models/          (Classes du jeu : Game, Map, Player...)
│   │
│   └── public/          🎮 CODE CLIENT (Navigateur)
│       └── client.ts    (Logique du jeu côté joueur : clics, affichage, envois socket)
│
├── tsconfig.json        (Configuration du compilateur TypeScript)
└── package.json         (Liste des dépendances et scripts)

```

---

## ⚠️ 3. Règles d'Or & Pièges à éviter

### **Le Client (`client.ts`)**

* **Pas d'imports/exports :** Le navigateur ne gère pas les modules Node.js par défaut.
* ❌ `import { Tile } from '../models/Map'`
* ❌ `export interface Tile...`
* ✅ Copie les interfaces nécessaires directement dans `client.ts` ou utilise un fichier de définitions `.d.ts`.



### **Le Serveur (`server.ts`)**

* Il sert les fichiers statiques depuis **deux endroits** :
1. `dist/public` (pour récupérer le `client.js` compilé).
2. `public` (pour récupérer `index.html` et `style.css`).



### **Le HTML (`index.html`)**

* Il doit appeler le fichier JS final, pas le TS :
```html
<script type="module" src="client.js"></script>

```



---

## 🔄 4. Workflow de travail

1. Je modifie mon code dans **`src/`**.
2. Je vérifie que la compilation s'est bien passée (`npx tsc` ou le terminal *watch*).
3. Si j'ai touché au serveur (`server.ts`, `models...`), je redémarre le serveur (`Ctrl+C` puis `npm start`).
4. Si j'ai touché au client (`client.ts`) ou HTML/CSS, je rafraîchis juste la page Web (F5).

---