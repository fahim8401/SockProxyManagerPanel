#!/bin/bash

# SOCKS5 Proxy Admin Panel - Complete Uninstall Script
# This script completely removes all components, files, cache, and data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root user"
    fi
}

# Function to stop all services
stop_services() {
    print_status "Stopping all services and processes..."
    
    # Stop any running Node.js processes
    pkill -f "node" 2>/dev/null || true
    pkill -f "npm" 2>/dev/null || true
    pkill -f "tsx" 2>/dev/null || true
    
    # Stop any SOCKS5 proxy processes
    pkill -f "socks" 2>/dev/null || true
    pkill -f "proxy" 2>/dev/null || true
    
    # Stop systemd services if they exist
    if command -v systemctl &> /dev/null; then
        systemctl stop socks5-proxy 2>/dev/null || true
        systemctl disable socks5-proxy 2>/dev/null || true
        systemctl stop socks5-admin 2>/dev/null || true
        systemctl disable socks5-admin 2>/dev/null || true
    fi
    
    print_success "Services stopped"
}

# Function to remove application files
remove_app_files() {
    print_status "Removing application files..."
    
    # Current directory files
    rm -rf node_modules/ 2>/dev/null || true
    rm -rf dist/ 2>/dev/null || true
    rm -rf build/ 2>/dev/null || true
    rm -rf .next/ 2>/dev/null || true
    rm -rf coverage/ 2>/dev/null || true
    
    # Database files
    rm -f database.sqlite* 2>/dev/null || true
    rm -f *.db 2>/dev/null || true
    rm -f *.sqlite 2>/dev/null || true
    
    # Log files
    rm -rf logs/ 2>/dev/null || true
    rm -f *.log 2>/dev/null || true
    rm -f access.log 2>/dev/null || true
    rm -f error.log 2>/dev/null || true
    
    # Temporary files
    rm -rf tmp/ 2>/dev/null || true
    rm -rf temp/ 2>/dev/null || true
    rm -f *.tmp 2>/dev/null || true
    
    print_success "Application files removed"
}

# Function to remove cache and temporary data
remove_cache() {
    print_status "Removing cache and temporary data..."
    
    # Node.js cache
    rm -rf ~/.npm/_cacache 2>/dev/null || true
    rm -rf ~/.npm/_logs 2>/dev/null || true
    
    # npm cache
    if command -v npm &> /dev/null; then
        npm cache clean --force 2>/dev/null || true
    fi
    
    # Yarn cache
    if command -v yarn &> /dev/null; then
        yarn cache clean 2>/dev/null || true
    fi
    
    # System temp files
    rm -rf /tmp/socks5* 2>/dev/null || true
    rm -rf /tmp/proxy* 2>/dev/null || true
    rm -rf /tmp/npm* 2>/dev/null || true
    
    # User cache directories
    rm -rf ~/.cache/socks5* 2>/dev/null || true
    rm -rf ~/.local/share/socks5* 2>/dev/null || true
    
    print_success "Cache and temporary data removed"
}

# Function to remove system configurations
remove_system_configs() {
    print_status "Removing system configurations..."
    
    # Systemd service files
    if [[ -d /etc/systemd/system ]]; then
        rm -f /etc/systemd/system/socks5* 2>/dev/null || true
        rm -f /etc/systemd/system/proxy* 2>/dev/null || true
        systemctl daemon-reload 2>/dev/null || true
    fi
    
    # Nginx configurations
    if [[ -d /etc/nginx ]]; then
        rm -f /etc/nginx/sites-available/socks5* 2>/dev/null || true
        rm -f /etc/nginx/sites-enabled/socks5* 2>/dev/null || true
        rm -f /etc/nginx/conf.d/socks5* 2>/dev/null || true
    fi
    
    # Apache configurations
    if [[ -d /etc/apache2 ]]; then
        rm -f /etc/apache2/sites-available/socks5* 2>/dev/null || true
        rm -f /etc/apache2/sites-enabled/socks5* 2>/dev/null || true
    fi
    
    # Firewall rules (iptables)
    if command -v iptables &> /dev/null; then
        # Remove SOCKS5 port rules
        iptables -D INPUT -p tcp --dport 1080 -j ACCEPT 2>/dev/null || true
        iptables -D INPUT -p tcp --dport 5000 -j ACCEPT 2>/dev/null || true
        iptables -D INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || true
        iptables -D INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || true
    fi
    
    # UFW rules
    if command -v ufw &> /dev/null; then
        ufw delete allow 1080 2>/dev/null || true
        ufw delete allow 5000 2>/dev/null || true
        ufw delete allow 443 2>/dev/null || true
        ufw delete allow 80 2>/dev/null || true
    fi
    
    print_success "System configurations removed"
}

