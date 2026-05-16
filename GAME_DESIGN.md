# Game Design Document
> Tactical RPG multijoueur en navigateur — Document de conception

---

## Concept général

Jeu tactique au tour par tour en 1v1. Chaque joueur contrôle une armée sur une grille.
La profondeur stratégique repose sur **l'information cachée**, **les interactions entre unités** et **plusieurs chemins vers la victoire**.

Inspirations : Yu-Gi-Oh (interactions en chaîne, synergies), Inscryption (ressources, émergence), Fire Emblem (grille tactique).

---

## La Map

### Génération
- Générée **aléatoirement** à chaque partie
- **Symétrique** : le camp J1 est le miroir exact du camp J2
  - Garantit l'équité — personne ne peut perdre à cause de la map
  - Conserve la variété et la rejouabilité
- Terrain varié : herbe, murs, eau, cases bonus...

### Structure
- Divisée en **3 zones** :
  - **Camp J1** (moitié gauche/bas)
  - **Zone neutre** (centre)
  - **Camp J2** (moitié droite/haut)
- Un seul étage pour commencer *(les étages multi-niveaux sont une feature future)*

### Vision (Brouillard de guerre partiel)
- Le **terrain** est toujours entièrement visible (les deux joueurs voient la map)
- Les **unités ennemies** ne sont visibles que dans le rayon de vision de tes propres unités
- Chaque unité a une **portée de vision** en cases (à définir par unité)
- Modèle Advance Wars : tu peux réagir à ce que tu découvres pendant ton propre tour

> Le brouillard total (camp adverse invisible) a été écarté — en tour par tour il crée trop de frustration car on ne peut pas réagir en temps réel à ce qu'on découvre.

---

## Séquence de début de partie

```
1. Map générée et affichée aux deux joueurs
2. Les deux joueurs choisissent leur composition (unités) en voyant la map
   → Certaines unités sont meilleures sur map ouverte, d'autres en couloir
3. Phase de placement des unités dans son camp
4. La partie commence
```

> Le choix de compo **après** la map révélée est une couche stratégique à part entière.

---

## Conditions de victoire

Trois chemins vers la victoire. Les trois forcent la présence en zone neutre — impossible de gagner en restant dans son camp.

### 1. Régicide
- Tuer le **Roi adverse**
- Condition directe et constante — chaque partie est aussi une menace latente sur ton roi
- Nécessite de traverser la zone neutre et de pénétrer dans le camp adverse

### 2. Contrôle territorial
- Contrôler **X points de contrôle** répartis équitablement sur les **3 zones** de la map pendant **Y tours**
- Les points sont capturés en positionnant une unité dessus, perdus dès qu'une unité ennemie s'en empare
- Y tours **consécutifs** — un point repris par l'ennemi remet le compteur à zéro

> Forcer le joueur à être présent dans les 3 zones simultanément — impossible de juste défendre son camp.

### 3. Course aux ressources
- Toutes les **Z tours**, des ressources apparaissent à des **emplacements prédéfinis** en zone neutre
- Accumuler **N ressources** fait gagner la partie
- Les emplacements sont connus des deux joueurs → crée des confrontations prévisibles mais tendues
- Un joueur qui rush les ressources sacrifie sa position défensive

> Le rythme des spawns (tour 6, 12, 18...) crée une **mécanique de timing** — les deux joueurs savent quand la prochaine ressource apparaît et planifient en conséquence.

---

### Pourquoi ces 3 conditions fonctionnent ensemble

Les trois conditions se **contredisent stratégiquement** :

| Stratégie | Implique | Sacrifice |
|---|---|---|
| Rush le roi adverse | Concentrer les unités en attaque | Défense de son propre roi |
| Contrôle territorial | Disperser les unités sur toute la map | Puissance offensive concentrée |
| Course aux ressources | Rush la zone neutre aux bons moments | Positionnement défensif |

L'adversaire ne peut pas contrer les trois à la fois — c'est là que se crée la profondeur stratégique.

---

## Ressources

- Apparaissent toutes les **Z tours** à des emplacements **prédéfinis** en zone neutre
- Les deux joueurs voient les emplacements → les confrontations autour des spawns sont anticipées
- Une unité sur la case de spawn au bon moment collecte la ressource
- Accumuler **N ressources** = victoire (win condition 3)

*Valeurs Z et N à calibrer pendant le proto papier.*

---

## Système de tour

### Structure d'un tour
Chaque unité dispose de **2 Points d'Action (PA)** par tour.

