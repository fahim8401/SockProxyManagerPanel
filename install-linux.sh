#!/bin/bash

# Socks5 Panel - Complete Production Installation Script
# Universal Linux installation with dependency fixes and production deployment
# Compatible with all major Linux distributions - Version: 2.0

set -e

echo "🚀 Complete Socks5 Panel Installation & Deployment"
echo "=================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
INSTALL_DIR="/opt/xray-socks5"
SERVICE_NAME="xray-socks5"
WEB_PORT=${WEB_PORT:-5000}
SOCKS_PORT=${SOCKS_PORT:-1080}
DOMAIN=${DOMAIN:-""}

# Function to print colored output
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

# Function to detect Linux distribution
detect_distro() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        DISTRO=$ID
        VERSION=$VERSION_ID
    elif [ -f /etc/redhat-release ]; then
        DISTRO="centos"
    elif [ -f /etc/debian_version ]; then
        DISTRO="debian"
    else
        DISTRO="unknown"
    fi
    
    print_status "Detected Linux distribution: $DISTRO $VERSION"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_status "Running as root user"
    else
        print_error "This script must be run as root or with sudo"
        print_status "Please run: sudo $0"
        exit 1
    fi
}

# Function to fix Node.js dependency issues (Ubuntu/Debian specific)
fix_nodejs_dependencies() {
    if [[ "$DISTRO" == "ubuntu" || "$DISTRO" == "debian" ]]; then
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
    fi
}

# Function to install dependencies based on distribution
install_dependencies() {
    print_header "Installing system dependencies"
    
    case $DISTRO in
        "ubuntu"|"debian")
            apt update
            # First fix Node.js dependencies
            fix_nodejs_dependencies
            # Then install other packages
            apt install -y curl wget unzip git nginx ufw certbot python3-certbot-nginx build-essential
            ;;
        "centos"|"rhel"|"rocky"|"almalinux")
            yum update -y || dnf update -y
            yum install -y curl wget unzip git nodejs npm nginx firewalld certbot python3-certbot-nginx gcc gcc-c++ make || \
            dnf install -y curl wget unzip git nodejs npm nginx firewalld certbot python3-certbot-nginx gcc gcc-c++ make
            ;;
        "fedora")
            dnf update -y
            dnf install -y curl wget unzip git nodejs npm nginx firewalld certbot python3-certbot-nginx gcc gcc-c++ make
            ;;
        "arch"|"manjaro")
            pacman -Syu --noconfirm
            pacman -S --noconfirm curl wget unzip git nodejs npm nginx ufw certbot certbot-nginx base-devel
            ;;
        "opensuse"|"sles")
            zypper update -y
            zypper install -y curl wget unzip git nodejs npm nginx ufw certbot python3-certbot-nginx gcc gcc-c++ make
            ;;
        "alpine")
            apk update
            apk add curl wget unzip git nodejs npm nginx ufw certbot certbot-nginx build-base
            ;;
        *)
            print_warning "Unknown distribution. Attempting generic package installation..."
            # Try common package managers
            if command -v apt &> /dev/null; then
                apt update && fix_nodejs_dependencies && apt install -y curl wget unzip git nginx ufw certbot python3-certbot-nginx build-essential
            elif command -v yum &> /dev/null; then
                yum install -y curl wget unzip git nodejs npm nginx firewalld certbot python3-certbot-nginx gcc gcc-c++ make
            elif command -v dnf &> /dev/null; then
                dnf install -y curl wget unzip git nodejs npm nginx firewalld certbot python3-certbot-nginx gcc gcc-c++ make
            elif command -v pacman &> /dev/null; then
                pacman -S --noconfirm curl wget unzip git nodejs npm nginx ufw certbot certbot-nginx base-devel
            else
                print_error "Unable to detect package manager. Please install dependencies manually:"
                print_error "curl, wget, unzip, git, nodejs, npm, nginx, firewall, certbot"
                exit 1
            fi
            ;;
    esac
    
    print_status "System dependencies installed successfully"
}