# Function to remove environment variables
remove_env_vars() {
    print_status "Removing environment variables..."
    
    # Remove from common shell profile files
    for file in ~/.bashrc ~/.bash_profile ~/.zshrc ~/.profile /etc/environment; do
        if [[ -f "$file" ]]; then
            sed -i '/SOCKS5/d' "$file" 2>/dev/null || true
            sed -i '/DATABASE_URL/d' "$file" 2>/dev/null || true
            sed -i '/PROXY_/d' "$file" 2>/dev/null || true
        fi
    done
    
    # Remove .env files
    rm -f .env* 2>/dev/null || true
    
    print_success "Environment variables removed"
}

# Function to remove user data
remove_user_data() {
    print_status "Removing user data and configurations..."
    
    # Application data directories
    rm -rf ~/.socks5* 2>/dev/null || true
    rm -rf ~/.local/share/socks5* 2>/dev/null || true
    rm -rf ~/.config/socks5* 2>/dev/null || true
    
    # Remove from common application directories
    rm -rf /opt/socks5* 2>/dev/null || true
    rm -rf /usr/local/socks5* 2>/dev/null || true
    rm -rf /var/lib/socks5* 2>/dev/null || true
    rm -rf /var/log/socks5* 2>/dev/null || true
    
    print_success "User data removed"
}

# Function to clean package managers
clean_package_managers() {
    print_status "Cleaning package managers..."
    
    # Remove global npm packages related to the project
    if command -v npm &> /dev/null; then
        npm uninstall -g tsx 2>/dev/null || true
        npm uninstall -g typescript 2>/dev/null || true
        npm uninstall -g drizzle-kit 2>/dev/null || true
    fi
    
    # Clean apt cache (if on Debian/Ubuntu)
    if command -v apt-get &> /dev/null; then
        apt-get clean 2>/dev/null || true
        apt-get autoclean 2>/dev/null || true
    fi
    
    # Clean yum cache (if on RHEL/CentOS)
    if command -v yum &> /dev/null; then
        yum clean all 2>/dev/null || true
    fi
    
    print_success "Package managers cleaned"
}

# Function to remove Docker containers and images (if any)
remove_docker() {
    if command -v docker &> /dev/null; then
        print_status "Removing Docker containers and images..."
        
        # Stop and remove containers
        docker stop $(docker ps -aq --filter "name=socks5") 2>/dev/null || true
        docker rm $(docker ps -aq --filter "name=socks5") 2>/dev/null || true
        docker stop $(docker ps -aq --filter "name=proxy") 2>/dev/null || true
        docker rm $(docker ps -aq --filter "name=proxy") 2>/dev/null || true
        
        # Remove images
        docker rmi $(docker images --filter "reference=*socks5*" -q) 2>/dev/null || true
        docker rmi $(docker images --filter "reference=*proxy*" -q) 2>/dev/null || true
        
        # Clean system
        docker system prune -f 2>/dev/null || true
        
        print_success "Docker containers and images removed"
    fi
}

# Function to verify removal
verify_removal() {
    print_status "Verifying complete removal..."
    
    local issues_found=0
    
    # Check for remaining processes
    if pgrep -f "socks5\|proxy" > /dev/null 2>&1; then
        print_warning "Some processes may still be running"
        issues_found=1
    fi
    
    # Check for remaining files
    if [[ -d "node_modules" ]] || [[ -f "database.sqlite" ]]; then
        print_warning "Some application files may still exist"
        issues_found=1
    fi
    
    # Check for services
    if command -v systemctl &> /dev/null; then
        if systemctl is-active socks5-proxy > /dev/null 2>&1; then
            print_warning "System service may still be active"
            issues_found=1
        fi
    fi
    
    if [[ $issues_found -eq 0 ]]; then
        print_success "Complete removal verified - no issues found"
    else
        print_warning "Some components may require manual removal"
    fi
}

# Main uninstall function
main() {
    echo "=============================================="
    echo "    SOCKS5 Proxy Admin Panel - UNINSTALL"
    echo "=============================================="
    echo ""
    
    print_warning "This will completely remove the SOCKS5 Proxy Admin Panel"
    print_warning "including all data, cache, configurations, and files."
    echo ""
    
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Uninstall cancelled by user"
        exit 0
    fi
    
    echo ""
    print_status "Starting complete uninstall process..."
    echo ""
    
    check_root
    stop_services
    remove_app_files
    remove_cache
    remove_system_configs
    remove_env_vars
    remove_user_data
    clean_package_managers
    remove_docker
    verify_removal
    
    echo ""
    echo "=============================================="
    print_success "UNINSTALL COMPLETED SUCCESSFULLY"
    echo "=============================================="
    echo ""
    print_status "The SOCKS5 Proxy Admin Panel has been completely removed"
    print_status "All files, cache, configurations, and data have been deleted"
    echo ""
    print_warning "Please restart your terminal or run 'source ~/.bashrc' to"
    print_warning "refresh your environment variables"
    echo ""
    print_status "Thank you for using SOCKS5 Proxy Admin Panel!"
    echo ""
}

# Run the main function
main "$@"