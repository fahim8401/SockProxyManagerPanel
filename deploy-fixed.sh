#!/bin/bash

# SOCKS5 Admin Panel - Quick Deployment Fix
# Handles port conflicts and authentication issues

set -e

log() {
    echo -e "\033[0;32m[$(date '+%Y-%m-%d %H:%M:%S')] $1\033[0m"
}

error() {
    echo -e "\033[0;31m[ERROR] $1\033[0m"
}

log "🔧 SOCKS5 Admin Panel - Deployment Fix v1.0"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root"
    exit 1
fi

# Stop any running services and kill processes on port 5000
log "Stopping existing services and clearing port 5000..."
systemctl stop socks5-admin 2>/dev/null || true
systemctl disable socks5-admin 2>/dev/null || true

# Kill any processes using port 5000
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
sleep 2

# Kill any node processes that might be running
pkill -f "node.*5000" 2>/dev/null || true
pkill -f "tsx.*server" 2>/dev/null || true
sleep 2

INSTALL_DIR="/opt/socks5-admin"
SERVICE_USER="socks5admin"
DB_FILE="$INSTALL_DIR/database.sqlite"

# Update the application files
log "Updating application files..."
if [[ -f "dist/index.js" ]]; then
    cp dist/index.js $INSTALL_DIR/ 2>/dev/null || true
fi
if [[ -d "dist/public" ]]; then
    cp -r dist/public $INSTALL_DIR/ 2>/dev/null || true
fi
if [[ -f "package.json" ]]; then
    cp package.json $INSTALL_DIR/ 2>/dev/null || true
fi

# Ensure correct ownership
chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR

# Install dependencies if needed
cd $INSTALL_DIR
if [[ ! -d "node_modules" ]]; then
    log "Installing dependencies..."
    sudo -u $SERVICE_USER npm install --production --quiet
fi

# Create the fixed systemd service
log "Creating updated systemd service..."
cat > /etc/systemd/system/socks5-admin.service << 'EOFSERVICE'
[Unit]
Description=SOCKS5 Proxy Admin Panel
After=network.target
Wants=network.target

[Service]
Type=simple
User=socks5admin
Group=socks5admin
WorkingDirectory=/opt/socks5-admin
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=SOCKS_PORT=1080
Environment=DATABASE_URL=sqlite:/opt/socks5-admin/database.sqlite
Environment=JWT_SECRET=socks5-admin-jwt-secret-key-updated
ExecStart=/usr/bin/node /opt/socks5-admin/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=5

[Install]
WantedBy=multi-user.target
EOFSERVICE

# Reload systemd
systemctl daemon-reload
systemctl enable socks5-admin

# Test the service configuration
log "Testing service configuration..."
if systemctl show socks5-admin --property=ExecStart | grep -q "/usr/bin/node /opt/socks5-admin/index.js"; then
    log "✅ Service configuration is correct"
else
    error "Service configuration is incorrect"
    systemctl show socks5-admin --property=ExecStart,User,WorkingDirectory,Environment
    exit 1
fi

# Start the service
log "Starting SOCKS5 Admin Panel service..."
systemctl start socks5-admin

# Wait and check status
sleep 5
if systemctl is-active --quiet socks5-admin; then
    log "✅ Service started successfully"
    
    # Show service status
    systemctl status socks5-admin --no-pager -l
    
    # Show access information
    server_ip=$(hostname -I | awk '{print $1}')
    echo
    log "🎉 SOCKS5 Admin Panel deployed successfully!"
    echo
    echo "📍 Access Information:"
    echo "   • Admin Panel: http://$server_ip:5000"
    echo "   • Login: admin / admin123"
    echo "   • SOCKS5 Proxy: $server_ip:1080"
    echo
    echo "🔧 Management Commands:"
    echo "   • Status: systemctl status socks5-admin"
    echo "   • Logs: journalctl -u socks5-admin -f"
    echo "   • Restart: systemctl restart socks5-admin"
    echo
else
    error "Service failed to start"
    echo "Service status:"
    systemctl status socks5-admin --no-pager -l
    echo
    echo "Recent logs:"
    journalctl -u socks5-admin --no-pager -l -n 20
    exit 1
fi