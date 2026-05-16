import 'dotenv/config';
import mysql from 'mysql2';

const db = mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'flash_game',
    multipleStatements: true // Nécessaire pour les migrations
});

db.connect(err => {
    if (err) console.error('❌ Erreur BDD :', err);
    else console.log('✅ Connecté à MySQL !');
});

export default db;