# Function to create application user
create_app_user() {
    print_header "Creating application user"
    
    if ! id "xray-socks5" &>/dev/null; then
        useradd -r -s /bin/false -d $INSTALL_DIR xray-socks5
        print_status "Created user: xray-socks5"
    else
        print_status "User xray-socks5 already exists"
    fi
}

# Function to download and build application for production
download_and_build_application() {
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
    
    print_status "Application built and installed successfully"
}

# Function to configure firewall
configure_firewall() {
    print_header "Configuring firewall"
    
    case $DISTRO in
        "ubuntu"|"debian"|"arch"|"manjaro")
            if command -v ufw &> /dev/null; then
                ufw --force enable
                ufw allow ssh
                ufw allow $WEB_PORT
                ufw allow $SOCKS_PORT
                ufw allow 80
                ufw allow 443
                print_status "UFW firewall configured"
            fi
            ;;
        "centos"|"rhel"|"rocky"|"almalinux"|"fedora")
            if command -v firewall-cmd &> /dev/null; then
                systemctl enable firewalld
                systemctl start firewalld
                firewall-cmd --permanent --add-service=ssh
                firewall-cmd --permanent --add-port=$WEB_PORT/tcp
                firewall-cmd --permanent --add-port=$SOCKS_PORT/tcp
                firewall-cmd --permanent --add-service=http
                firewall-cmd --permanent --add-service=https
                firewall-cmd --reload
                print_status "Firewalld configured"
            fi
            ;;
        *)
            print_warning "Please configure firewall manually to allow ports: $WEB_PORT, $SOCKS_PORT, 80, 443"
            ;;
    esac
}

# Function to create systemd service
create_systemd_service() {
    print_header "Creating systemd service"
    
    cat > /etc/systemd/system/$SERVICE_NAME.service << 'EOF'
[Unit]
Description=Socks5 Panel - Professional SOCKS5 Proxy Management
Documentation=https://github.com/fahim8401/SockProxyManagerPanel
After=network.target

[Service]
Type=simple
User=xray-socks5
Group=xray-socks5
WorkingDirectory=$INSTALL_DIR
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=WEB_PORT=$WEB_PORT
Environment=SOCKS_PORT=$SOCKS_PORT

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$INSTALL_DIR

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    
    print_status "Systemd service created and enabled"
}

# Function to configure Nginx reverse proxy
configure_nginx() {
    print_header "Configuring Nginx reverse proxy"
    
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
    if [ -d "/etc/nginx/sites-enabled" ]; then
        ln -sf /etc/nginx/sites-available/xray-socks5 /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
    fi
    
    # Test and restart nginx
    nginx -t && systemctl restart nginx || print_warning "Nginx configuration may need manual adjustment"
    
    print_status "Nginx reverse proxy configured"
}

# Function to setup SSL certificate
setup_ssl() {
    if [ -n "$DOMAIN" ] && command -v certbot &> /dev/null; then
        print_header "Setting up SSL certificate"
        
        certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect || \
        print_warning "SSL setup failed. You can configure it manually later with: certbot --nginx -d $DOMAIN"
        
        print_status "SSL certificate setup attempted"
    fi
}

# Function to create backup script
create_backup_script() {
    print_header "Creating backup script"
    
    cat > $INSTALL_DIR/backup.sh << 'EOF'
#!/bin/bash
# Automated backup script for Socks5 Panel

BACKUP_DIR="/opt/xray-socks5/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="socks5_panel_backup_$DATE.tar.gz"

mkdir -p $BACKUP_DIR

# Create backup
tar -czf $BACKUP_DIR/$BACKUP_FILE \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='backups' \
    /opt/xray-socks5/

# Keep only last 7 backups
cd $BACKUP_DIR
ls -t *.tar.gz | tail -n +8 | xargs -r rm

echo "Backup created: $BACKUP_FILE"
EOF
    
    chmod +x $INSTALL_DIR/backup.sh
    chown xray-socks5:xray-socks5 $INSTALL_DIR/backup.sh
    
    # Add to crontab for daily backups
    (crontab -l 2>/dev/null; echo "0 2 * * * $INSTALL_DIR/backup.sh") | crontab -
    
    print_status "Backup script created and scheduled"
}

