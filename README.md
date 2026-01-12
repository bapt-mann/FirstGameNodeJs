# Tactical Battle Online (FirstGameNodeJs)

![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socket.io&logoColor=white)
![Status](https://img.shields.io/badge/Status-Prototype-orange?style=for-the-badge)

> Un jeu de stratégie au tour par tour multijoueur, développé en Node.js et jouable directement dans le navigateur.

## Concept du Jeu

Ce projet est un **Tactical RPG (T-RPG)** fortement inspiré des mécaniques classiques de la série **Fire Emblem**, mais transposé dans une arène multijoueur compétitive.

Le but est simple : **affronter un autre joueur en temps réel (1v1)** et éliminer ses unités grâce à une stratégie supérieure.

### Les Mécaniques Clés

* **Affrontement 1 contre 1 :** Deux joueurs se connectent au serveur et s'affrontent sur une carte quadrillée (la "Grid").
* **Système au Tour par Tour :** Comme aux échecs ou dans Fire Emblem, chaque joueur déplace ses unités et attaque durant sa phase, puis cède la main à l'adversaire.
* **Gestion des Unités :** Le joueur contrôle une escouade. Chaque unité possède ses propres statistiques (Points de Vie, Attaque, Portée de déplacement).
* **La Stratégie avant tout :**
    * **Positionnement :** Utiliser le terrain et la portée des unités pour piéger l'adversaire.
    * **Triangle des armes (Concept) :** Le jeu repose sur l'équilibre des forces (ex: Épée bat Hache, Hache bat Lance, etc.) pour déterminer l'issue des combats.

## Architecture Technique

Ce projet a été réalisé pour explorer le développement de jeux multijoueurs web.

* **Backend :** Node.js gère la logique du jeu et l'état de la partie pour éviter la triche.
* **Communication :** Utilisation de **WebSockets** (via Socket.io probablement) pour assurer la fluidité des tours et la synchronisation instantanée entre les deux joueurs.
* **Frontend :** Interface web légère pour le rendu de la grille et des unités.

## État du projet

Ce dépôt correspond à une première itération ("FirstGame"). Il s'agit d'un prototype fonctionnel mettant en œuvre les bases du moteur de jeu et de la communication réseau.

---
*Développé par [Baptiste Boin](https://www.baptiste-boin.fr)*
