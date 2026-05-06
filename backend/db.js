require('dotenv').config();
const mysql = require('mysql2/promise');
const path = require('path');

let pool;

if (process.env.DB_HOST) {
    console.log('🔗 Connecting to MySQL Database...');
    pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        charset: 'utf8mb4',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
} else {
    console.log('📂 Falling back to Local SQLite Database for development...');
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.resolve(__dirname, 'database.sqlite');
    const db = new sqlite3.Database(dbPath);
    
    pool = {
        query: (sql, params = []) => {
            let translatedSql = sql
                .replace(/INT AUTO_INCREMENT PRIMARY KEY/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT')
                .replace(/DATETIME DEFAULT CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
                .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/gi, 'DATETIME DEFAULT CURRENT_TIMESTAMP')
                .replace(/DECIMAL\(10,2\)/gi, 'REAL')
                .replace(/TINYINT\(1\)/gi, 'INTEGER')
                .replace(/ENUM\(.*?\)/gi, 'TEXT')
                .replace(/JSON/gi, 'TEXT')
                .replace(/ENGINE=InnoDB/gi, '');

            return new Promise((resolve, reject) => {
                db.all(translatedSql, params, (err, rows) => {
                    if (err) reject(err);
                    else resolve([rows]);
                });
            });
        },
        execute: (sql, params = []) => {
            return pool.query(sql, params);
        },
        getConnection: async () => {
            return {
                query: pool.query,
                beginTransaction: () => pool.query('BEGIN TRANSACTION'),
                commit: () => pool.query('COMMIT'),
                rollback: () => pool.query('ROLLBACK'),
                release: () => {}
            };
        },
        end: () => new Promise((resolve) => db.close(resolve))
    };
}

module.exports = pool;
