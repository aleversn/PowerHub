import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { schema } from './schema.js';

let connection = null;
let db = null;

// 打开（或创建）SQLite 数据库并返回 drizzle 实例。重复调用返回同一实例。
export function initDatabase({ file, migrationsFolder }) {
    if (db) return db;

    connection = new Database(file);

    // WAL 提供更好的并发与崩溃安全性；foreign_keys 让级联删除生效。
    connection.pragma('journal_mode = WAL');
    connection.pragma('foreign_keys = ON');
    connection.pragma('busy_timeout = 5000');

    db = drizzle(connection, { schema });

    migrate(db, { migrationsFolder });

    return db;
}

export function getDatabase() {
    if (!db) throw new Error('Database has not been initialized yet.');
    return db;
}

export function getConnection() {
    if (!connection) throw new Error('Database has not been initialized yet.');
    return connection;
}

export function closeDatabase() {
    if (connection) {
        connection.close();
        connection = null;
        db = null;
    }
}

export { schema };