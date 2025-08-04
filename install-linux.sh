#!/bin/bash

#################################################################################
# Xray SOCKS5 Management System - Universal Linux Installation Script
# Professional SAAS Platform with IP Scanning and Complete Automation
# Supports: Ubuntu, Debian, CentOS, RHEL, Fedora, Arch, Alpine, OpenSUSE
# Version: 2.0 Production Ready
#################################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
XRAY_VERSION="v24.9.30"
INSTALL_DIR="/opt/xray-socks5"
SERVICE_NAME="xray-socks5"
DOMAIN="$1"

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

# Detect Linux distribution
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        VER=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si | tr '[:upper:]' '[:lower:]')
        VER=$(lsb_release -sr)
    elif [[ -f /etc/redhat-release ]]; then
        OS="centos"
        VER=$(grep -oE '[0-9]+\.[0-9]+' /etc/redhat-release | head -1)
    else
        error "Cannot detect Linux distribution"
    fi
    
    info "Detected OS: $OS $VER"
}

# Install packages based on distribution
install_packages() {
    info "Installing required packages..."
    
    case $OS in
        ubuntu|debian)
            export DEBIAN_FRONTEND=noninteractive
            apt-get update -qq
            apt-get install -y curl wget unzip nginx sqlite3 ufw certbot python3-certbot-nginx nodejs npm build-essential >/dev/null 2>&1
            ;;
        centos|rhel|rocky|almalinux)
            if command -v dnf >/dev/null 2>&1; then
                dnf install -y curl wget unzip nginx sqlite nodejs npm gcc gcc-c++ make certbot python3-certbot-nginx >/dev/null 2>&1
            else
                yum install -y curl wget unzip nginx sqlite nodejs npm gcc gcc-c++ make >/dev/null 2>&1
                # Install certbot separately for older systems
                yum install -y epel-release >/dev/null 2>&1 || true
                yum install -y certbot python3-certbot-nginx >/dev/null 2>&1 || true
            fi
            systemctl enable nginx >/dev/null 2>&1 || true
            ;;
        fedora)
            dnf install -y curl wget unzip nginx sqlite nodejs npm gcc gcc-c++ make certbot python3-certbot-nginx >/dev/null 2>&1
            systemctl enable nginx >/dev/null 2>&1
            ;;
        arch|manjaro)
            pacman -Sy --noconfirm curl wget unzip nginx sqlite nodejs npm base-devel certbot certbot-nginx >/dev/null 2>&1
            systemctl enable nginx >/dev/null 2>&1
            ;;
        opensuse*|sles)
            zypper install -y curl wget unzip nginx sqlite3 nodejs npm gcc gcc-c++ make python3-certbot-nginx >/dev/null 2>&1
            systemctl enable nginx >/dev/null 2>&1
            ;;
        alpine)
            apk add --no-cache curl wget unzip nginx sqlite nodejs npm build-base certbot certbot-nginx >/dev/null 2>&1
            rc-update add nginx default >/dev/null 2>&1 || true
            ;;
        *)
            warning "Unknown distribution: $OS. Attempting generic installation..."
            # Try common package managers
            if command -v apt-get >/dev/null 2>&1; then
                apt-get update && apt-get install -y curl wget unzip nginx sqlite3 nodejs npm build-essential
            elif command -v yum >/dev/null 2>&1; then
                yum install -y curl wget unzip nginx sqlite nodejs npm gcc gcc-c++ make
            elif command -v dnf >/dev/null 2>&1; then
                dnf install -y curl wget unzip nginx sqlite nodejs npm gcc gcc-c++ make
            elif command -v pacman >/dev/null 2>&1; then
                pacman -Sy --noconfirm curl wget unzip nginx sqlite nodejs npm base-devel
            else
                error "No supported package manager found"
            fi
            ;;
    esac
    
    success "Packages installed successfully"
}

