#!/bin/bash

#################################################################################
# Universal Installer - Xray SOCKS5 Management System (Robust for All Linux)
#################################################################################

set -euo pipefail
trap 'echo "[ERROR] Installation failed at line $LINENO"; exit 1' ERR

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
INSTALL_DIR="/opt/xray-socks5"
SERVICE_NAME="xray-socks5"
DOMAIN="${1:-localhost}"

# Helper functions
info() { echo -e "${BLUE}[INFO] $1${NC}"; }
success() { echo -e "${GREEN}[SUCCESS] $1${NC}"; }
error() { echo -e "${RED}[ERROR] $1${NC}"; exit 1; }
warning() { echo -e "${YELLOW}[WARNING] $1${NC}"; }

# Check root
if [[ $EUID -ne 0 ]]; then error "This script must be run as root (use sudo)"; fi

# Check required commands
for cmd in curl wget tar grep awk sed uname; do
    command -v $cmd >/dev/null 2>&1 || error "$cmd is required but not installed."
done

# Detect OS and package manager
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID=$ID
    OS_NAME=$NAME
else
    error "Cannot detect Linux distribution."
fi

if command -v apt-get >/dev/null 2>&1; then
    PM="apt-get"
    UPDATE_CMD="apt-get update -y"
    INSTALL_CMD="apt-get install -y"
elif command -v yum >/dev/null 2>&1; then
    PM="yum"
    UPDATE_CMD="yum makecache"
    INSTALL_CMD="yum install -y"
elif command -v dnf >/dev/null 2>&1; then
    PM="dnf"
    UPDATE_CMD="dnf makecache"
    INSTALL_CMD="dnf install -y"
elif command -v zypper >/dev/null 2>&1; then
    PM="zypper"
    UPDATE_CMD="zypper refresh"
    INSTALL_CMD="zypper install -y"
else
    error "No supported package manager found (apt, yum, dnf, zypper)."
fi

info "Detected OS: $OS_NAME ($OS_ID)"
info "Using package manager: $PM"

# Update and install dependencies
info "Updating package lists..."
$UPDATE_CMD || warning "Package update failed, continuing..."

PKGS_COMMON="curl wget unzip sqlite3 tar"
PKGS_DEBIAN="software-properties-common build-essential apache2 ufw"
PKGS_REDHAT="httpd firewalld gcc-c++ make"

if [[ $PM == "apt-get" ]]; then
    $INSTALL_CMD $PKGS_COMMON $PKGS_DEBIAN
elif [[ $PM == "yum" || $PM == "dnf" ]]; then
    $INSTALL_CMD $PKGS_COMMON $PKGS_REDHAT
    systemctl enable firewalld || true
    systemctl start firewalld || true
elif [[ $PM == "zypper" ]]; then
    $INSTALL_CMD $PKGS_COMMON apache2 gcc-c++ make
fi

# Install Node.js (universal)
info "Installing Node.js..."
if ! command -v node >/dev/null 2>&1; then
    if [[ $PM == "apt-get" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        $INSTALL_CMD nodejs
    elif [[ $PM == "yum" || $PM == "dnf" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        $INSTALL_CMD nodejs
    elif [[ $PM == "zypper" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
        $INSTALL_CMD nodejs
    else
        error "Automatic Node.js installation not supported for this OS. Please install Node.js 18+ manually."
    fi
fi

node_version=$(node --version 2>/dev/null || echo "not found")
info "Node.js version: $node_version"

# Create installation directory
info "Creating installation directory..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# Copy or generate server files (user must provide or git clone)
if [ ! -f server/index.js ]; then
    error "server/index.js not found. Please copy your application files to $INSTALL_DIR/server before running this script."
fi

# Install Node.js dependencies
info "Installing dependencies..."
if ! npm install 2>/dev/null; then
    warning "Standard npm install failed, trying alternatives..."
    npm install --legacy-peer-deps || npm install --force || error "Failed to install dependencies"
fi
success "Dependencies installed successfully"

# Create systemd service (if available)
if command -v systemctl >/dev/null 2>&1; then
    info "Creating systemd service..."
    cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=Xray SOCKS5 Management System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=$(command -v node) server/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
fi

# Setup web server (Apache or httpd)
if command -v apache2 >/dev/null 2>&1; then
    info "Configuring Apache2..."
    a2enmod proxy proxy_http proxy_wstunnel headers rewrite >/dev/null 2>&1 || true
    echo "ServerName localhost" >> /etc/apache2/apache2.conf
    cat > "/etc/apache2/sites-available/xray-socks5.conf" << EOF
<VirtualHost *:80>
    ServerName ${DOMAIN:-localhost}
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
    ErrorLog \\${APACHE_LOG_DIR}/xray-socks5_error.log
    CustomLog \\${APACHE_LOG_DIR}/xray-socks5_access.log combined
</VirtualHost>
EOF
    a2ensite xray-socks5.conf >/dev/null 2>&1
    a2dissite 000-default.conf >/dev/null 2>&1
    systemctl restart apache2
elif command -v httpd >/dev/null 2>&1; then
    info "Configuring httpd..."
    cat > /etc/httpd/conf.d/xray-socks5.conf << EOF
<VirtualHost *:80>
    ServerName ${DOMAIN:-localhost}
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
    ErrorLog logs/xray-socks5_error.log
    CustomLog logs/xray-socks5_access.log combined
</VirtualHost>
EOF
    systemctl restart httpd
else
    warning "No supported web server found (apache2 or httpd). Please configure your reverse proxy manually."
fi

# Setup firewall (if available)
if command -v ufw >/dev/null 2>&1; then
    info "Configuring UFW firewall..."
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 1080/tcp
    ufw allow 3000/tcp
    success "UFW firewall configured."
elif command -v firewall-cmd >/dev/null 2>&1; then
    info "Configuring firewalld..."
    firewall-cmd --permanent --add-port=22/tcp || true
    firewall-cmd --permanent --add-port=80/tcp || true
    firewall-cmd --permanent --add-port=443/tcp || true
    firewall-cmd --permanent --add-port=1080/tcp || true
    firewall-cmd --permanent --add-port=3000/tcp || true
    firewall-cmd --reload || true
    success "firewalld configured."
else
    warning "No supported firewall found (ufw or firewalld). Please configure your firewall manually."
fi

# Start services
if command -v systemctl >/dev/null 2>&1; then
    info "Starting services..."
    systemctl restart "$SERVICE_NAME"
    if command -v apache2 >/dev/null 2>&1; then systemctl restart apache2; fi
    if command -v httpd >/dev/null 2>&1; then systemctl restart httpd; fi
    sleep 5
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        success "Xray SOCKS5 Management System started successfully!"
    else
        warning "Service may have issues, checking status..."
        systemctl status "$SERVICE_NAME" --no-pager
    fi
else
    warning "systemctl not found. Please start your Node.js and web server manually."
fi

success "Installation complete! Access your system at http://$DOMAIN or http://<your-server-ip>"
