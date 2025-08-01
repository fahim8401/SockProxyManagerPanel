#!/bin/bash

# SOCKS5 Proxy Admin Panel - Production Installation Script
# Supports Ubuntu, Debian, CentOS, and other Linux distributions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="SOCKS5 Proxy Admin Panel"
APP_DIR="/opt/socks-proxy-admin"
SERVICE_NAME="socks-proxy-admin"
NODE_VERSION="20"
DEFAULT_PORT="5000"
DEFAULT_SOCKS_PORT="1080"

# Functions
print_header() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "    $APP_NAME - Installation Script"
    echo "=================================================="
    echo -e "${NC}"
}

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. This is recommended for system-wide installation."
    else
        print_warning "Not running as root. You may need sudo privileges for some operations."
    fi
}

# Detect OS
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    elif type lsb_release >/dev/null 2>&1; then
        OS=$(lsb_release -si)
        VER=$(lsb_release -sr)
    elif [[ -f /etc/redhat-release ]]; then
        OS="CentOS"
        VER=$(rpm -q --qf "%{VERSION}" $(rpm -q --whatprovides redhat-release))
    else
        print_error "Cannot detect operating system"
        exit 1
    fi
    
    print_step "Detected OS: $OS $VER"
}

# Install Node.js
install_nodejs() {
    print_step "Installing Node.js $NODE_VERSION..."
    
    if command -v node &> /dev/null; then
        NODE_CURRENT=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $NODE_CURRENT -ge $NODE_VERSION ]]; then
            print_success "Node.js $NODE_CURRENT is already installed"
            return
        fi
    fi
    
    # Install Node.js using NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        sudo apt-get update
        sudo apt-get install -y nodejs build-essential
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
        sudo yum install -y nodejs npm gcc-c++ make
    else
        print_error "Unsupported OS for automatic Node.js installation"
        print_warning "Please install Node.js $NODE_VERSION manually"
        exit 1
    fi
    
    print_success "Node.js $(node --version) installed successfully"
}

# Install system dependencies
install_dependencies() {
    print_step "Installing system dependencies..."
    
    if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
        sudo apt-get update
        sudo apt-get install -y curl wget git unzip sqlite3 nginx ufw
    elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]]; then
        sudo yum update -y
        sudo yum install -y curl wget git unzip sqlite nginx firewalld
    else
        print_warning "Please install the following packages manually: curl wget git unzip sqlite3 nginx"
    fi
    
    print_success "System dependencies installed"
}

# Create application directory
setup_application() {
    print_step "Setting up application directory..."
    
    # Create application directory
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
    
    # Copy application files (assuming script is run from project directory)
    if [[ -f "package.json" ]]; then
        print_step "Copying application files..."
        cp -r . $APP_DIR/
        cd $APP_DIR
    else
        print_step "Cloning from GitHub repository..."
        git clone https://github.com/fahim8401/SockProxyManagerPanel.git $APP_DIR
        cd $APP_DIR
    fi
    
    print_success "Application files copied to $APP_DIR"
}

# Install application dependencies
install_app_dependencies() {
    print_step "Installing application dependencies..."
    
    cd $APP_DIR
    npm install --production
    
    print_success "Application dependencies installed"
}

# Build application
build_application() {
    print_step "Building application for production..."
    
    cd $APP_DIR
    npm run build
    
    print_success "Application built successfully"
}

# Setup database
setup_database() {
    print_step "Initializing database..."
    
    cd $APP_DIR
    
    # Create database directory
    mkdir -p data
    
    # Initialize database schema
    npm run db:push || {
        print_warning "Database push failed, trying alternative method..."
        # Create a basic database if push fails
        sqlite3 database.sqlite "CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY);"
    }
    
    print_success "Database initialized"
}

# Create systemd service
create_systemd_service() {
    print_step "Creating systemd service..."
    
    sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null <<EOF
[Unit]
Description=$APP_NAME
Documentation=https://github.com/fahim8401/SockProxyManagerPanel
After=network.target

[Service]
Environment=NODE_ENV=production
Environment=PORT=$DEFAULT_PORT
Environment=SOCKS_PORT=$DEFAULT_SOCKS_PORT
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=5
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable $SERVICE_NAME
    
    print_success "Systemd service created"
}

