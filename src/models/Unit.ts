// src/models/Unit.ts
import { Position } from "./Types"

export class Unit {
  id: string;        // Unique ID de l'unité
  name: string;      // "Marth", "Ike"...
  ownerId: string;   // À quel joueur (socket.id) appartient ce pion
  position: Position;
  
  // Stats Fire Emblem basiques
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  moveRange: number;
  range: number;
  
  hasMoved: boolean; // Pour savoir s'il a déjà joué ce tour

  constructor(id: string, name: string, ownerId: string, x: number, y: number, z: number) {
    this.id = id;
    this.name = name;
    this.ownerId = ownerId;
    this.position = { x, y, z };
    this.hp = 20;
    this.maxHp = 20;
    this.atk = 8;
    this.def = 3;
    this.moveRange = 4;
    this.range = 1;
    this.hasMoved = false;
  }
}