import { Migration } from './types';

export const migration: Migration = {
    id: '001',
    name: 'add_password_hash',
    up: async (db) => {
        // Ajoute la colonne password_hash à la table users
        // NULL pour compatibilité avec les comptes existants (ils devront juste se reconnecter)
        await db.promise().query(`
            ALTER TABLE users
            ADD COLUMN password_hash VARCHAR(255) NULL AFTER username
        `);
    }
};