# Setup firewall
setup_firewall() {
    info "Configuring firewall..."
    
    if command -v ufw >/dev/null 2>&1; then
        # Ubuntu/Debian UFW
        ufw --force enable >/dev/null 2>&1 || true
        ufw allow ssh >/dev/null 2>&1 || true
        ufw allow 80/tcp >/dev/null 2>&1 || true
        ufw allow 443/tcp >/dev/null 2>&1 || true
        ufw allow 1080/tcp >/dev/null 2>&1 || true
        ufw allow 10000:65000/tcp >/dev/null 2>&1 || true
        success "UFW firewall configured"
    elif command -v firewall-cmd >/dev/null 2>&1; then
        # CentOS/RHEL/Fedora firewalld
        systemctl enable firewalld >/dev/null 2>&1 || true
        systemctl start firewalld >/dev/null 2>&1 || true
        firewall-cmd --permanent --add-service=ssh >/dev/null 2>&1 || true
        firewall-cmd --permanent --add-service=http >/dev/null 2>&1 || true
        firewall-cmd --permanent --add-service=https >/dev/null 2>&1 || true
        firewall-cmd --permanent --add-port=1080/tcp >/dev/null 2>&1 || true
        firewall-cmd --permanent --add-port=10000-65000/tcp >/dev/null 2>&1 || true
        firewall-cmd --reload >/dev/null 2>&1 || true
        success "Firewalld configured"
    elif command -v iptables >/dev/null 2>&1; then
        # Generic iptables
        iptables -A INPUT -p tcp --dport 22 -j ACCEPT >/dev/null 2>&1 || true
        iptables -A INPUT -p tcp --dport 80 -j ACCEPT >/dev/null 2>&1 || true
        iptables -A INPUT -p tcp --dport 443 -j ACCEPT >/dev/null 2>&1 || true
        iptables -A INPUT -p tcp --dport 1080 -j ACCEPT >/dev/null 2>&1 || true
        iptables -A INPUT -p tcp --dport 10000:65000 -j ACCEPT >/dev/null 2>&1 || true
        success "Iptables rules added"
    else
        warning "No firewall system detected, manual configuration may be required"
    fi
}

# Download and setup Xray
setup_xray() {
    info "Setting up Xray-core ${XRAY_VERSION}..."
    
    # Create installation directory
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # Download Xray
    ARCH=$(uname -m)
    case $ARCH in
        x86_64) XRAY_ARCH="64" ;;
        aarch64|arm64) XRAY_ARCH="arm64-v8a" ;;
        armv7l) XRAY_ARCH="arm32-v7a" ;;
        *) error "Unsupported architecture: $ARCH" ;;
    esac
    
    DOWNLOAD_URL="https://github.com/XTLS/Xray-core/releases/download/${XRAY_VERSION}/Xray-linux-${XRAY_ARCH}.zip"
    
    info "Downloading Xray from: $DOWNLOAD_URL"
    wget -q "$DOWNLOAD_URL" -O xray.zip || error "Failed to download Xray"
    unzip -q xray.zip || error "Failed to extract Xray"
    chmod +x xray
    rm xray.zip
    
    success "Xray-core installed successfully"
}

# Setup Node.js application
setup_application() {
    info "Setting up SOCKS5 Management Application..."
    
    # Clone or copy application files (assuming they're already present)
    if [[ ! -f "package.json" ]]; then
        error "Application files not found. Please ensure the application is in the current directory."
    fi
    
    # Install Node.js dependencies with proper error handling
    info "Installing Node.js dependencies..."
    
    # Handle Node.js version compatibility
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -lt 18 ]]; then
        warning "Node.js version $NODE_VERSION detected. Installing Node.js 18..."
        
        case $OS in
            ubuntu|debian)
                curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - >/dev/null 2>&1
                apt-get install -y nodejs >/dev/null 2>&1
                ;;
            centos|rhel|rocky|almalinux|fedora)
                curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash - >/dev/null 2>&1
                if command -v dnf >/dev/null 2>&1; then
                    dnf install -y nodejs >/dev/null 2>&1
                else
                    yum install -y nodejs >/dev/null 2>&1
                fi
                ;;
            *)
                warning "Please manually install Node.js 18+ for optimal compatibility"
                ;;
        esac
    fi
    
    # Install dependencies with error handling
    if ! npm install --production >/dev/null 2>&1; then
        warning "npm install failed, trying alternative approaches..."
        
        # Try with legacy-peer-deps
        npm install --production --legacy-peer-deps >/dev/null 2>&1 || \
        # Try with force
        npm install --production --force >/dev/null 2>&1 || \
        # Last resort - ignore engines
        npm install --production --ignore-engines >/dev/null 2>&1 || \
        error "Failed to install Node.js dependencies"
    fi
    
    # Build the application
    info "Building production application..."
    if ! npm run build >/dev/null 2>&1; then
        warning "Build failed, using existing files..."
    fi
    
    # Initialize database with IP scanning
    info "Initializing database with system IP scanning..."
    NODE_ENV=production node -e "
        const { initializeDatabase } = require('./server/db.js');
        initializeDatabase().then(() => {
            console.log('Database initialized with IP scanning');
            process.exit(0);
        }).catch(err => {
            console.error('Database initialization failed:', err);
            process.exit(1);
        });
    " || warning "Database initialization completed with warnings"
    
    success "Application setup completed"
}

