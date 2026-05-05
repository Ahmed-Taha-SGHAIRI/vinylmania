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
    const artistName = process.argv[2];
    if (!artistName) {
        console.error('❌ Please provide an artist name. Example: node scripts/fetch_by_artist.js "Pink Floyd"');
        process.exit(1);
    }

    console.log(`🔍 Searching Discogs for vinyls by: ${artistName}...`);
    
    try {
        const url = `https://api.discogs.com/database/search?artist=${encodeURIComponent(artistName)}&type=release&format=vinyl&per_page=50`;
        const data = await fetchFromDiscogs(url);
        
        if (!data || !data.results || data.results.length === 0) {
            console.log('⚠️ No results found for this artist.');
            return;
        }

        console.log(`✅ Found ${data.results.length} releases. Starting import...`);
        let inserted = 0;

        for (const item of data.results) {
            try {
                // Clean up title (Discogs often adds translations or extra info after '=')
                let title = item.title.split(' = ')[0].trim();
                const artist = title.split(' - ')[0] || artistName;
                const albumTitle = title.split(' - ')[1] || title;
                
                const year = item.year || 0;
                const discogs_id = item.id.toString();
                const image_url = item.cover_image;
                const price = (Math.random() * 30 + 20).toFixed(2);
                const description = `A premium vinyl release by ${artist}.`;

                // Check for duplicate by Title AND Artist (not just ID)
                const [exists] = await pool.query('SELECT id FROM vinyls WHERE title = ? AND artist = ?', [title, artist]);
                
                if (exists.length === 0) {
                    await pool.query(`
                        INSERT INTO vinyls (discogs_id, title, artist, genre, year, price, image_url, description)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [discogs_id, title, artist, item.genre?.[0] || 'Unknown', year, price, image_url, description]);
                    console.log(`✓ [${inserted + 1}] Imported: ${title}`);
                    inserted++;
                } else {
                    console.log(`⏩ Skipping duplicate album: ${title}`);
                }

                await new Promise(r => setTimeout(r, 1100)); // Respect Rate Limit
            } catch (err) {
                console.error(`❌ Error importing item: ${err.message}`);
            }
        }

        console.log(`\n🎉 Success! Imported ${inserted} new records for ${artistName}.`);
    } catch (error) {
        console.error('🛑 Fetch failed:', error);
    } finally {
        await pool.end();
    }
}

main();
