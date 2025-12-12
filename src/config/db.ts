import mysql from 'mysql2';

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'flash_game'
});

db.connect(err => {
  if (err) console.error('Erreur BDD :', err);
  else console.log('Connecté à MySQL !');
});

export default db;
