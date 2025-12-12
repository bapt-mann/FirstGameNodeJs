import db from "../config/db"; // On enlève le .js
import { QueryError, ResultSetHeader } from "mysql2";

// On définit le type de la fonction "callback"
// QueryError : Le type d'erreur spécifique à MySQL
// ResultSetHeader : Le type de résultat pour un INSERT (contient insertId, affectedRows...)
type ScoreCallback = (err: QueryError | null, result: ResultSetHeader) => void;

export function saveScore(pseudo: string, count: number, callback: ScoreCallback) {
  const sql = "INSERT INTO scores (pseudo, score) VALUES (?, ?)";
  db.query(sql, [pseudo, count], callback);
}