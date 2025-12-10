import db from "../config/db.js";

export function saveScore(pseudo, count, callback) {
  const sql = "INSERT INTO stats_messages (pseudo, nb_messages) VALUES (?, ?)";
  db.query(sql, [pseudo, count], callback);
}

