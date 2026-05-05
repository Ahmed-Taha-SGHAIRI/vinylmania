require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-vinyl-key';
const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN;
const USER_AGENT = 'Vinylmania/1.0';

async function getOrFetchTracklist(vinyl) {
    // 1. Robust retrieval from DB
    let existingTracks = vinyl.tracklist;
    if (existingTracks) {
        try {
            // If it's a string (MariaDB usually returns it as string), parse it
            if (typeof existingTracks === 'string') return JSON.parse(existingTracks);
            // If it's already an object/array, return it
            if (Array.isArray(existingTracks)) return existingTracks;
        } catch (e) {
            console.error('JSON Parse error for tracklist:', e);
        }
    }

    // 2. Not in DB, fetch from Discogs with rate limit protection
    try {
        if (!vinyl.discogs_id || vinyl.discogs_id === '0') return [];
        
        console.log(`[Discogs] Fetching tracks for: ${vinyl.title} (ID: ${vinyl.discogs_id})`);
        
        // Wait a small random delay to avoid clashing with other parallel fetches
        await new Promise(r => setTimeout(r, Math.random() * 1000));

        const response = await fetch(`https://api.discogs.com/releases/${vinyl.discogs_id}`, {
            headers: {
                'Authorization': `Discogs token=${DISCOGS_TOKEN}`,
                'User-Agent': USER_AGENT
            }
        });
        
        if (response.status === 429) {
            console.warn(`[Discogs] Rate limited (429). Try again in a few seconds.`);
            return [];
        }

        if (!response.ok) {
            console.error(`[Discogs] API Error: ${response.status}`);
            return [];
        }

        const data = await response.json();
        
        if (data.tracklist && data.tracklist.length > 0) {
            const tracks = data.tracklist.map(t => ({
                position: t.position || '',
                title: t.title,
                duration: t.duration || ''
            }));
            
            // Explicitly stringify for MariaDB storage
            const jsonString = JSON.stringify(tracks);
            await pool.query('UPDATE vinyls SET tracklist = ? WHERE id = ?', [jsonString, vinyl.id]);
            console.log(`[Database] Saved ${tracks.length} tracks for: ${vinyl.title}`);
            return tracks;
        } else {
            // Mark as fetched but empty to avoid re-fetching
            await pool.query('UPDATE vinyls SET tracklist = "[]" WHERE id = ?', [vinyl.id]);
        }
    } catch (err) {
        console.error('[Discogs] Fetch failed:', err.message);
    }
    return [];
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- Auth Routes ---

app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
            [username, email, passwordHash]
        );
        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: "Username or email already exists" });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (error) {
        res.status(500).json({ error: "Login failed" });
    }
});

// --- Vinyl Routes ---

app.get('/api/vinyls', async (req, res) => {
    try {
        const { genre, search, year, artist, limit = 50, offset = 0 } = req.query;
        let query = 'SELECT * FROM vinyls WHERE 1=1';
        let params = [];

        if (genre && genre !== 'All') {
            query += ' AND genre = ?';
            params.push(genre);
        }
        if (artist) {
            query += ' AND artist = ?';
            params.push(artist);
        }
        if (year) {
            query += ' AND year = ?';
            params.push(parseInt(year));
        }
        if (search) {
            query += ' AND (title LIKE ? OR artist LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY is_bestseller DESC, created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch vinyls" });
    }
});

app.get('/api/vinyls/:id', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM vinyls WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Vinyl not found" });
        
        // Return immediately with what we have in DB (might have tracks, might not)
        const vinyl = rows[0];
        if (vinyl.tracklist && typeof vinyl.tracklist === 'string') {
            try {
                vinyl.tracklist = JSON.parse(vinyl.tracklist);
            } catch (e) {}
        }
        res.json(vinyl);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal error" });
    }
});

app.get('/api/vinyls/:id/tracks', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM vinyls WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Vinyl not found" });
        
        const vinyl = rows[0];
        const tracklist = await getOrFetchTracklist(vinyl);
        res.json(tracklist || []);
    } catch (error) {
        console.error('Track API error:', error);
        res.status(500).json({ error: "Failed to fetch tracks" });
    }
});

// --- Order Routes (Protected) ---

app.post('/api/orders', async (req, res) => {
    // If token exists, we link it to user, else guest order
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let userId = null;

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            userId = decoded.id;
        } catch (e) {}
    }

    const { customerName, customerEmail, items } = req.body;
    if (!customerName || !customerEmail || !items?.length) {
        return res.status(400).json({ error: "Invalid order data" });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        let total_price = 0;
        
        for (const item of items) {
            const [rows] = await connection.query('SELECT price FROM vinyls WHERE id = ?', [item.vinylId]);
            if (rows.length === 0) throw new Error(`Vinyl ${item.vinylId} not found`);
            total_price += rows[0].price * item.quantity;
        }

        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, customer_name, customer_email, total_price) VALUES (?, ?, ?, ?)',
            [userId, customerName, customerEmail, total_price]
        );
        const orderId = orderResult.insertId;

        for (const item of items) {
            await connection.query(
                'INSERT INTO order_items (order_id, vinyl_id, quantity, unit_price) VALUES (?, ?, ?, (SELECT price FROM vinyls WHERE id=?))',
                [orderId, item.vinylId, item.quantity, item.vinylId]
            );
        }

        await connection.commit();
        res.status(201).json({ id: orderId, total_price });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: "ok", timestamp: new Date() });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Vinylmania PRO running on port ${PORT}`);
});
