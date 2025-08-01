import Database from 'better-sqlite3';

// Open the database
const db = new Database('./database.sqlite');

try {
  // Add outbound_ip column to users table
  try {
    db.prepare('ALTER TABLE users ADD COLUMN outbound_ip TEXT').run();
    console.log('✅ Added outbound_ip column to users table');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️ Column outbound_ip already exists in users table');
    } else {
      console.error('❌ Error adding outbound_ip column:', error.message);
    }
  }

  // Add is_public column to ip_pool table  
  try {
    db.prepare('ALTER TABLE ip_pool ADD COLUMN is_public INTEGER DEFAULT 0').run();
    console.log('✅ Added is_public column to ip_pool table');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️ Column is_public already exists in ip_pool table');
    } else {
      console.error('❌ Error adding is_public column:', error.message);
    }
  }

  // Add some public IPs to the pool for testing
  const insertIP = db.prepare('INSERT OR IGNORE INTO ip_pool (ip_address, ip_type, is_public, is_available) VALUES (?, ?, ?, ?)');
  
  // Add your public IPs
  insertIP.run('103.7.4.182', 'IPv4', 1, 1);
  insertIP.run('103.7.4.183', 'IPv4', 1, 1);
  
  console.log('✅ Added public IPs to the pool');
  
  console.log('✅ Database schema update completed successfully');
  
} catch (error) {
  console.error('❌ Database schema update failed:', error);
} finally {
  db.close();
}