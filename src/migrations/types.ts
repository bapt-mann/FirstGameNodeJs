import { Connection } from 'mysql2';

export interface Migration {
    id: string;       // ex: "001"
    name: string;     // ex: "add_password_hash"
    up: (db: Connection) => Promise<void>;
}
