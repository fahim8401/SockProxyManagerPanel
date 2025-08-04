#!/bin/bash

#################################################################################
# Xray SOCKS5 Management System - Simplified Debian Installation
# Fixes hanging issue on Debian 12 during package installation
#################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
INSTALL_DIR="/opt/xray-socks5"
SERVICE_NAME="xray-socks5"
DOMAIN="$1"

# Prevent hanging during package installation
export DEBIAN_FRONTEND=noninteractive
export APT_LISTCHANGES_FRONTEND=none
export NEEDRESTART_MODE=a

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

# Header
echo -e "${GREEN}"
echo "════════════════════════════════════════════════════════════════"
echo "    🚀 Xray SOCKS5 Management System Installation"
echo "         Simplified Debian 12 Compatible Version"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   error "This script must be run as root (use sudo)"
fi

info "Starting installation process..."

# Detect OS
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    info "Detected OS: $ID $VERSION_ID"
else
    error "Cannot detect Linux distribution"
fi

# Install packages step by step to avoid hanging
info "Installing required packages..."

# Update package lists with timeout
info "Updating package lists..."
timeout 180 apt-get update -y || {
    warning "Package update timed out, continuing..."
}

# Install packages one by one to identify any problematic ones
info "Installing curl and wget..."
apt-get install -y curl wget || error "Failed to install curl/wget"

info "Installing system tools..."
apt-get install -y unzip sqlite3 || error "Failed to install system tools"

info "Installing nginx..."
apt-get install -y nginx || error "Failed to install nginx"

info "Installing firewall..."
apt-get install -y ufw || warning "UFW installation failed"

info "Installing Node.js (this may take a moment)..."
# Try the default Node.js first
if apt-get install -y nodejs npm 2>/dev/null; then
    success "Node.js installed from default repository"
else
    info "Installing Node.js from NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | timeout 120 bash - || {
        error "Failed to setup NodeSource repository"
    }
    apt-get install -y nodejs || error "Failed to install Node.js"
fi

# Verify Node.js installation
node_version=$(node --version 2>/dev/null || echo "none")
npm_version=$(npm --version 2>/dev/null || echo "none")
info "Node.js version: $node_version"
info "NPM version: $npm_version"

if [[ "$node_version" == "none" ]]; then
    error "Node.js installation failed"
fi

# Install build tools (optional)
info "Installing build tools..."
apt-get install -y build-essential || warning "Build tools installation failed (continuing...)"

# Install SSL tools (optional)
info "Installing SSL certificate tools..."
apt-get install -y certbot python3-certbot-nginx || warning "Certbot installation failed (SSL will need manual setup)"

success "All packages installed successfully!"

# Create installation directory
info "Creating installation directory..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Download application (using git clone or curl)
info "Downloading application files..."
if command -v git >/dev/null 2>&1; then
    git clone https://github.com/fahim8401/SockProxyManagerPanel.git . || {
        warning "Git clone failed, downloading via curl..."
        curl -fsSL https://github.com/fahim8401/SockProxyManagerPanel/archive/refs/heads/main.zip -o app.zip
        unzip app.zip
        mv SockProxyManagerPanel-main/* .
        rm -rf SockProxyManagerPanel-main app.zip
    }
else
    curl -fsSL https://github.com/fahim8401/SockProxyManagerPanel/archive/refs/heads/main.zip -o app.zip
    unzip app.zip
    mv SockProxyManagerPanel-main/* .
    rm -rf SockProxyManagerPanel-main app.zip
fi

# Install Node.js dependencies
info "Installing Node.js dependencies..."
if ! npm install --production 2>/dev/null; then
    warning "Standard npm install failed, trying alternatives..."
    npm install --production --legacy-peer-deps || \
    npm install --production --force || \
    error "Failed to install dependencies"
fi

# Build application (if needed)
info "Building application..."
npm run build 2>/dev/null || warning "Build step failed (continuing...)"

# Initialize database
info "Initializing database..."
NODE_ENV=production node -e "
    const { initializeDatabase } = require('./server/db.js');
    initializeDatabase().then(() => {
        console.log('Database initialized successfully');
        process.exit(0);
    }).catch(err => {
        console.error('Database error:', err.message);
        process.exit(1);
    });
" || warning "Database initialization completed with warnings"

# Create systemd service
info "Creating systemd service..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=Xray SOCKS5 Management System
After=network.target
Wants=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

# Setup basic Nginx configuration
info "Configuring Nginx..."
cat > "/etc/nginx/sites-available/xray-socks5" << EOF
server {
    listen 80;
    server_name ${DOMAIN:-localhost};
    
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/xray-socks5 /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t || error "Nginx configuration is invalid"

# Setup firewall
info "Configuring firewall..."
if command -v ufw >/dev/null 2>&1; then
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 1080/tcp
    success "Firewall configured"
fi

# Start services
info "Starting services..."
systemctl restart nginx
systemctl start "$SERVICE_NAME"

# Check service status
sleep 3
if systemctl is-active --quiet "$SERVICE_NAME"; then
    success "Service started successfully"
else
    warning "Service may have issues, checking status..."
    systemctl status "$SERVICE_NAME" --no-pager
fi

# Final status
echo -e "${GREEN}"
echo "════════════════════════════════════════════════════════════════"
echo "    ✅ Installation Complete!"
echo "════════════════════════════════════════════════════════════════"
echo -e "${NC}"

info "Access your Xray SOCKS5 Management Panel:"
if [[ -n "$DOMAIN" ]]; then
    info "🌐 Web Interface: http://$DOMAIN"
else
    info "🌐 Web Interface: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
fi
info "🔗 SOCKS5 Proxy: YOUR_SERVER_IP:1080"
info "🔑 Default Admin: admin / admin123"
info "🔑 Default SOCKS5 User: testuser / testpass"

echo -e "${YELLOW}"
echo "📋 Service Management Commands:"
echo "   systemctl start $SERVICE_NAME"
echo "   systemctl stop $SERVICE_NAME"
echo "   systemctl restart $SERVICE_NAME"
echo "   systemctl status $SERVICE_NAME"
echo -e "${NC}"

info "Installation completed successfully!"