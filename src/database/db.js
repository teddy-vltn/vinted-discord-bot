// database/db.js
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import Logger from '../utils/logger.js';

// Immediately invoked function to ensure the database is opened at the start
export const db = (async () => {
    const database = await open({
        filename: './user_data.db',
        driver: sqlite3.Database
    });

    Logger.debug('Database opened');

    await database.run(`CREATE TABLE IF NOT EXISTS user_urls (
        chat_id INTEGER PRIMARY KEY,
        url TEXT
    )`);

    Logger.debug('User URLs table created');

    return database;
})();