# Function to start services
start_services() {
    print_header "Starting services"
    
    systemctl start $SERVICE_NAME
    systemctl restart nginx
    
    # Wait for service to start
    sleep 10
    
    # Check status
    if systemctl is-active --quiet $SERVICE_NAME; then
        print_status "✅ Socks5 Panel started successfully"
    else
        print_error "❌ Failed to start Socks5 Panel"
        print_status "Checking logs:"
        journalctl -u $SERVICE_NAME --no-pager -n 20
        exit 1
    fi
    
    print_status "All services started"
}

# Function to display completion message
show_completion_message() {
    clear
    echo ""
    echo "🎉 Socks5 Panel Installation Completed Successfully!"
    echo "=================================================="
    echo ""
    
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    if [ -n "$DOMAIN" ]; then
        echo "🌐 Web Interface: https://$DOMAIN"
        echo "🌐 Fallback Access: http://$SERVER_IP"
    else
        echo "🌐 Web Interface: http://$SERVER_IP"
    fi
    
    echo "🔗 SOCKS5 Proxy: $SERVER_IP:$SOCKS_PORT"
    echo "🔑 Default Admin: admin / admin123"
    echo "🔑 Default SOCKS5 User: testuser / testpass"
    echo ""
    
    echo "📊 Service Status:"
    echo "   • Socks5 Panel: $(systemctl is-active $SERVICE_NAME)"
    echo "   • Nginx: $(systemctl is-active nginx)"
    echo "   • Firewall: Active"
    echo ""
    
    echo "📱 Management Commands:"
    echo "   • Check status: systemctl status $SERVICE_NAME"
    echo "   • View logs: journalctl -u $SERVICE_NAME -f"
    echo "   • Restart: systemctl restart $SERVICE_NAME"
    echo "   • Create backup: $INSTALL_DIR/backup.sh"
    echo ""
    
    echo "🔧 Configuration Files:"
    echo "   • Service: /etc/systemd/system/$SERVICE_NAME.service"
    echo "   • Nginx: /etc/nginx/sites-available/xray-socks5"
    echo "   • Application: $INSTALL_DIR"
    echo ""
    
    echo "🏢 Professional SAAS Platform Features:"
    echo "   • User Management with Package Plans"
    echo "   • IP Pool Selection & Assignment"
    echo "   • Real-time Monitoring & Analytics"
    echo "   • External API with Authentication"
    echo "   • Automated Backups & SSL Support"
    echo ""
    
    echo "Made by fasthostbd.cloud | © 2025 All Rights Reserved"
    echo "=================================================="
}

# Main installation function
main() {
    print_status "Starting complete Socks5 Panel installation..."
    
    check_root
    detect_distro
    install_dependencies
    create_app_user
    download_and_build_application
    create_systemd_service
    configure_firewall
    configure_nginx
    setup_ssl
    create_backup_script
    start_services
    show_completion_message
}

# Run main function
main "$@"

# Function to setup SSL (optional)
setup_ssl() {
    if [ -n "$DOMAIN" ]; then
        print_header "Setting up SSL certificate for $DOMAIN"
        
        # Check if domain resolves to this server
        DOMAIN_IP=$(dig +short $DOMAIN)
        SERVER_IP=$(curl -s ipinfo.io/ip)
        
        if [ "$DOMAIN_IP" = "$SERVER_IP" ]; then
            certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN
            print_status "SSL certificate installed for $DOMAIN"
        else
            print_warning "Domain $DOMAIN does not resolve to this server ($SERVER_IP)"
            print_warning "Please update DNS records and run: certbot --nginx -d $DOMAIN"
        fi
    else
        print_status "No domain specified, skipping SSL setup"
        print_status "To add SSL later, run: certbot --nginx -d yourdomain.com"
    fi
}

# Function to start services
start_services() {
    print_header "Starting services"
    
    systemctl start $SERVICE_NAME
    sleep 3
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        print_status "Xray SOCKS5 Management System started successfully"
    else
        print_error "Failed to start service. Check logs: journalctl -u $SERVICE_NAME"
        exit 1
    fi
}

