require('dotenv').config();
const pool = require('../db');

const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;
const USER_AGENT = 'Vinylmania/1.0';

const ARTISTS = [
    "The Beatles", "Bob Dylan", "Elvis Presley", "Rolling Stones", "Chuck Berry",
    "Jimi Hendrix", "James Brown", "Little Richard", "Aretha Franklin", "Ray Charles",
    "Stevie Wonder", "Prince", "Michael Jackson", "Muddy Waters", "Marvin Gaye",
    "Led Zeppelin", "The Beach Boys", "Buddy Holly", "Neil Young", "Johnny Cash",
    "David Bowie", "The Who", "Pink Floyd", "Queen", "Metallica", "Bob Marley",
    "Robert Johnson", "Miles Davis", "John Coltrane", "Madonna", "Beyoncé",
    "Taylor Swift", "Eminem", "Jay-Z", "Kendrick Lamar", "Bruce Springsteen",
    "U2", "Public Enemy", "Nirvana", "Joni Mitchell", "Radiohead", "Run-DMC",
    "Frank Zappa", "Otis Redding", "Tina Turner", "Sam Cooke", "Duke Ellington",
    "Dr. Dre", "The Clash", "Sex Pistols"
];

function cleanTitle(fullTitle) {
    // 1. Remove artist name if it's "Artist - Title" format
    let title = fullTitle.includes(' - ') ? fullTitle.split(' - ')[1] : fullTitle;
    
    // 2. Remove anything in parentheses or brackets
    title = title.replace(/\s*[\(\[].*?[\)\]]\s*/g, ' ');
    
    // 3. Remove common "noise" suffixes (Deluxe, Remastered, etc.)
    const noiseRegex = /\s*(?:deluxe|premium|expanded|remastered|special|anniversary|limited|edition|box set|vinyl|mono|stereo|reissue|re-issue|digitally|mastered|original).*$/i;
    title = title.replace(noiseRegex, '');
    
    // 4. Final cleaning
    return title.trim().toLowerCase();
}

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
    console.log(`🚀 Starting MASSIVE INFLUENTIAL COLLECTION FETCH (50 Artists)...`);
    let totalInserted = 0;

    for (const artistName of ARTISTS) {
        console.log(`\n🌟 Processing: ${artistName}...`);
        
        try {
            const url = `https://api.discogs.com/database/search?artist=${encodeURIComponent(artistName)}&type=release&format=vinyl&per_page=50`;
            const data = await fetchFromDiscogs(url);
            
            if (!data || !data.results) continue;

            for (const item of data.results) {
                try {
                    const originalTitle = item.title;
                    const cleaned = cleanTitle(originalTitle);
                    
                    // Check if this cleaned title already exists for this artist
                    // We search using LIKE to catch partial matches or variants
                    const [existing] = await pool.query(
                        "SELECT id FROM vinyls WHERE artist = ? AND (LOWER(title) LIKE ? OR LOWER(title) LIKE ?)",
                        [artistName, `%${cleaned}%`, `${cleaned}%`]
                    );

                    if (existing.length === 0) {
                        const price = (Math.random() * 35 + 20).toFixed(2);
                        await pool.query(`
                            INSERT INTO vinyls (discogs_id, title, artist, genre, year, price, image_url, description)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        `, [
                            item.id.toString(), 
                            originalTitle.split(' = ')[0].trim(), 
                            artistName, 
                            item.genre?.[0] || 'Influential', 
                            item.year || 0, 
                            price, 
                            item.cover_image,
                            `A legendary work by the influential ${artistName}.`
                        ]);
                        console.log(`  ✓ Imported: ${originalTitle}`);
                        totalInserted++;
                    } else {
                        console.log(`  ⏩ Skipped Duplicate/Variant: ${originalTitle}`);
                    }
                } catch (err) {
                    console.error(`  ❌ Item Error: ${err.message}`);
                }
            }
            // Respect rate limit between artist searches (once per artist)
            await new Promise(r => setTimeout(r, 1200)); 
        } catch (error) {
            console.error(`🛑 Artist Fetch failed (${artistName}):`, error.message);
        }
    }

    console.log(`\n🎉 MASSIVE COLLECTION COMPLETE! Added ${totalInserted} unique legendary records.`);
    await pool.end();
}

main();
