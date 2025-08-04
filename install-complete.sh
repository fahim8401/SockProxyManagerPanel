#!/bin/bash

# Complete Production Installation Script for Socks5 Panel
# Handles both dependency fixes and production deployment

set -e

echo "🚀 Complete Socks5 Panel Installation & Deployment"
echo "=================================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Configuration
INSTALL_DIR="/opt/xray-socks5"
SERVICE_NAME="xray-socks5"
WEB_PORT=${WEB_PORT:-5000}
SOCKS_PORT=${SOCKS_PORT:-1080}
DOMAIN=${1:-""}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root"
        echo "Please run: sudo bash install-complete.sh [domain]"
        exit 1
    fi
}

# Fix Node.js dependency issues
fix_nodejs() {
    print_header "Fixing Node.js dependencies..."
    
    print_status "Removing conflicting packages..."
    apt remove --purge -y nodejs npm node-* 2>/dev/null || true
    apt autoremove -y
    apt autoclean
    
    print_status "Cleaning package cache..."
    apt clean
    rm -rf /var/lib/apt/lists/*
    apt update
    
    print_status "Fixing broken packages..."
    apt --fix-broken install -y
    dpkg --configure -a
    
    print_status "Installing Node.js from NodeSource..."
    apt install -y curl software-properties-common
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    
    # Verify installation
    NODE_VERSION=$(node --version 2>/dev/null || echo "Not installed")
    NPM_VERSION=$(npm --version 2>/dev/null || echo "Not installed")
    
    if [[ "$NODE_VERSION" == "Not installed" ]] || [[ "$NPM_VERSION" == "Not installed" ]]; then
        print_warning "Standard installation failed, trying snap..."
        apt install -y snapd
        snap install node --classic
        ln -sf /snap/bin/node /usr/bin/node 2>/dev/null || true
        ln -sf /snap/bin/npm /usr/bin/npm 2>/dev/null || true
    fi
    
    print_status "Node.js: $(node --version), npm: $(npm --version)"
}

# Install system dependencies
install_dependencies() {
    print_header "Installing system dependencies..."
    
    apt update
    apt install -y curl wget unzip git nginx ufw certbot python3-certbot-nginx build-essential
    
    print_status "System dependencies installed"
}

# Create application user
create_user() {
    print_header "Creating application user..."
    
    if ! id "xray-socks5" &>/dev/null; then
        useradd -r -s /bin/false -d $INSTALL_DIR xray-socks5
        print_status "Created user: xray-socks5"
    else
        print_status "User xray-socks5 already exists"
    fi
}

# Download and build application
install_application() {
    print_header "Downloading and building Socks5 Panel..."
    
    # Create installation directory
    mkdir -p $INSTALL_DIR
    cd /tmp
    
    # Download source code
    DOWNLOAD_URL="https://github.com/fahim8401/SockProxyManagerPanel/archive/refs/heads/MAIN.zip"
    print_status "Downloading from: $DOWNLOAD_URL"
    
    wget -O xray-socks5.zip "$DOWNLOAD_URL"
    unzip -o xray-socks5.zip
    cd SockProxyManagerPanel-MAIN
    
    print_status "Building production application..."
    
    # Install build dependencies
    npm install
    
    # Create TypeScript configuration for production
    cat > tsconfig.prod.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": false,
    "removeComments": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["shared/*"],
      "@server/*": ["server/*"]
    }
  },
  "include": [
    "server/**/*",
    "shared/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "client"
  ]
}
EOF
    
    # Compile TypeScript to JavaScript
    npx tsc --project tsconfig.prod.json
    
    # Create production package.json
    cat > dist/package.json << 'EOF'
{
  "name": "xray-socks5-management",
  "version": "2.0.0",
  "description": "Socks5 Panel - Professional SOCKS5 Proxy Management",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js"
  },
  "dependencies": {
    "better-sqlite3": "^9.2.2",
    "drizzle-orm": "^0.29.3",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "ws": "^8.14.2",
    "axios": "^1.6.5"
  }
}
EOF
    
    # Copy static files
    cp -r client/dist dist/client
    
    # Copy everything to installation directory
    cp -r dist/* $INSTALL_DIR/
    
    # Install production dependencies
    cd $INSTALL_DIR
    npm install --production
    
    # Set ownership
    chown -R xray-socks5:xray-socks5 $INSTALL_DIR
    
    print_status "Application built and installed"
}

# Configure systemd service
setup_service() {
    print_header "Setting up systemd service..."
    
    cat > /etc/systemd/system/xray-socks5.service << 'EOF'
[Unit]
Description=Socks5 Panel - Professional SOCKS5 Proxy Management
After=network.target

[Service]
Type=simple
User=xray-socks5
Group=xray-socks5
WorkingDirectory=/opt/xray-socks5
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=5000

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/xray-socks5

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable xray-socks5
    
    print_status "Systemd service configured"
}

# Configure Nginx
setup_nginx() {
    print_header "Configuring Nginx..."
    
    if [ -n "$DOMAIN" ]; then
        # Domain-based configuration
        cat > /etc/nginx/sites-available/xray-socks5 << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    location / {
        proxy_pass http://localhost:$WEB_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /ws {
        proxy_pass http://localhost:$WEB_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    else
        # IP-based configuration
        cat > /etc/nginx/sites-available/xray-socks5 << EOF
server {
    listen 80 default_server;
    
    location / {
        proxy_pass http://localhost:$WEB_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    location /ws {
        proxy_pass http://localhost:$WEB_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    fi
    
    # Enable site
    ln -sf /etc/nginx/sites-available/xray-socks5 /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and restart nginx
    nginx -t && systemctl restart nginx
    
    print_status "Nginx configured"
}

# Configure firewall
setup_firewall() {
    print_header "Configuring firewall..."
    
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow $SOCKS_PORT/tcp
    
    print_status "Firewall configured"
}

# Setup SSL certificate
setup_ssl() {
    if [ -n "$DOMAIN" ]; then
        print_header "Setting up SSL certificate..."
        
        certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
        
        print_status "SSL certificate installed"
    fi
}

# Start services
start_services() {
    print_header "Starting services..."
    
    systemctl start xray-socks5
    systemctl restart nginx
    
    # Wait for service to start
    sleep 5
    
    # Check status
    if systemctl is-active --quiet xray-socks5; then
        print_status "✅ Socks5 Panel started successfully"
    else
        print_error "❌ Failed to start Socks5 Panel"
        print_status "Checking logs:"
        journalctl -u xray-socks5 --no-pager -n 20
        exit 1
    fi
}

# Main installation process
main() {
    print_status "Starting complete Socks5 Panel installation..."
    
    check_root
    fix_nodejs
    install_dependencies
    create_user
    install_application
    setup_service
    setup_nginx
    setup_firewall
    setup_ssl
    start_services
    
    echo ""
    echo "🎉 Socks5 Panel Installation Completed Successfully!"
    echo "=================================================="
    
    if [ -n "$DOMAIN" ]; then
        echo "🌐 Web Interface: https://$DOMAIN"
    else
        echo "🌐 Web Interface: http://$(curl -s ifconfig.me):80"
    fi
    
    echo "🔗 SOCKS5 Proxy: $(curl -s ifconfig.me):$SOCKS_PORT"
    echo "🔑 Default Admin: admin / admin123"
    echo "🔑 Default SOCKS5 User: testuser / testpass"
    echo ""
    echo "📊 Service Status:"
    echo "   • Socks5 Panel: $(systemctl is-active xray-socks5)"
    echo "   • Nginx: $(systemctl is-active nginx)"
    echo "   • Firewall: $(ufw status | grep -c "Status: active")"
    echo ""
    echo "📱 Management Commands:"
    echo "   • Check status: systemctl status xray-socks5"
    echo "   • View logs: journalctl -u xray-socks5 -f"
    echo "   • Restart: systemctl restart xray-socks5"
    echo ""
    echo "Made by fasthostbd.cloud | © 2025 All Rights Reserved"
}

# Run main function
main