# Function to create backup script
create_backup_script() {
    print_header "Creating backup script"
    
    cat > /usr/local/bin/xray-socks5-backup << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/xray-socks5-backups"
DATE=$(date +%Y%m%d_%H%M%S)
INSTALL_DIR="/opt/xray-socks5"

mkdir -p $BACKUP_DIR
cd $INSTALL_DIR

# Backup database and configuration
tar -czf $BACKUP_DIR/xray-socks5-backup-$DATE.tar.gz *.db *.json 2>/dev/null || true

# Keep only last 7 backups
ls -t $BACKUP_DIR/xray-socks5-backup-*.tar.gz | tail -n +8 | xargs rm -f 2>/dev/null || true

echo "Backup completed: $BACKUP_DIR/xray-socks5-backup-$DATE.tar.gz"
EOF

    chmod +x /usr/local/bin/xray-socks5-backup
    
    # Create daily backup cron job
    echo "0 2 * * * root /usr/local/bin/xray-socks5-backup" > /etc/cron.d/xray-socks5-backup
    
    print_status "Backup script created at /usr/local/bin/xray-socks5-backup"
}

# Function to display installation summary
display_summary() {
    echo ""
    echo "======================================================"
    echo -e "${GREEN}🎉 Installation completed successfully!${NC}"
    echo "======================================================"
    echo ""
    echo -e "${BLUE}📋 System Information:${NC}"
    echo "• Installation Directory: $INSTALL_DIR"
    echo "• Service Name: $SERVICE_NAME"
    echo "• Web Interface Port: $WEB_PORT"
    echo "• SOCKS5 Proxy Port: $SOCKS_PORT"
    echo ""
    echo -e "${BLUE}🌐 Access Information:${NC}"
    if [ -n "$DOMAIN" ]; then
        echo "• Web Interface: https://$DOMAIN"
        echo "• Admin Panel: https://$DOMAIN/admin"
    else
        echo "• Web Interface: http://$(curl -s ipinfo.io/ip):$WEB_PORT"
        echo "• Admin Panel: http://$(curl -s ipinfo.io/ip):$WEB_PORT/admin"
    fi
    echo "• SOCKS5 Proxy: $(curl -s ipinfo.io/ip):$SOCKS_PORT"
    echo ""
    echo -e "${BLUE}🔑 Default Credentials:${NC}"
    echo "• Admin Login: admin / admin123"
    echo "• Test SOCKS5 User: testuser / testpass"
    echo ""
    echo -e "${BLUE}🛠️ Service Management:${NC}"
    echo "• Start: systemctl start $SERVICE_NAME"
    echo "• Stop: systemctl stop $SERVICE_NAME"
    echo "• Restart: systemctl restart $SERVICE_NAME"
    echo "• Status: systemctl status $SERVICE_NAME"
    echo "• Logs: journalctl -u $SERVICE_NAME -f"
    echo ""
    echo -e "${BLUE}💾 Backup:${NC}"
    echo "• Manual Backup: /usr/local/bin/xray-socks5-backup"
    echo "• Automatic Backup: Daily at 2:00 AM"
    echo ""
    echo -e "${YELLOW}⚠️ Important Security Notes:${NC}"
    echo "• Change default admin password immediately"
    echo "• Configure firewall rules for your network"
    echo "• Set up monitoring and log rotation"
    echo "• Regular security updates recommended"
    echo ""
    echo -e "${GREEN}✅ Ready for production use!${NC}"
    echo "======================================================"
}

# Main installation process
main() {
    clear
    echo "🚀 Xray SOCKS5 Management System - Universal Linux Installer"
    echo "============================================================"
    echo ""
    
    # Check if domain is provided as argument
    if [ -n "$1" ]; then
        DOMAIN="$1"
        print_status "Domain provided: $DOMAIN"
    fi
    
    # Pre-installation checks
    check_root
    detect_distro
    
    # Installation steps
    install_dependencies
    create_app_user
    download_application
    install_app_dependencies
    configure_firewall
    create_systemd_service
    configure_nginx
    setup_ssl
    start_services
    create_backup_script
    
    # Installation complete
    display_summary
    
    print_status "Installation completed successfully!"
    print_status "Please reboot the system to ensure all services start correctly."
}

# Run main function with all arguments
main "$@"