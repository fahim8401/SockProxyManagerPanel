import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../shared/schema';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const sqlite = new Database('xray-socks5.db');
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Initialize database with default data
export async function initializeDatabase() {
  console.log('🔧 Initializing Xray SOCKS5 database...');
  
  try {
    // Create tables using raw SQL to ensure they exist
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );
      
      CREATE TABLE IF NOT EXISTS packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        data_limit INTEGER NOT NULL,
        validity_days INTEGER NOT NULL,
        price REAL NOT NULL DEFAULT 0.0,
        max_connections INTEGER NOT NULL DEFAULT 1,
        allowed_ip_count INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );
      
      CREATE TABLE IF NOT EXISTS ip_pool (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address TEXT NOT NULL UNIQUE,
        country TEXT,
        city TEXT,
        provider TEXT,
        is_public INTEGER NOT NULL DEFAULT 1,
        is_active INTEGER NOT NULL DEFAULT 1,
        assigned_user_id INTEGER,
        created_at INTEGER DEFAULT (unixepoch())
      );
      
      CREATE TABLE IF NOT EXISTS proxy_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        package_id INTEGER REFERENCES packages(id),
        selected_ip_id INTEGER REFERENCES ip_pool(id),
        ip_address TEXT NOT NULL DEFAULT '0.0.0.0',
        port INTEGER NOT NULL DEFAULT 1080,
        data_limit INTEGER NOT NULL DEFAULT 1073741824,
        data_used INTEGER NOT NULL DEFAULT 0,
        validity_days INTEGER NOT NULL DEFAULT 30,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch()),
        expires_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES proxy_users(id) ON DELETE CASCADE,
        client_ip TEXT NOT NULL,
        target_host TEXT,
        target_port INTEGER,
        bytes_up INTEGER NOT NULL DEFAULT 0,
        bytes_down INTEGER NOT NULL DEFAULT 0,
        connected_at INTEGER DEFAULT (unixepoch()),
        disconnected_at INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1
      );
      
      CREATE TABLE IF NOT EXISTS xray_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        config_name TEXT NOT NULL UNIQUE,
        config_data TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );
      
      CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_name TEXT NOT NULL,
        api_key TEXT NOT NULL UNIQUE,
        permissions TEXT NOT NULL DEFAULT 'read',
        is_active INTEGER NOT NULL DEFAULT 1,
        last_used INTEGER,
        created_at INTEGER DEFAULT (unixepoch()),
        expires_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        updated_at INTEGER DEFAULT (unixepoch())
      );
    `);
    
    console.log('✅ Database tables created successfully');
    
    // Create default admin user
    const adminPassword = bcrypt.hashSync('admin123', 10);
    await db.insert(schema.admins)
      .values([{
        username: 'admin',
        password: adminPassword,
        role: 'admin'
      }])
      .onConflictDoNothing();

    // Create default packages
    await db.insert(schema.packages)
      .values([
        {
          name: 'Basic',
          description: '1GB data, 30 days validity',
          dataLimit: 1073741824, // 1GB
          validityDays: 30,
          price: 1000, // $10.00 in cents
          maxConnections: 1,
          allowedIpCount: 1,
          isActive: 1
        },
        {
          name: 'Premium',
          description: '10GB data, 30 days validity, 3 IPs',
          dataLimit: 10737418240, // 10GB
          validityDays: 30,
          price: 5000, // $50.00 in cents
          maxConnections: 5,
          allowedIpCount: 3,
          isActive: 1
        },
        {
          name: 'Enterprise',
          description: '100GB data, 90 days validity, unlimited IPs',
          dataLimit: 107374182400, // 100GB
          validityDays: 90,
          price: 20000, // $200.00 in cents
          maxConnections: 20,
          allowedIpCount: 10,
          isActive: 1
        }
      ])
      .onConflictDoNothing();

    // Create default SOCKS5 user
    await db.insert(schema.proxyUsers)
      .values([{
        username: 'testuser',
        password: 'testpass',
        packageId: 1,
        ipAddress: '0.0.0.0',
        port: 1080,
        dataLimit: 1073741824, // 1GB
        validityDays: 30,
        isActive: 1,
        expiresAt: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days from now
      }])
      .onConflictDoNothing();

    // Create default IP pool entries
    await db.insert(schema.ipPool)
      .values([
        {
          ipAddress: '103.7.4.182',
          isPublic: 1,
          isActive: 1,
          country: 'US',
          city: 'New York',
          provider: 'VPS Provider'
        },
        {
          ipAddress: '103.7.4.183',
          isPublic: 1,
          isActive: 1,
          country: 'US',
          city: 'New York',
          provider: 'VPS Provider'
        }
      ])
      .onConflictDoNothing();

    // Create default system settings
    await db.insert(schema.settings)
      .values([
        {
          key: 'xray_version',
          value: 'v24.9.30',
          description: 'Xray-core version'
        },
        {
          key: 'socks_port',
          value: '1080',
          description: 'SOCKS5 proxy port'
        },
        {
          key: 'web_port',
          value: '5000',
          description: 'Web management port'
        },
        {
          key: 'max_connections',
          value: '1000',
          description: 'Maximum concurrent connections'
        }
      ])
      .onConflictDoNothing();

    // Add system IP scanning during initialization
    try {
      console.log('📡 Scanning system IP addresses...');
      const { scanAllSystemIps } = await import('./ip-scanner');
      const systemIps = await scanAllSystemIps();
      
      for (const ipInfo of systemIps) {
        await db.insert(schema.ipPool)
          .values([{
            ipAddress: ipInfo.ipAddress,
            isPublic: ipInfo.isPublic,
            isActive: true,
            country: ipInfo.country,
            city: ipInfo.city,
            provider: ipInfo.provider
          }])
          .onConflictDoNothing();
      }
      console.log(`✅ Added ${systemIps.length} system IPs to pool`);
    } catch (error) {
      console.warn('⚠️ IP scanning failed, using default IPs:', error);
    }

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}