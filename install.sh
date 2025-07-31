#!/bin/bash

# SOCKS5 Proxy Admin Panel - One-Click Installation Script
# Supports Ubuntu 18.04+, Debian 10+, CentOS 7+, RHEL 7+
# Usage: curl -sSL https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/main/install.sh | bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/fahim8401/SockProxyManagerPanel.git"
INSTALL_DIR="/opt/socks5-proxy-admin"
SERVICE_NAME="socks5-proxy-admin"
NODE_VERSION="20"

print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                 SOCKS5 Proxy Admin Panel                    ║"
    echo "║                 Automated Installation                      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root or with sudo"
        echo "Usage: sudo bash install.sh"
        exit 1
    fi
}

detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    else
        print_error "Cannot detect operating system"
        exit 1
    fi
    
    print_info "Detected OS: $OS $OS_VERSION"
}

install_dependencies() {
    print_step "Installing system dependencies..."
    
    case $OS in
        ubuntu|debian)
            apt-get update
            apt-get install -y curl wget git build-essential python3 sqlite3 ufw
            ;;
        centos|rhel|fedora)
            if command -v dnf &> /dev/null; then
                dnf install -y curl wget git gcc gcc-c++ make python3 sqlite ufw
            else
                yum install -y curl wget git gcc gcc-c++ make python3 sqlite
                # Install ufw manually for CentOS 7
                if ! command -v ufw &> /dev/null; then
                    print_warning "UFW not available, using firewalld instead"
                fi
            fi
            ;;
        *)
            print_error "Unsupported operating system: $OS"
            exit 1
            ;;
    esac
}

install_nodejs() {
    print_step "Installing Node.js $NODE_VERSION..."
    
    # Install Node.js using NodeSource repository
    if ! command -v node &> /dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
        case $OS in
            ubuntu|debian)
                apt-get install -y nodejs
                ;;
            centos|rhel|fedora)
                if command -v dnf &> /dev/null; then
                    dnf install -y nodejs npm
                else
                    yum install -y nodejs npm
                fi
                ;;
        esac
    else
        print_info "Node.js already installed: $(node --version)"
    fi
}

create_user() {
    print_step "Creating system user..."
    
    if ! id "socks5admin" &>/dev/null; then
        useradd -r -s /bin/false -d $INSTALL_DIR socks5admin
        print_info "Created user: socks5admin"
    else
        print_info "User already exists: socks5admin"
    fi
}

clone_repository() {
    print_step "Downloading application..."
    
    if [[ -d $INSTALL_DIR ]]; then
        print_warning "Installation directory exists. Removing..."
        rm -rf $INSTALL_DIR
    fi
    
    git clone $REPO_URL $INSTALL_DIR
    cd $INSTALL_DIR
    
    # Set ownership
    chown -R socks5admin:socks5admin $INSTALL_DIR
}

install_app_dependencies() {
    print_step "Installing application dependencies..."
    
    cd $INSTALL_DIR
    
    # Clear any existing cache and modules
    print_info "Clearing npm cache..."
    sudo -u socks5admin npm cache clean --force
    
    # Remove any existing node_modules to ensure clean install
    if [ -d "node_modules" ]; then
        print_info "Removing existing node_modules..."
        sudo -u socks5admin rm -rf node_modules package-lock.json
    fi
    
    # Install all dependencies (including dev dependencies needed for build)
    print_info "Installing all dependencies..."
    sudo -u socks5admin npm install
    
    # Verify critical build tools are available
    print_info "Verifying build tools..."
    if ! sudo -u socks5admin npx vite --version > /dev/null 2>&1; then
        print_info "Installing vite globally as fallback..."
        npm install -g vite
    fi
    
    if ! sudo -u socks5admin npx tsx --version > /dev/null 2>&1; then
        print_info "Installing tsx globally as fallback..."
        npm install -g tsx
    fi
    
    if ! sudo -u socks5admin npx esbuild --version > /dev/null 2>&1; then
        print_info "Installing esbuild globally as fallback..."
        npm install -g esbuild
    fi
    
    # Build the application
    print_info "Building application for production..."
    sudo -u socks5admin npm run build
    
    # Verify build was successful
    if [ ! -f "dist/index.js" ]; then
        print_error "Build failed - dist/index.js not found"
        exit 1
    fi
    
    print_info "Build completed successfully"
    
    # Clean up dev dependencies after successful build
    print_info "Optimizing for production..."
    sudo -u socks5admin npm prune --production
    
    # Verify production server can start
    print_info "Testing production build..."
    timeout 10 sudo -u socks5admin node dist/index.js > /dev/null 2>&1 || true
}

setup_database() {
    print_step "Setting up SQLite database..."
    
    cd $INSTALL_DIR
    
    # Create database directory with proper permissions
    mkdir -p data
    chown socks5admin:socks5admin data
    
    # Initialize database (will be auto-created on first run)
    print_info "Database will be initialized on first startup"
}

configure_firewall() {
    print_step "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        # UFW configuration
        ufw allow 5000/tcp comment "SOCKS5 Admin Panel"
        ufw allow 1080/tcp comment "SOCKS5 Proxy"
        ufw allow ssh
        
        if ! ufw status | grep -q "Status: active"; then
            print_warning "Firewall is not active. Enable it? (y/n)"
            read -r enable_firewall
            if [[ $enable_firewall =~ ^[Yy]$ ]]; then
                ufw --force enable
            fi
        fi
    elif command -v firewall-cmd &> /dev/null; then
        # Firewalld configuration
        firewall-cmd --permanent --add-port=5000/tcp --add-port=1080/tcp
        firewall-cmd --reload
    else
        print_warning "No firewall detected. Please manually configure ports 5000 and 1080"
    fi
}

