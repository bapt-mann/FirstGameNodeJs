import db from "../config/db"; // On enlève le .js
import { QueryError, ResultSetHeader } from "mysql2";
import { Debug } from "../models/Debug";

// On définit le type de la fonction "callback"
// QueryError : Le type d'erreur spécifique à MySQL
// ResultSetHeader : Le type de résultat pour un INSERT (contient insertId, affectedRows...)
type ScoreCallback = (err: QueryError | null, result: ResultSetHeader) => void;

export function saveScore(pseudo: string, count: number, callback: ScoreCallback) {
  let message:string = "Sauvegarde du score de " + pseudo + " : " + count;
  Debug.log("scoreService.ts", message, 1);
  const sql = "INSERT INTO scores (pseudo, score) VALUES (?, ?)";
  db.query(sql, [pseudo, count], callback);
}