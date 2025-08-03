#!/bin/bash

# SOCKS5 Admin Panel - Simple Deployment Script
# Fixes port conflicts and service path issues

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    error "This script must be run as root"
    exit 1
fi

log "🚀 SOCKS5 Admin Panel - Simple Deployment"

# Configuration
INSTALL_DIR="/opt/socks5-admin"
SERVICE_NAME="socks5-admin"
SERVICE_USER="socks5admin"

# Step 1: Kill everything on port 5000 aggressively
log "Step 1: Clearing port 5000..."
systemctl stop $SERVICE_NAME 2>/dev/null || true
systemctl disable $SERVICE_NAME 2>/dev/null || true

# Kill processes using port 5000
if command -v lsof >/dev/null; then
    lsof -ti:5000 | xargs kill -9 2>/dev/null || true
else
    # Alternative method without lsof
    netstat -tlnp 2>/dev/null | grep ":5000 " | awk '{print $7}' | cut -d'/' -f1 | xargs kill -9 2>/dev/null || true
fi

# Kill node processes
pkill -f "node.*5000" 2>/dev/null || true
pkill -f "tsx.*server" 2>/dev/null || true
pkill -f "socks5" 2>/dev/null || true

sleep 3

# Step 2: Verify port is free
log "Step 2: Verifying port 5000 is free..."
if command -v lsof >/dev/null; then
    if lsof -i:5000 >/dev/null 2>&1; then
        error "Port 5000 is still in use!"
        lsof -i:5000
        exit 1
    fi
else
    if netstat -tln 2>/dev/null | grep -q ":5000 "; then
        error "Port 5000 is still in use!"
        netstat -tln | grep ":5000 "
        exit 1
    fi
fi

log "✅ Port 5000 is now free"

# Step 3: Ensure user exists
log "Step 3: Setting up user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd --system --shell /bin/false --home $INSTALL_DIR $SERVICE_USER
    log "Created user: $SERVICE_USER"
fi

# Step 4: Setup directory and files
log "Step 4: Setting up application..."
mkdir -p $INSTALL_DIR

# Copy the built application
if [[ -f "dist/index.js" ]]; then
    cp dist/index.js $INSTALL_DIR/
    log "Copied built application"
else
    error "dist/index.js not found. Run 'npm run build' first."
    exit 1
fi

# Copy public files if they exist
if [[ -d "dist/public" ]]; then
    cp -r dist/public $INSTALL_DIR/
    log "Copied public files"
fi

# Copy package.json for dependencies info
if [[ -f "package.json" ]]; then
    cp package.json $INSTALL_DIR/
fi

# Set ownership
chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR

# Step 5: Install runtime dependencies only
log "Step 5: Installing runtime dependencies..."
cd $INSTALL_DIR

# Create minimal package.json for production
cat > package.json << 'EOF'
{
  "name": "socks5-admin",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "better-sqlite3": "^12.2.0",
    "express": "^4.18.2",
    "bcryptjs": "^3.0.2",
    "jsonwebtoken": "^9.0.10",
    "ws": "^8.14.2"
  }
}
EOF

# Install only required dependencies
sudo -u $SERVICE_USER npm install --production --quiet

# Step 6: Create database if it doesn't exist
log "Step 6: Setting up database..."
DB_FILE="$INSTALL_DIR/database.sqlite"
if [[ ! -f "$DB_FILE" ]]; then
    touch $DB_FILE
    chown $SERVICE_USER:$SERVICE_USER $DB_FILE
    log "Created database file"
fi

# Step 7: Create systemd service with correct path
log "Step 7: Creating systemd service..."
cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=SOCKS5 Proxy Admin Panel
After=network.target
Wants=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=SOCKS_PORT=1080
Environment=DATABASE_URL=sqlite:$DB_FILE
Environment=JWT_SECRET=socks5-admin-jwt-secret-$(date +%s)
ExecStart=/usr/bin/node $INSTALL_DIR/index.js
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=10

[Install]
WantedBy=multi-user.target
EOF

# Step 8: Enable and start service
log "Step 8: Starting service..."
systemctl daemon-reload
systemctl enable $SERVICE_NAME

# Verify service file is correct
if ! systemctl show $SERVICE_NAME --property=ExecStart | grep -q "$INSTALL_DIR/index.js"; then
    error "Service configuration is incorrect"
    systemctl show $SERVICE_NAME --property=ExecStart
    exit 1
fi

log "✅ Service configuration verified"

# Start the service
systemctl start $SERVICE_NAME

# Step 9: Verify deployment
log "Step 9: Verifying deployment..."
sleep 5

if systemctl is-active --quiet $SERVICE_NAME; then
    log "✅ Service is running successfully"
    
    # Get server IP
    SERVER_IP=$(hostname -I | awk '{print $1}' | head -1)
    if [[ -z "$SERVER_IP" ]]; then
        SERVER_IP="YOUR_SERVER_IP"
    fi
    
    echo
    log "🎉 DEPLOYMENT SUCCESSFUL!"
    echo
    echo "📍 Access Information:"
    echo "   Admin Panel: http://$SERVER_IP:5000"
    echo "   Username: admin"
    echo "   Password: admin123"
    echo "   SOCKS5 Proxy: $SERVER_IP:1080"
    echo
    echo "🔧 Management Commands:"
    echo "   Status: systemctl status $SERVICE_NAME"
    echo "   Logs: journalctl -u $SERVICE_NAME -f"
    echo "   Restart: systemctl restart $SERVICE_NAME"
    echo "   Stop: systemctl stop $SERVICE_NAME"
    echo
    
    # Show current status
    systemctl status $SERVICE_NAME --no-pager -l
    
else
    error "Service failed to start"
    echo
    echo "Service status:"
    systemctl status $SERVICE_NAME --no-pager -l
    echo
    echo "Recent logs:"
    journalctl -u $SERVICE_NAME --no-pager -l -n 20
    exit 1
fi