require('dotenv').config();
const pool = require('../db');

const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;
const USER_AGENT = 'Vinylmania/1.0';
const GENRES = ['Rock', 'Jazz', 'Hip Hop', 'Electronic', 'Soul', 'Classical'];
const PAGES_PER_GENRE = 5; 

async function fetchFromDiscogs(url) {
    const response = await fetch(url, {
        headers: {
            'Authorization': `Discogs token=${DISCOGS_TOKEN}`,
            'User-Agent': USER_AGENT
        }
    });
    if (!response.ok) return null;
    return response.json();
}

async function setupDatabase() {
    console.log('📦 Setting up MySQL database tables...');
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS vinyls (
            id INT AUTO_INCREMENT PRIMARY KEY,
            discogs_id VARCHAR(255) UNIQUE,
            title VARCHAR(255) NOT NULL,
            artist VARCHAR(255) NOT NULL,
            genre VARCHAR(100),
            year INT,
            price DECIMAL(10,2) NOT NULL,
            original_price DECIMAL(10,2),
            is_bestseller TINYINT(1) DEFAULT 0,
            image_url TEXT,
            description TEXT,
            tracklist JSON,
            stock INT DEFAULT 20,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY, 
            user_id INT, 
            customer_name VARCHAR(255), 
            customer_email VARCHAR(255), 
            total_price DECIMAL(10,2), 
            status ENUM('pending', 'completed', 'cancelled') DEFAULT 'pending', 
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
    `);
    await pool.query(`
        CREATE TABLE IF NOT EXISTS order_items (
            id INT AUTO_INCREMENT PRIMARY KEY, 
            order_id INT, 
            vinyl_id INT, 
            quantity INT, 
            unit_price DECIMAL(10,2)
        ) ENGINE=InnoDB;
    `);
}

async function main() {
    console.log('🚀 Starting MASSIVE MySQL database seeding...');
    
    try {
        await setupDatabase();
        let totalInserted = 0;

        for (const genre of GENRES) {
            console.log(`\n--- Seeding Genre: ${genre} ---`);
            
            for (let page = 1; page <= PAGES_PER_GENRE; page++) {
                console.log(`Fetching Page ${page}...`);
                const searchUrl = `https://api.discogs.com/database/search?type=release&format=vinyl&genre=${encodeURIComponent(genre)}&per_page=50&page=${page}`;
                const searchData = await fetchFromDiscogs(searchUrl);
                
                if (!searchData || !searchData.results) break;

                for (const item of searchData.results) {
                    try {
                        await new Promise(r => setTimeout(r, 1100)); // Rate limit

                        const title = item.title;
                        const artist = item.title.split(' - ')[0] || 'Various';
                        const year = item.year || 0;
                        const discogs_id = item.id.toString();
                        const image_url = item.cover_image;
                        const price = (Math.random() * 37 + 12).toFixed(2);
                        const description = `A premium ${genre} vinyl record.`;

                        // MySQL check
                        const [rows] = await pool.query('SELECT id FROM vinyls WHERE discogs_id = ?', [discogs_id]);
                        if (rows.length === 0) {
                            await pool.query(`
                                INSERT INTO vinyls (discogs_id, title, artist, genre, year, price, image_url, description)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            `, [discogs_id, title, artist, genre, year, price, image_url, description]);
                            console.log(`✓ [${totalInserted}] Inserted: ${title}`);
                            totalInserted++;
                        }
                    } catch (err) {
                        console.error(`❌ Skip item: ${err.message}`);
                    }
                }
            }
        }
        console.log(`\n✅ Seeding complete. ${totalInserted} records in MySQL database.`);
    } catch (error) {
        console.error('🛑 Seeding failed:', error);
    } finally {
        await pool.end();
    }
}

main();