# Configure firewall
configure_firewall() {
    print_step "Configuring firewall..."
    
    if command -v ufw &> /dev/null; then
        # Ubuntu/Debian UFW
        sudo ufw allow ssh
        sudo ufw allow $DEFAULT_PORT/tcp
        sudo ufw allow $DEFAULT_SOCKS_PORT/tcp
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        echo "y" | sudo ufw enable
        print_success "UFW firewall configured"
    elif command -v firewall-cmd &> /dev/null; then
        # CentOS/RHEL firewalld
        sudo systemctl enable firewalld
        sudo systemctl start firewalld
        sudo firewall-cmd --permanent --add-port=22/tcp
        sudo firewall-cmd --permanent --add-port=$DEFAULT_PORT/tcp
        sudo firewall-cmd --permanent --add-port=$DEFAULT_SOCKS_PORT/tcp
        sudo firewall-cmd --permanent --add-port=80/tcp
        sudo firewall-cmd --permanent --add-port=443/tcp
        sudo firewall-cmd --reload
        print_success "Firewalld configured"
    else
        print_warning "Please configure your firewall manually to allow ports: 22, $DEFAULT_PORT, $DEFAULT_SOCKS_PORT, 80, 443"
    fi
}

# Configure Nginx reverse proxy
configure_nginx() {
    print_step "Configuring Nginx reverse proxy..."
    
    sudo tee /etc/nginx/sites-available/$SERVICE_NAME > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:$DEFAULT_PORT;
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
        proxy_pass http://localhost:$DEFAULT_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF
    
    # Enable site
    sudo ln -sf /etc/nginx/sites-available/$SERVICE_NAME /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test configuration
    sudo nginx -t && sudo systemctl restart nginx
    
    print_success "Nginx configured and restarted"
}

# Start services
start_services() {
    print_step "Starting services..."
    
    sudo systemctl start $SERVICE_NAME
    sudo systemctl status $SERVICE_NAME --no-pager
    
    print_success "Services started successfully"
}

# Display completion message
display_completion() {
    print_header
    print_success "$APP_NAME has been installed successfully!"
    echo ""
    echo -e "${BLUE}Access Information:${NC}"
    echo "• Admin Panel: http://$(hostname -I | awk '{print $1}') or http://localhost"
    echo "• SOCKS5 Proxy: $(hostname -I | awk '{print $1}'):$DEFAULT_SOCKS_PORT"
    echo ""
    echo -e "${BLUE}Default Credentials:${NC}"
    echo "• Username: admin"
    echo "• Password: admin123"
    echo ""
    echo -e "${BLUE}Service Management:${NC}"
    echo "• Start: sudo systemctl start $SERVICE_NAME"
    echo "• Stop: sudo systemctl stop $SERVICE_NAME"
    echo "• Restart: sudo systemctl restart $SERVICE_NAME"
    echo "• Status: sudo systemctl status $SERVICE_NAME"
    echo "• Logs: sudo journalctl -u $SERVICE_NAME -f"
    echo ""
    echo -e "${BLUE}Files & Directories:${NC}"
    echo "• Application: $APP_DIR"
    echo "• Database: $APP_DIR/database.sqlite"
    echo "• Service: /etc/systemd/system/${SERVICE_NAME}.service"
    echo "• Nginx Config: /etc/nginx/sites-available/$SERVICE_NAME"
    echo ""
    echo -e "${YELLOW}Important Security Notes:${NC}"
    echo "• Change default admin password immediately"
    echo "• Configure SSL/TLS certificates for production"
    echo "• Review firewall settings"
    echo "• Set up regular database backups"
    echo ""
    echo -e "${GREEN}Installation completed successfully!${NC}"
}

# Main installation process
main() {
    print_header
    
    print_step "Starting installation process..."
    
    check_root
    detect_os
    install_nodejs
    install_dependencies
    setup_application
    install_app_dependencies
    build_application
    setup_database
    create_systemd_service
    configure_firewall
    configure_nginx
    start_services
    
    display_completion
}

# Trap errors
trap 'print_error "Installation failed! Check the output above for details."; exit 1' ERR

# Run main function
main "$@"