| Action | Coût |
|---|---|
| Se déplacer | 1 PA |
| Attaque basique | 1 PA |
| Capacité normale | 1 PA |
| Capacité puissante | 2 PA |
| Attendre (skip l'unité) | 0 PA |

Le joueur joue toutes ses unités dans l'ordre qu'il souhaite, puis clique **"Fin de tour"**.

### L'Élan (resource partagée par tour)
- Chaque joueur commence son tour avec **X Élan** (valeur à calibrer)
- L'Élan est un pool **partagé entre toutes ses unités**
- Certaines capacités coûtent de l'Élan en plus des PA
- On peut **générer de l'Élan** via certaines actions ou unités passives

Exemples :
- Tuer une unité ennemie → +1 Élan
- Unité passive "Catalyseur" → +1 Élan au début de chaque tour
- Capacité dévastatrice → coûte 3 Élan

> L'Élan crée la tension Inscryption/YGO : *"Est-ce que j'économise mon Élan pour une grosse capacité, ou je l'utilise maintenant ?"*

---

## Stats des unités

Les unités n'ont **pas** de stat d'attaque de base. Tout le combat passe par les capacités — chaque unité a une identité propre définie par ses capacités, pas par une valeur numérique générique.

```
Unit {
  hp        : points de vie actuels
  maxHp     : points de vie maximum
  moveRange : nombre de cases déplaçables par tour
}
```

> Une unité sans capacité offensive ne peut pas attaquer. Chaque unité doit avoir au moins une capacité.

---

## Système de capacités

### Principe
Toutes les interactions de combat passent par les capacités. Une capacité est définie par :

```
Capacity {
  cost_pa    : coût en PA
  cost_elan  : coût en Élan (peut être 0)
  trigger    : quand elle s'active (ON_USE, ON_MOVE, ON_DEATH, ON_ENEMY_ENTER, ON_ALLY_DEATH...)
  effect     : ce qu'elle fait (DAMAGE, HEAL, PUSH, TELEPORT, SUMMON...)
  damage     : dégâts infligés (si effect = DAMAGE)
  range      : portée en cases
  target     : SELF, ALLY, ENEMY, ZONE
}
```

### Types de triggers
- **Actifs** : déclenchés volontairement pendant ton tour (coûtent des PA)
- **Passifs** : déclenchés automatiquement par une condition, pendant n'importe quel tour
- **Réactifs** : se déclenchent en réponse à une action ennemie → crée les "chaînes" à la YGO

### Exemple de synergies visées
- Unité A meurt → Unité B gagne un bonus temporaire (passif ON_ALLY_DEATH)
- Ennemi entre dans une case adjacente → Unité C contre-attaque (réactif ON_ENEMY_ENTER)
- Unité D se déplace → laisse une zone de dégâts derrière elle (passif ON_MOVE)

### Hors scope proto
> ❌ **Buffs / états / debuffs** : non implémentés dans le prototype.
> Le moteur sera structuré pour les accueillir plus tard (stats base vs stats effectives) sans refactoring.

---

## Le Roi

Unité spéciale, une seule par joueur.

- Peut **capturer des points d'intérêt** (action dédiée sur les bonnes cases)
- Sa mort = défaite immédiate (win condition 3)
- Stats solides mais pas invincible — il doit bouger, donc il est exposé
- *Stats et capacités spéciales à définir*

---

## Unités (base à définir)

*À concevoir pendant le proto papier. Objectif : 4 à 6 unités de base avec des rôles distincts.*

Rôles envisagés :
- **Tank** : encaisse pour les alliés
- **DPS** : fort en attaque, fragile
- **Support** : soins / buffs alliés
- **Contrôle** : déplace / bloque les ennemis
- **Scout** : grande vision, mobile
- **Catalyseur** : génère de l'Élan

---

## Prochaines étapes

### Priorité 1 — Proto papier
- [ ] Définir 4 unités de base avec leurs stats et 1 capacité chacune
- [ ] Définir le montant d'Élan de départ et comment il se recharge
- [ ] Valider le flow d'une partie complète sur une grille 6x6 papier
- [ ] Équilibrer les 3 win conditions (laquelle est trop rapide ?)

### Priorité 2 — Moteur (code)
- [ ] Système de tour par tour (PA, fin de tour, enforcement)
- [ ] Moteur de capacités (interface `Capacity`, triggers)
- [ ] Combat (calcul dégâts, mort d'unité)
- [ ] Brouillard de guerre (vision limitée par joueur)
- [ ] Génération de map symétrique
- [ ] Ressources sur la map
- [ ] Win conditions

---

## Questions ouvertes

- Combien de points de contrôle X ? Combien de tours consécutifs Y ?
- Valeurs à calibrer sur papier : X (points à contrôler), Y (tours), Z (fréquence spawn ressource), N (ressources pour gagner)
- Est-ce que l'Élan se **reporte** d'un tour à l'autre ou est-il réinitialisé ?
- Est-ce que le Roi a une capacité unique spéciale ?
- Portée de vision par unité : fixe ou variable selon le type d'unité ?
- Que se passe-t-il si deux unités ennemies arrivent sur une ressource le même tour ?
