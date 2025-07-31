import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

// Create SQLite database
const sqlite = new Database('./database.sqlite');

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Initialize tables directly
const initializeDatabase = () => {
  try {
    // Create tables if they don't exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        email TEXT,
        ip_address TEXT NOT NULL,
        port INTEGER NOT NULL,
        data_limit INTEGER NOT NULL,
        data_used INTEGER DEFAULT 0,
        days_valid INTEGER NOT NULL,
        created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
        expires_at INTEGER NOT NULL,
        is_active INTEGER DEFAULT 1,
        last_connection INTEGER
      );

      CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT NOT NULL REFERENCES users(id),
        ip_address TEXT NOT NULL,
        start_time INTEGER DEFAULT CURRENT_TIMESTAMP,
        end_time INTEGER,
        bytes_transferred INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS ip_pool (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        ip_address TEXT NOT NULL UNIQUE,
        ip_type TEXT NOT NULL,
        is_available INTEGER DEFAULT 1,
        assigned_user_id TEXT REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        permissions TEXT DEFAULT '{}',
        is_active INTEGER DEFAULT 1,
        last_login INTEGER,
        created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
        updated_at INTEGER DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT
      );
    `);

    // Insert default IP pool if empty
    const ipCount = sqlite.prepare('SELECT COUNT(*) as count FROM ip_pool').get() as { count: number };
    if (ipCount.count === 0) {
      const insertIP = sqlite.prepare(`
        INSERT INTO ip_pool (ip_address, ip_type, is_available) 
        VALUES (?, ?, 1)
      `);
      
      const defaultIPs = [
        '192.168.1.100',
        '192.168.1.101', 
        '192.168.1.102',
        '10.0.0.100',
        '10.0.0.101',
        '2001:db8::1'
      ];

      defaultIPs.forEach(ip => {
        const ipType = ip.includes(':') ? 'IPv6' : 'IPv4';
        insertIP.run(ip, ipType);
      });
      
      console.log('✅ Initialized IP pool with 6 default addresses');
    }

    // Insert default admin if none exists
    const adminCount = sqlite.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
    if (adminCount.count === 0) {
      sqlite.prepare(`
        INSERT INTO admins (username, password, role, email) 
        VALUES ('admin', 'admin123', 'super_admin', 'admin@localhost')
      `).run();
      console.log('✅ Created default admin account (admin/admin123)');
    }

    console.log('✅ SQLite database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

// Initialize on startup
initializeDatabase();