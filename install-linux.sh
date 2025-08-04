#!/bin/bash

# Xray SOCKS5 Management System - Universal Linux Installation
# Compatible with all major Linux distributions
# Version: 2.0 - Production Ready SAAS Platform

set -e

echo "🚀 Installing Xray SOCKS5 Management System for Linux"
echo "======================================================"

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

# Function to install dependencies based on distribution
install_dependencies() {
    print_header "Installing system dependencies"
    
    case $DISTRO in
        "ubuntu"|"debian")
            apt update
            apt install -y curl wget unzip git nodejs npm nginx ufw certbot python3-certbot-nginx
            ;;
        "centos"|"rhel"|"rocky"|"almalinux")
            yum update -y || dnf update -y
            yum install -y curl wget unzip git nodejs npm nginx firewalld certbot python3-certbot-nginx || \
            dnf install -y curl wget unzip git nodejs npm nginx firewalld certbot python3-certbot-nginx
            ;;
        "fedora")
            dnf update -y
            dnf install -y curl wget unzip git nodejs npm nginx firewalld certbot python3-certbot-nginx
            ;;
        "arch"|"manjaro")
            pacman -Syu --noconfirm
            pacman -S --noconfirm curl wget unzip git nodejs npm nginx ufw certbot certbot-nginx
            ;;
        "opensuse"|"sles")
            zypper update -y
            zypper install -y curl wget unzip git nodejs npm nginx ufw certbot python3-certbot-nginx
            ;;
        "alpine")
            apk update
            apk add curl wget unzip git nodejs npm nginx ufw certbot certbot-nginx
            ;;
        *)
            print_warning "Unknown distribution. Attempting generic package installation..."
            # Try common package managers
            if command -v apt &> /dev/null; then
                apt update && apt install -y curl wget unzip git nodejs npm nginx ufw certbot python3-certbot-nginx
            elif command -v yum &> /dev/null; then
                yum install -y curl wget unzip git nodejs npm nginx firewalld certbot python3-certbot-nginx
            elif command -v dnf &> /dev/null; then
                dnf install -y curl wget unzip git nodejs npm nginx firewalld certbot python3-certbot-nginx
            elif command -v pacman &> /dev/null; then
                pacman -S --noconfirm curl wget unzip git nodejs npm nginx ufw certbot certbot-nginx
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

# Function to download and setup application
download_application() {
    print_header "Downloading Xray SOCKS5 Management System"
    
    # Create installation directory
    mkdir -p $INSTALL_DIR
    cd /tmp
    
    # Download from GitHub
    DOWNLOAD_URL="https://github.com/fahim8401/SockProxyManagerPanel/archive/refs/heads/MAIN.zip"
    print_status "Downloading from: $DOWNLOAD_URL"
    
    wget -O xray-socks5.zip "$DOWNLOAD_URL"
    unzip -o xray-socks5.zip
    
    # Copy files to installation directory
    cp -r SockProxyManagerPanel-MAIN/* $INSTALL_DIR/
    
    # Set ownership
    chown -R xray-socks5:xray-socks5 $INSTALL_DIR
    
    print_status "Application files downloaded and extracted"
}

# Function to install Node.js dependencies
install_app_dependencies() {
    print_header "Installing application dependencies"
    
    cd $INSTALL_DIR
    
    # Install npm dependencies as the app user
    sudo -u xray-socks5 npm install --production
    
    print_status "Application dependencies installed"
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
    
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=Xray SOCKS5 Management System
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

# Function to configure Nginx
configure_nginx() {
    print_header "Configuring Nginx reverse proxy"
    
    cat > /etc/nginx/sites-available/xray-socks5 << EOF
server {
    listen 80;
    server_name ${DOMAIN:-localhost};

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

    # WebSocket support
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

    # Enable the site
    if [ -d "/etc/nginx/sites-enabled" ]; then
        ln -sf /etc/nginx/sites-available/xray-socks5 /etc/nginx/sites-enabled/
        rm -f /etc/nginx/sites-enabled/default
    else
        # For distributions that don't use sites-available/sites-enabled
        mv /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
        cat > /etc/nginx/nginx.conf << EOF
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    include /etc/nginx/sites-available/xray-socks5;
}
EOF
    fi
    
    # Test Nginx configuration
    nginx -t
    systemctl enable nginx
    systemctl restart nginx
    
    print_status "Nginx configured and restarted"
}

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