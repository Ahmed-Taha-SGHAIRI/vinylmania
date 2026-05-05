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
    console.log('🎵 Starting MySQL Tracklist Enrichment Process...');
    
    // Ensure tracklist column exists (redundant if schema.sql was run)
    try {
        await pool.query('ALTER TABLE vinyls ADD COLUMN tracklist JSON');
        console.log('📦 Database migrated (tracklist column added).');
    } catch (e) {
        // Ignore if already exists
    }
    
    try {
        const [rows] = await pool.query('SELECT id, discogs_id, title FROM vinyls WHERE tracklist IS NULL ORDER BY is_bestseller DESC LIMIT 100');
        console.log(`Found ${rows.length} records needing tracklists.`);

        for (const record of rows) {
            try {
                console.log(`Fetching tracks for: ${record.title} (${record.discogs_id})...`);
                const data = await fetchFromDiscogs(`https://api.discogs.com/releases/${record.discogs_id}`);
                
                if (data && data.tracklist) {
                    const tracks = data.tracklist.map(t => ({
                        position: t.position || '',
                        title: t.title,
                        duration: t.duration || ''
                    }));
                    await pool.query('UPDATE vinyls SET tracklist = ? WHERE id = ?', [JSON.stringify(tracks), record.id]);
                    console.log(`✅ Success! Found ${tracks.length} tracks.`);
                } else {
                    console.log('⚠️ No tracklist found for this release.');
                    await pool.query('UPDATE vinyls SET tracklist = "[]" WHERE id = ?', [record.id]);
                }

                await new Promise(r => setTimeout(r, 1100)); // Rate limit
            } catch (err) {
                console.error(`❌ Error for ${record.title}:`, err.message);
            }
        }
    } catch (error) {
        console.error('🛑 Enrichment failed:', error);
    } finally {
        console.log('\n✨ Batch complete.');
        await pool.end();
    }
}

main();