create_systemd_service() {
    print_step "Creating systemd service..."
    
    # Find the correct node path
    NODE_PATH=$(which node)
    if [ -z "$NODE_PATH" ]; then
        NODE_PATH="/usr/bin/node"
    fi
    
    print_info "Using Node.js path: $NODE_PATH"
    
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=SOCKS5 Proxy Admin Panel
After=network.target
Wants=network.target

[Service]
Type=simple
User=socks5admin
Group=socks5admin
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=JWT_SECRET=your-super-secret-jwt-key-$(openssl rand -hex 16)
ExecStart=$NODE_PATH dist/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=socks5-proxy-admin
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=10

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
    systemctl enable $SERVICE_NAME
    print_info "Systemd service created and enabled"
}

create_environment_file() {
    print_step "Creating environment configuration..."
    
    cat > $INSTALL_DIR/.env << EOF
# SOCKS5 Proxy Admin Panel Configuration
NODE_ENV=production
PORT=5000
JWT_SECRET=$(openssl rand -hex 32)
DATABASE_URL=sqlite:./data/database.sqlite

# Default admin credentials (CHANGE THESE!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# SOCKS5 Proxy Configuration
SOCKS_PORT=1080
SOCKS_HOST=0.0.0.0
EOF

    chown socks5admin:socks5admin $INSTALL_DIR/.env
    chmod 600 $INSTALL_DIR/.env
}

start_services() {
    print_step "Starting services..."
    
    # Start the service
    systemctl start $SERVICE_NAME
    
    # Wait for service to start
    sleep 8
    
    # Check service status
    if systemctl is-active --quiet $SERVICE_NAME; then
        print_success "Service started successfully"
    else
        print_warning "Service may have failed to start. Checking logs..."
        journalctl -u $SERVICE_NAME --no-pager -n 20
    fi
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        print_success "✅ Service started successfully"
    else
        print_error "❌ Service failed to start. Troubleshooting..."
        echo ""
        print_info "📋 Check logs:"
        echo "   sudo journalctl -u $SERVICE_NAME --no-pager"
        echo ""
        print_info "🔧 Manual troubleshooting steps:"
        echo "   cd $INSTALL_DIR"
        echo "   npm install                    # Reinstall dependencies"
        echo "   npm run build                  # Rebuild application"
        echo "   npm start                      # Test manual start"
        echo "   sudo systemctl restart $SERVICE_NAME  # Restart service"
        echo ""
        print_info "🐛 Common fixes:"
        echo "   # Clear npm cache and rebuild:"
        echo "   cd $INSTALL_DIR"
        echo "   sudo -u socks5admin npm cache clean --force"
        echo "   sudo -u socks5admin rm -rf node_modules package-lock.json"
        echo "   sudo -u socks5admin npm install"
        echo "   sudo -u socks5admin npm run build"
        echo ""
        print_info "📞 If issues persist, check:"
        echo "   - Node.js version: node --version (should be 18+)"
        echo "   - Available disk space: df -h"
        echo "   - File permissions: ls -la $INSTALL_DIR"
        exit 1
    fi
}

show_completion_info() {
    local server_ip=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_SERVER_IP")
    
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    Installation Complete!                   ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${BLUE}📱 Admin Panel Access:${NC}"
    echo -e "   URL: ${YELLOW}http://$server_ip:5000${NC}"
    echo -e "   Username: ${YELLOW}admin${NC}"
    echo -e "   Password: ${YELLOW}admin123${NC}"
    echo ""
    echo -e "${BLUE}🔧 SOCKS5 Proxy Server:${NC}"
    echo -e "   Host: ${YELLOW}$server_ip${NC}"
    echo -e "   Port: ${YELLOW}1080${NC}"
    echo ""
    echo -e "${BLUE}⚙️  Management Commands:${NC}"
    echo -e "   Start:   ${YELLOW}sudo systemctl start $SERVICE_NAME${NC}"
    echo -e "   Stop:    ${YELLOW}sudo systemctl stop $SERVICE_NAME${NC}"
    echo -e "   Restart: ${YELLOW}sudo systemctl restart $SERVICE_NAME${NC}"
    echo -e "   Status:  ${YELLOW}sudo systemctl status $SERVICE_NAME${NC}"
    echo -e "   Logs:    ${YELLOW}sudo journalctl -u $SERVICE_NAME -f${NC}"
    echo ""
    echo -e "${BLUE}📁 Installation Directory:${NC}"
    echo -e "   ${YELLOW}$INSTALL_DIR${NC}"
    echo ""
    echo -e "${BLUE}🔧 Manual Commands (if needed):${NC}"
    echo -e "   cd $INSTALL_DIR"
    echo -e "   npm install      # Install dependencies"
    echo -e "   npm run build    # Build application"
    echo -e "   npm start        # Start manually"
    echo ""
    echo -e "${BLUE}🔐 Security Notes:${NC}"
    echo -e "   • Change default admin password immediately!"
    echo -e "   • Configure SSL/TLS for production use"
    echo -e "   • Review firewall settings"
    echo -e "   • Database: ${YELLOW}$INSTALL_DIR/data/database.sqlite${NC}"
    echo ""
    echo -e "${RED}⚠️  IMPORTANT:${NC}"
    echo -e "   Change the default credentials before production use!"
    echo -e "   Edit: ${YELLOW}$INSTALL_DIR/.env${NC}"
}

# Main installation process
main() {
    print_header
    
    check_root
    detect_os
    install_dependencies
    install_nodejs
    create_user
    clone_repository
    install_app_dependencies
    setup_database
    create_environment_file
    configure_firewall
    create_systemd_service
    start_services
    show_completion_info
    
    print_info "Installation completed successfully!"
}

# Run installation
main "$@"