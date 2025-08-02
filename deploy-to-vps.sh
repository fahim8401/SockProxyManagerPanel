#!/bin/bash

# Complete VPS deployment script
VPS_HOST="103.7.4.183"
VPS_USER="root" 
VPS_PASS="1hZuXd3c2#Ql"

echo "🚀 Deploying complete SOCKS5 system to VPS..."

# Upload the entire current project to VPS
echo "📦 Uploading project files..."
tar -czf socks5-system.tar.gz --exclude=node_modules --exclude=.git --exclude=attached_assets .

sshpass -p "$VPS_PASS" scp -o StrictHostKeyChecking=no socks5-system.tar.gz $VPS_USER@$VPS_HOST:/root/

# Install and setup on VPS
sshpass -p "$VPS_PASS" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "
# Stop any existing services
pkill -f 'node dist/index.js' || true
pkill -f 'tsx server/index.ts' || true

# Extract project
cd /root
tar -xzf socks5-system.tar.gz
ls -la | head -10

# Install dependencies
npm install --production

# Build the project
npm run build

# Setup systemd service for auto-start
cat > /etc/systemd/system/socks5-proxy.service << 'EOF'
[Unit]
Description=SOCKS5 Proxy Management System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable socks5-proxy
systemctl start socks5-proxy

# Check status
sleep 3
systemctl status socks5-proxy --no-pager -l
"

echo "✅ Deployment complete!"
rm -f socks5-system.tar.gz