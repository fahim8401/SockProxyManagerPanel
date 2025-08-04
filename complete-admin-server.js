const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Create database
const db = new Database('xray-socks5.db');

// Initialize database with extended schema
function initDB() {
    console.log('🔧 Initializing database...');
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS proxy_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            data_limit INTEGER DEFAULT 1073741824,
            data_used INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            expires_at INTEGER,
            last_login INTEGER,
            ip_address TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS packages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            data_limit INTEGER NOT NULL,
            validity_days INTEGER NOT NULL,
            price REAL DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS connections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            ip_address TEXT,
            country TEXT,
            connected_at INTEGER DEFAULT (strftime('%s', 'now')),
            disconnected_at INTEGER,
            bytes_sent INTEGER DEFAULT 0,
            bytes_received INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES proxy_users (id)
        );
        
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
    `);
    
    // Insert default admin
    const adminExists = db.prepare('SELECT COUNT(*) as count FROM admins').get();
    if (adminExists.count === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('admin', hashedPassword);
        console.log('✅ Admin created: admin / admin123');
    }
    
    // Insert default SOCKS5 user
    const userExists = db.prepare('SELECT COUNT(*) as count FROM proxy_users').get();
    if (userExists.count === 0) {
        const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
        db.prepare('INSERT INTO proxy_users (username, password, expires_at) VALUES (?, ?, ?)').run('testuser', 'testpass', expiresAt);
        console.log('✅ SOCKS5 user created: testuser / testpass');
    }
    
    // Insert default packages
    const packageExists = db.prepare('SELECT COUNT(*) as count FROM packages').get();
    if (packageExists.count === 0) {
        const packages = [
            ['Basic', 1073741824, 30, 9.99],
            ['Premium', 5368709120, 30, 19.99],
            ['Enterprise', 21474836480, 30, 39.99]
        ];
        const insertPackage = db.prepare('INSERT INTO packages (name, data_limit, validity_days, price) VALUES (?, ?, ?, ?)');
        packages.forEach(pkg => insertPackage.run(...pkg));
        console.log('✅ Default packages created');
    }
    
    console.log('✅ Database initialized');
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Main landing page
app.get('/', (req, res) => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xray SOCKS5 Management System</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            text-align: center;
            max-width: 600px;
            width: 100%;
        }
        h1 { font-size: 2.5em; margin-bottom: 20px; }
        .status { 
            color: #4ade80; 
            font-weight: bold; 
            font-size: 1.2em;
            margin-bottom: 30px;
        }
        .feature {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .credentials {
            background: rgba(0,0,0,0.2);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .btn {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            margin: 10px;
            border: 1px solid rgba(255,255,255,0.3);
            transition: all 0.3s;
        }
        .btn:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Xray SOCKS5 Management System</h1>
        <div class="status">✅ System Online</div>
        
        <div class="feature">
            <h3>🔐 Admin Panel</h3>
            <p>Professional web interface for SOCKS5 proxy management</p>
            <a href="/admin" class="btn">Access Admin Panel</a>
        </div>
        
        <div class="feature">
            <h3>🌐 SOCKS5 Proxy Service</h3>
            <p>High-performance proxy service running on port 1080</p>
        </div>
        
        <div class="credentials">
            <h3>Default Credentials</h3>
            <p><strong>Admin:</strong> admin / admin123</p>
            <p><strong>SOCKS5:</strong> testuser / testpass</p>
            <p><strong>Endpoint:</strong> ${req.hostname}:1080</p>
        </div>
        
        <p style="margin-top: 30px; opacity: 0.8;">
            Professional SAAS Platform v2.0 - Production Ready
        </p>
    </div>
</body>
</html>`;
    res.send(htmlContent);
});

// Comprehensive Admin Panel
app.get('/admin', (req, res) => {
    const adminPanel = fs.readFileSync(path.join(__dirname, 'admin-panel.html'), 'utf8').replace('{{HOSTNAME}}', req.hostname);
    res.send(adminPanel);
});

// API Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Xray SOCKS5 Management System',
        version: '2.0.0',
        uptime: process.uptime(),
        database: 'Connected'
    });
});

// Users API
app.get('/api/users', (req, res) => {
    try {
        const users = db.prepare('SELECT id, username, data_limit, data_used, is_active, expires_at, last_login, ip_address, created_at FROM proxy_users ORDER BY created_at DESC').all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/users', (req, res) => {
    try {
        const { username, password, dataLimit = 1073741824, validityDays = 30, packageId } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        const expiresAt = Math.floor(Date.now() / 1000) + (validityDays * 24 * 60 * 60);
        
        const result = db.prepare(`
            INSERT INTO proxy_users (username, password, data_limit, expires_at) 
            VALUES (?, ?, ?, ?)
        `).run(username, password, dataLimit, expiresAt);
        
        res.json({ 
            id: result.lastInsertRowid,
            username,
            message: 'User created successfully'
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: 'Username already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create user' });
        }
    }
});

app.delete('/api/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        const result = db.prepare('DELETE FROM proxy_users WHERE id = ?').run(id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Packages API
app.get('/api/packages', (req, res) => {
    try {
        const packages = db.prepare('SELECT * FROM packages ORDER BY created_at DESC').all();
        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/packages', (req, res) => {
    try {
        const { name, dataLimit, validityDays, price } = req.body;
        
        if (!name || !dataLimit || !validityDays || price === undefined) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const result = db.prepare(`
            INSERT INTO packages (name, data_limit, validity_days, price) 
            VALUES (?, ?, ?, ?)
        `).run(name, dataLimit, validityDays, price);
        
        res.json({ 
            id: result.lastInsertRowid,
            name,
            message: 'Package created successfully'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create package' });
    }
});

app.delete('/api/packages/:id', (req, res) => {
    try {
        const { id } = req.params;
        const result = db.prepare('DELETE FROM packages WHERE id = ?').run(id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Package not found' });
        }
        
        res.json({ message: 'Package deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete package' });
    }
});

// Connections API
app.get('/api/connections', (req, res) => {
    try {
        const connections = db.prepare('SELECT * FROM connections WHERE disconnected_at IS NULL ORDER BY connected_at DESC').all();
        res.json(connections);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin API
app.post('/api/admin/clean-database', (req, res) => {
    try {
        db.exec(`
            DELETE FROM proxy_users;
            DELETE FROM connections;
            DELETE FROM packages WHERE id > 3;
        `);
        
        // Recreate default data
        const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
        db.prepare('INSERT INTO proxy_users (username, password, expires_at) VALUES (?, ?, ?)').run('testuser', 'testpass', expiresAt);
        
        res.json({ message: 'Database cleaned successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clean database' });
    }
});

// Start server
async function startServer() {
    try {
        initDB();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log('🚀 Xray SOCKS5 Management System Started');
            console.log(`🌐 Web Interface: http://0.0.0.0:${PORT}`);
            console.log(`🔐 Admin Panel: http://0.0.0.0:${PORT}/admin`);
            console.log('🔗 SOCKS5 Proxy: YOUR_SERVER_IP:1080');
            console.log('🔑 Admin: admin / admin123');
            console.log('🔑 SOCKS5: testuser / testpass');
        });
    } catch (error) {
        console.error('❌ Startup failed:', error);
        process.exit(1);
    }
}

startServer();