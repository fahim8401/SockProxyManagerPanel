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
    // Create default admin user
    const adminPassword = bcrypt.hashSync('admin123', 10);
    await db.insert(schema.admins)
      .values({
        username: 'admin',
        password: adminPassword,
        role: 'admin'
      })
      .onConflictDoNothing();

    // Create default packages
    await db.insert(schema.packages)
      .values([
        {
          name: 'Basic',
          description: '1GB data, 30 days validity',
          dataLimit: 1073741824, // 1GB
          validityDays: 30,
          price: 10.0,
          maxConnections: 1,
          allowedIpCount: 1,
          isActive: true
        },
        {
          name: 'Premium',
          description: '10GB data, 30 days validity, 3 IPs',
          dataLimit: 10737418240, // 10GB
          validityDays: 30,
          price: 50.0,
          maxConnections: 5,
          allowedIpCount: 3,
          isActive: true
        },
        {
          name: 'Enterprise',
          description: '100GB data, 90 days validity, unlimited IPs',
          dataLimit: 107374182400, // 100GB
          validityDays: 90,
          price: 200.0,
          maxConnections: 20,
          allowedIpCount: 10,
          isActive: true
        }
      ])
      .onConflictDoNothing();

    // Create default SOCKS5 user
    await db.insert(schema.proxyUsers)
      .values({
        username: 'testuser',
        password: 'testpass',
        packageId: 1,
        ipAddress: '0.0.0.0',
        port: 1080,
        dataLimit: 1073741824, // 1GB
        validityDays: 30,
        isActive: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      })
      .onConflictDoNothing();

    // Create default IP pool entries
    await db.insert(schema.ipPool)
      .values([
        {
          ipAddress: '103.7.4.182',
          isPublic: true,
          isActive: true,
          country: 'US',
          city: 'New York',
          provider: 'VPS Provider'
        },
        {
          ipAddress: '103.7.4.183',
          isPublic: true,
          isActive: true,
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

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}