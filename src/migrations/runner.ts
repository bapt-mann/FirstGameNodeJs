import db from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { migration as m001 } from './001_add_password_hash';
// 👇 Ajoute ici les prochaines migrations dans l'ordre
// import { migration as m002 } from './002_xxx';

import { Migration } from './types';

// ============================================================
// REGISTRE DES MIGRATIONS — ajouter les nouvelles ici en bas
// ============================================================
const ALL_MIGRATIONS: Migration[] = [
    m001,
    // m002,
];

export async function runMigrations(): Promise<void> {
    console.log('🔄 Vérification des migrations...');

    // 1. Créer la table de tracking si elle n'existe pas
    await db.promise().query(`
        CREATE TABLE IF NOT EXISTS migrations (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            migration_id VARCHAR(10)  NOT NULL UNIQUE,
            name        VARCHAR(255) NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. Récupérer les migrations déjà exécutées
    const [executed] = await db.promise().query<RowDataPacket[]>(
        'SELECT migration_id FROM migrations'
    );
    const executedIds = new Set(executed.map(r => r.migration_id));

    // 3. Exécuter les migrations en attente dans l'ordre
    let count = 0;
    for (const migration of ALL_MIGRATIONS) {
        if (executedIds.has(migration.id)) {
            continue; // Déjà fait, on skip
        }

        try {
            console.log(`  ▶ Migration ${migration.id} — ${migration.name}...`);
            await migration.up(db);

            // Marquer comme exécutée
            await db.promise().query<ResultSetHeader>(
                'INSERT INTO migrations (migration_id, name) VALUES (?, ?)',
                [migration.id, migration.name]
            );

            console.log(`  ✅ Migration ${migration.id} OK`);
            count++;
        } catch (err: any) {
            // Si la colonne existe déjà (migration appliquée manuellement), on l'enregistre quand même
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.warn(`  ⚠️  Migration ${migration.id} : colonne déjà présente, marquée comme exécutée.`);
                await db.promise().query(
                    'INSERT IGNORE INTO migrations (migration_id, name) VALUES (?, ?)',
                    [migration.id, migration.name]
                );
            } else {
                console.error(`  ❌ Échec migration ${migration.id} :`, err.message);
                throw err; // On arrête tout si une migration critique échoue
            }
        }
    }

    if (count === 0) {
        console.log('  ✓ Tout est à jour.');
    } else {
        console.log(`  🎉 ${count} migration(s) appliquée(s).`);
    }
}