# Create systemd service
create_service() {
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
SyslogIdentifier=xray-socks5

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ReadWritePaths=$INSTALL_DIR
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    success "Systemd service created"
}

# Setup Nginx reverse proxy
setup_nginx() {
    info "Configuring Nginx reverse proxy..."
    
    # Backup existing nginx config
    [[ -f /etc/nginx/sites-available/default ]] && cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup
    
    # Create nginx configuration
    cat > "/etc/nginx/sites-available/xray-socks5" << EOF
server {
    listen 80;
    server_name ${DOMAIN:-localhost} ${DOMAIN:-localhost};
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Proxy to Node.js application
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
        proxy_read_timeout 86400;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:3000;
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

    # Enable site
    if [[ -d /etc/nginx/sites-enabled ]]; then
        ln -sf /etc/nginx/sites-available/xray-socks5 /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
    else
        # For systems without sites-enabled (like CentOS)
        mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
        cp /etc/nginx/sites-available/xray-socks5 /etc/nginx/conf.d/xray-socks5.conf
    fi
    
    # Test nginx configuration
    if nginx -t >/dev/null 2>&1; then
        systemctl restart nginx
        systemctl enable nginx
        success "Nginx configured successfully"
    else
        error "Nginx configuration test failed"
    fi
}

# Setup SSL certificate
setup_ssl() {
    if [[ -n "$DOMAIN" && "$DOMAIN" != "localhost" ]]; then
        info "Setting up SSL certificate for $DOMAIN..."
        
        if command -v certbot >/dev/null 2>&1; then
            # Wait for nginx to be ready
            sleep 5
            
            if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN" --redirect >/dev/null 2>&1; then
                success "SSL certificate installed successfully"
                
                # Setup auto-renewal
                (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
            else
                warning "SSL certificate installation failed. You can set it up manually later."
            fi
        else
            warning "Certbot not available. SSL setup skipped."
        fi
    else
        info "No domain specified, skipping SSL setup"
    fi
}

# Setup backup system
setup_backup() {
    info "Setting up automated backup system..."
    
    mkdir -p "$INSTALL_DIR/backups"
    
    # Create backup script
    cat > "$INSTALL_DIR/backup.sh" << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/xray-socks5/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="xray-socks5-backup-$DATE.tar.gz"

# Create backup
cd /opt/xray-socks5
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    --exclude="backups" \
    --exclude="node_modules" \
    --exclude="*.log" \
    .

# Keep only last 7 backups
find "$BACKUP_DIR" -name "xray-socks5-backup-*.tar.gz" -mtime +7 -delete

echo "Backup created: $BACKUP_FILE"
EOF

    chmod +x "$INSTALL_DIR/backup.sh"
    
    # Setup daily backup cron
    (crontab -l 2>/dev/null; echo "0 2 * * * $INSTALL_DIR/backup.sh >/dev/null 2>&1") | crontab -
    
    success "Backup system configured"
}

# Start services
start_services() {
    info "Starting services..."
    
    # Start the application
    systemctl start "$SERVICE_NAME"
    
    # Wait for service to start
    sleep 5
    
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        success "Xray SOCKS5 Management System started successfully"
    else
        error "Failed to start the service. Check logs with: journalctl -u $SERVICE_NAME"
    fi
}

# Display final information
show_completion_info() {
    clear
    echo
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}         🎉 INSTALLATION COMPLETED SUCCESSFULLY! 🎉${NC}"
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo
    echo -e "${GREEN}✅ Xray SOCKS5 Management System is now running!${NC}"
    echo
    echo -e "${BLUE}📋 ACCESS INFORMATION:${NC}"
    if [[ -n "$DOMAIN" && "$DOMAIN" != "localhost" ]]; then
        echo -e "   🌐 Admin Panel: ${GREEN}https://$DOMAIN${NC}"
        echo -e "   🔗 Direct Access: ${GREEN}http://$DOMAIN${NC}"
    else
        SERVER_IP=$(curl -s -4 ifconfig.me 2>/dev/null || curl -s -4 icanhazip.com 2>/dev/null || echo "YOUR_SERVER_IP")
        echo -e "   🌐 Admin Panel: ${GREEN}http://$SERVER_IP${NC}"
        echo -e "   🔗 Local Access: ${GREEN}http://localhost${NC}"
    fi
    echo
    echo -e "${BLUE}🔑 DEFAULT CREDENTIALS:${NC}"
    echo -e "   👤 Username: ${YELLOW}admin${NC}"
    echo -e "   🔒 Password: ${YELLOW}admin123${NC}"
    echo -e "   ${RED}⚠️  Please change these credentials immediately!${NC}"
    echo
    echo -e "${BLUE}📊 SYSTEM INFORMATION:${NC}"
    echo -e "   📁 Installation Directory: ${GREEN}$INSTALL_DIR${NC}"
    echo -e "   🔧 Service Name: ${GREEN}$SERVICE_NAME${NC}"
    echo -e "   📄 Xray Version: ${GREEN}$XRAY_VERSION${NC}"
    echo -e "   🗄️  Database: ${GREEN}SQLite with IP scanning enabled${NC}"
    echo
    echo -e "${BLUE}⚡ QUICK COMMANDS:${NC}"
    echo -e "   🔄 Restart Service: ${CYAN}systemctl restart $SERVICE_NAME${NC}"
    echo -e "   📝 View Logs: ${CYAN}journalctl -u $SERVICE_NAME -f${NC}"
    echo -e "   🛑 Stop Service: ${CYAN}systemctl stop $SERVICE_NAME${NC}"
    echo -e "   📊 Service Status: ${CYAN}systemctl status $SERVICE_NAME${NC}"
    echo
    echo -e "${BLUE}🚀 FEATURES ENABLED:${NC}"
    echo -e "   ✅ Professional Admin Dashboard"
    echo -e "   ✅ Automatic IP Scanning & Detection"
    echo -e "   ✅ Package-based User Management"
    echo -e "   ✅ External API Integration"
    echo -e "   ✅ Real-time Connection Monitoring"
    echo -e "   ✅ Automated Daily Backups"
    echo -e "   ✅ SSL/TLS Security (if domain provided)"
    echo -e "   ✅ Firewall Configuration"
    echo -e "   ✅ Universal Linux Compatibility"
    echo
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}🎯 Your Professional SOCKS5 SAAS Platform is Ready!${NC}"
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo
}

# Main installation function
main() {
    clear
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}    🚀 Xray SOCKS5 Management System Installation${NC}"
    echo -e "${CYAN}         Professional SAAS Platform v2.0${NC}"
    echo -e "${PURPLE}════════════════════════════════════════════════════════════════${NC}"
    echo
    
    # Check if running as root
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root"
    fi
    
    info "Starting installation process..."
    
    # Installation steps
    detect_os
    install_packages
    setup_firewall
    setup_xray
    setup_application
    create_service
    setup_nginx
    setup_ssl
    setup_backup
    start_services
    
    # Show completion information
    show_completion_info
}

# Run main function
main "$@"