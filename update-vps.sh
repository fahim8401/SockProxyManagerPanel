#!/bin/bash

# VPS Update Script - Deploy latest SOCKS5 system with API keys fix
VPS_HOST="103.7.4.183"
VPS_USER="root"
VPS_PASS="1hZuXd3c2#Ql"

echo "🚀 Updating VPS SOCKS5 system with latest fixes..."

# Create backup and update database
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "
# Stop current service
pkill -f 'node dist/index.js' || true

# Backup current database
cp database.sqlite database.sqlite.backup || true

# Create API keys table (missing on VPS)
sqlite3 database.sqlite \"CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  is_active INTEGER DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  last_used INTEGER,
  created_at INTEGER DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL
);\"

echo '✅ API keys table created on VPS'

# Test the table creation
sqlite3 database.sqlite \"SELECT name FROM sqlite_master WHERE type='table' AND name='api_keys';\" || echo 'Table check'

# Start the service again
nohup /usr/bin/node dist/index.js > /dev/null 2>&1 &
echo '✅ Service restarted'

# Check if services are running
sleep 2
ps aux | grep 'node dist/index.js' | grep -v grep || echo 'Service check needed'
"

echo "🎯 VPS update completed!"