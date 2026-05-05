require('dotenv').config();
const pool = require('../db');

const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;
const USER_AGENT = 'Vinylmania/1.0';

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

async function main() {
    console.log('🌟 Fetching 100 Years of MySQL Bestsellers...');
    
    // Auto-Migration: Ensure columns exist
    try {
        await pool.query('ALTER TABLE vinyls ADD COLUMN original_price DECIMAL(10,2)');
        await pool.query('ALTER TABLE vinyls ADD COLUMN is_bestseller TINYINT(1) DEFAULT 0');
        console.log('📦 Database migrated successfully.');
    } catch (e) {
        // Ignore if exists
    }

    let inserted = 0;

    for (let year = 1924; year <= 2024; year++) {
        try {
            console.log(`Processing Year: ${year}...`);
            const url = `https://api.discogs.com/database/search?year=${year}&format=vinyl&type=release&sort=want&sort_order=desc&per_page=1&page=1`;
            
            const data = await fetchFromDiscogs(url);
            if (!data || !data.results || data.results.length === 0) continue;

            const item = data.results[0];
            const originalPrice = (Math.random() * 40 + 25).toFixed(2);
            const discountedPrice = (originalPrice * 0.7).toFixed(2); 

            const [exists] = await pool.query('SELECT id FROM vinyls WHERE discogs_id = ?', [item.id.toString()]);
            
            if (exists.length > 0) {
                await pool.query(`
                    UPDATE vinyls 
                    SET is_bestseller = 1, original_price = ?, price = ?
                    WHERE discogs_id = ?
                `, [originalPrice, discountedPrice, item.id.toString()]);
                console.log(`✨ Updated existing bestseller for ${year}: ${item.title}`);
            } else {
                await pool.query(`
                    INSERT INTO vinyls (discogs_id, title, artist, genre, year, original_price, price, is_bestseller, image_url, description)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                `, [
                    item.id.toString(), 
                    item.title, 
                    item.title.split(' - ')[0] || 'Unknown', 
                    item.genre?.[0] || 'Classic', 
                    year, 
                    originalPrice, 
                    discountedPrice, 
                    item.cover_image,
                    `Iconic Bestseller from ${year}. One of the most wanted records in history.`
                ]);
                console.log(`✅ Inserted NEW bestseller for ${year}: ${item.title}`);
            }

            inserted++;
            await new Promise(r => setTimeout(r, 1100)); 
        } catch (err) {
            console.error(`Error for ${year}:`, err.message);
        }
    }

    console.log(`\n🎉 Century Collection Complete! ${inserted} bestsellers ready.`);
    await pool.end();
}

main();
