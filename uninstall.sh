#!/bin/bash

# SOCKS5 Proxy Management System - Complete Uninstallation Script
# Version: 4.0.0 - Enterprise Edition
# This script safely removes all components of the SOCKS5 proxy management system

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Global variables
INSTALL_DIR="/opt/socks5-admin"
SERVICE_NAME="socks5-admin"
BACKUP_DIR="/opt/socks5-admin/backups"
LOG_DIR="/var/log/socks5-admin"
USER_NAME="socks5admin"

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Banner
show_banner() {
    echo -e "${RED}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                  ║"
    echo "║        SOCKS5 Proxy Management System - UNINSTALLER             ║"
    echo "║                     Enterprise Edition v4.0.0                   ║"
    echo "║                                                                  ║"
    echo "║  This will completely remove:                                    ║"
    echo "║  • SOCKS5 Proxy Management System                               ║"
    echo "║  • All system services and configurations                       ║"
    echo "║  • Database and log files                                       ║"
    echo "║  • User accounts and permissions                                ║"
    echo "║  • Firewall rules and network configurations                    ║"
    echo "║  • Systemd services and cron jobs                              ║"
    echo "║                                                                  ║"
    echo "║  ⚠️  WARNING: This action cannot be undone!                     ║"
    echo "║                                                                  ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Confirmation prompt
confirm_uninstall() {
    echo -e "${YELLOW}"
    echo "⚠️  CRITICAL WARNING ⚠️"
    echo "This will permanently remove ALL data including:"
    echo "• User accounts and SOCKS5 configurations"
    echo "• Database with all proxy users and settings"
    echo "• Log files and system monitoring data"
    echo "• SSL certificates and security configurations"
    echo "• Backup files and automated backups"
    echo -e "${NC}"
    
    read -p "Are you absolutely sure you want to proceed? (type 'YES' to confirm): " -r
    if [[ ! $REPLY == "YES" ]]; then
        echo "Uninstallation cancelled."
        exit 0
    fi
    
    echo
    read -p "Last chance! Type 'CONFIRM DELETE' to proceed: " -r
    if [[ ! $REPLY == "CONFIRM DELETE" ]]; then
        echo "Uninstallation cancelled."
        exit 0
    fi
}

# Detect OS and package manager
detect_os() {
    log "Detecting operating system..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        error "Cannot detect operating system"
        exit 1
    fi
    
    case $OS in
        *"Ubuntu"*|*"Debian"*)
            PKG_MANAGER="apt"
            ;;
        *"CentOS"*|*"Red Hat"*|*"Rocky"*|*"AlmaLinux"*)
            PKG_MANAGER="yum"
            ;;
        *"Fedora"*)
            PKG_MANAGER="dnf"
            ;;
        *)
            warn "Unsupported operating system: $OS (proceeding anyway)"
            PKG_MANAGER="apt"
            ;;
    esac
    
    info "Detected: $OS $VER"
}

# Stop and disable services
stop_services() {
    log "Stopping and disabling SOCKS5 services..."
    
    # Stop the main service
    if systemctl is-active --quiet $SERVICE_NAME 2>/dev/null; then
        log "Stopping $SERVICE_NAME service..."
        sudo systemctl stop $SERVICE_NAME
    else
        info "$SERVICE_NAME service is not running"
    fi
    
    # Disable the service
    if systemctl is-enabled --quiet $SERVICE_NAME 2>/dev/null; then
        log "Disabling $SERVICE_NAME service..."
        sudo systemctl disable $SERVICE_NAME
    fi
    
    # Remove systemd service file
    if [[ -f /etc/systemd/system/$SERVICE_NAME.service ]]; then
        log "Removing systemd service file..."
        sudo rm -f /etc/systemd/system/$SERVICE_NAME.service
        sudo systemctl daemon-reload
    fi
    
    # Stop any running Node.js processes related to our application
    log "Terminating any remaining Node.js processes..."
    sudo pkill -f "node.*socks5" 2>/dev/null || true
    sudo pkill -f "tsx.*server" 2>/dev/null || true
}

# Remove cron jobs
remove_cron_jobs() {
    log "Removing cron jobs..."
    
    # Remove backup cron job for socks5admin user
    if id "$USER_NAME" &>/dev/null; then
        sudo -u $USER_NAME crontab -r 2>/dev/null || true
        info "Removed cron jobs for $USER_NAME user"
    fi
    
    # Remove any root cron jobs related to socks5
    sudo crontab -l 2>/dev/null | grep -v "socks5" | sudo crontab - 2>/dev/null || true
}

# Remove firewall rules
remove_firewall_rules() {
    log "Removing firewall rules..."
    
    case $PKG_MANAGER in
        "apt")
            # UFW rules
            if command -v ufw &> /dev/null; then
                sudo ufw delete allow 5000/tcp 2>/dev/null || true
                sudo ufw delete allow 1080/tcp 2>/dev/null || true
                info "Removed UFW firewall rules"
            fi
            ;;
        "yum"|"dnf")
            # FirewallD rules
            if command -v firewall-cmd &> /dev/null; then
                sudo firewall-cmd --permanent --zone=public --remove-port=5000/tcp 2>/dev/null || true
                sudo firewall-cmd --permanent --zone=public --remove-port=1080/tcp 2>/dev/null || true
                sudo firewall-cmd --reload 2>/dev/null || true
                info "Removed FirewallD rules"
            fi
            ;;
    esac
}

# Remove IP routing and NAT rules
remove_routing_rules() {
    log "Removing IP routing and NAT rules..."
    
    # Remove iptables rules related to SOCKS5
    sudo iptables -t nat -D POSTROUTING -j MASQUERADE 2>/dev/null || true
    sudo iptables -D FORWARD -j ACCEPT 2>/dev/null || true
    
    # Remove IP forwarding
    sudo sed -i '/net.ipv4.ip_forward = 1/d' /etc/sysctl.conf 2>/dev/null || true
    sudo sed -i '/net.ipv6.conf.all.forwarding = 1/d' /etc/sysctl.conf 2>/dev/null || true
    
    # Remove custom sysctl configurations
    sudo rm -f /etc/sysctl.d/99-socks5-admin.conf
    
    # Remove NAT setup script
    sudo rm -f $INSTALL_DIR/setup-nat.sh
    
    info "Removed routing and NAT configurations"
}

# Remove Fail2Ban configurations
remove_fail2ban_config() {
    log "Removing Fail2Ban configurations..."
    
    # Remove jail configuration
    sudo rm -f /etc/fail2ban/jail.d/socks5-admin.conf
    
    # Remove filter configuration
    sudo rm -f /etc/fail2ban/filter.d/socks5-admin.conf
    
    # Restart fail2ban if it's running
    if systemctl is-active --quiet fail2ban 2>/dev/null; then
        sudo systemctl restart fail2ban
        info "Restarted Fail2Ban service"
    fi
}

# Remove log rotation configuration
remove_logrotate_config() {
    log "Removing log rotation configuration..."
    sudo rm -f /etc/logrotate.d/socks5-admin
}

# Remove system limits configuration
remove_limits_config() {
    log "Removing system limits configuration..."
    sudo rm -f /etc/security/limits.d/socks5-limits.conf
}

# Create final backup before deletion
create_final_backup() {
    log "Creating final backup before deletion..."
    
    FINAL_BACKUP_DIR="/tmp/socks5-admin-final-backup-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$FINAL_BACKUP_DIR"
    
    # Backup database if it exists
    if [[ -f "$INSTALL_DIR/database.sqlite" ]]; then
        cp "$INSTALL_DIR/database.sqlite" "$FINAL_BACKUP_DIR/" 2>/dev/null || true
    fi
    
    # Backup configuration files
    if [[ -f "$INSTALL_DIR/.env" ]]; then
        cp "$INSTALL_DIR/.env" "$FINAL_BACKUP_DIR/" 2>/dev/null || true
    fi
    
    # Backup any SSL certificates
    if [[ -d "$INSTALL_DIR/ssl" ]]; then
        cp -r "$INSTALL_DIR/ssl" "$FINAL_BACKUP_DIR/" 2>/dev/null || true
    fi
    
    # Create archive
    tar -czf "/tmp/socks5-admin-final-backup-$(date +%Y%m%d_%H%M%S).tar.gz" -C /tmp "$(basename "$FINAL_BACKUP_DIR")" 2>/dev/null || true
    rm -rf "$FINAL_BACKUP_DIR"
    
    info "Final backup created in /tmp/"
}

# Remove application files and directories
remove_application_files() {
    log "Removing application files and directories..."
    
    # Remove main installation directory
    if [[ -d "$INSTALL_DIR" ]]; then
        sudo rm -rf "$INSTALL_DIR"
        info "Removed installation directory: $INSTALL_DIR"
    fi
    
    # Remove backup directory
    if [[ -d "$BACKUP_DIR" ]]; then
        sudo rm -rf "$BACKUP_DIR"
        info "Removed backup directory: $BACKUP_DIR"
    fi
    
    # Remove log directory
    if [[ -d "$LOG_DIR" ]]; then
        sudo rm -rf "$LOG_DIR"
        info "Removed log directory: $LOG_DIR"
    fi
}

# Remove system user
remove_system_user() {
    log "Removing system user..."
    
    if id "$USER_NAME" &>/dev/null; then
        # Stop any processes owned by the user
        sudo pkill -u "$USER_NAME" 2>/dev/null || true
        
        # Remove user and home directory
        sudo userdel -r "$USER_NAME" 2>/dev/null || true
        info "Removed system user: $USER_NAME"
    else
        info "System user $USER_NAME does not exist"
    fi
}

# Remove Node.js (optional)
remove_nodejs() {
    read -p "Do you want to remove Node.js as well? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Removing Node.js..."
        case $PKG_MANAGER in
            "apt")
                sudo apt remove -y nodejs npm 2>/dev/null || true
                sudo apt autoremove -y 2>/dev/null || true
                ;;
            "yum"|"dnf")
                sudo $PKG_MANAGER remove -y nodejs npm 2>/dev/null || true
                ;;
        esac
        info "Node.js removed"
    else
        info "Keeping Node.js installed"
    fi
}

# Clean up package manager
cleanup_packages() {
    log "Cleaning up package manager..."
    
    case $PKG_MANAGER in
        "apt")
            sudo apt autoremove -y 2>/dev/null || true
            sudo apt autoclean 2>/dev/null || true
            ;;
        "yum")
            sudo yum autoremove -y 2>/dev/null || true
            sudo yum clean all 2>/dev/null || true
            ;;
        "dnf")
            sudo dnf autoremove -y 2>/dev/null || true
            sudo dnf clean all 2>/dev/null || true
            ;;
    esac
}

# Verify removal
verify_removal() {
    log "Verifying complete removal..."
    
    local issues=0
    
    # Check if service still exists
    if systemctl list-units --full -all | grep -q "$SERVICE_NAME"; then
        warn "Service $SERVICE_NAME may still be present"
        ((issues++))
    fi
    
    # Check if installation directory still exists
    if [[ -d "$INSTALL_DIR" ]]; then
        warn "Installation directory still exists: $INSTALL_DIR"
        ((issues++))
    fi
    
    # Check if user still exists
    if id "$USER_NAME" &>/dev/null; then
        warn "System user still exists: $USER_NAME"
        ((issues++))
    fi
    
    # Check for remaining processes
    if pgrep -f "socks5" >/dev/null 2>&1; then
        warn "SOCKS5-related processes may still be running"
        ((issues++))
    fi
    
    if [[ $issues -eq 0 ]]; then
        log "✅ Verification passed - all components removed successfully"
    else
        warn "⚠️  Verification found $issues potential issues (see warnings above)"
    fi
}

# Final summary
show_summary() {
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                  ║${NC}"
    echo -e "${GREEN}║               UNINSTALLATION COMPLETED                          ║${NC}"
    echo -e "${GREEN}║                                                                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${CYAN}🗑️  Removed Components:${NC}"
    echo -e "   ✅ SOCKS5 Proxy Management System"
    echo -e "   ✅ System services and configurations"
    echo -e "   ✅ Database and user data"
    echo -e "   ✅ Log files and monitoring data"
    echo -e "   ✅ Firewall rules and network settings"
    echo -e "   ✅ Cron jobs and automated tasks"
    echo -e "   ✅ System user accounts"
    echo -e "   ✅ SSL certificates and security configs"
    echo
    echo -e "${CYAN}📁 Final backup location: /tmp/socks5-admin-final-backup-*.tar.gz${NC}"
    echo
    echo -e "${YELLOW}📝 Manual cleanup (if needed):${NC}"
    echo -e "   • Check for any remaining firewall rules"
    echo -e "   • Review /etc/hosts for custom entries"
    echo -e "   • Remove any custom DNS configurations"
    echo -e "   • Clean up any remaining log files"
    echo
    echo -e "${GREEN}Thank you for using SOCKS5 Proxy Management System!${NC}"
    echo
}

# Main uninstallation function
main() {
    show_banner
    confirm_uninstall
    detect_os
    
    echo
    log "Starting uninstallation process..."
    echo
    
    create_final_backup
    stop_services
    remove_cron_jobs
    remove_firewall_rules
    remove_routing_rules
    remove_fail2ban_config
    remove_logrotate_config
    remove_limits_config
    remove_application_files
    remove_system_user
    remove_nodejs
    cleanup_packages
    verify_removal
    show_summary
    
    log "Uninstallation completed successfully!"
}

# Trap to handle interruptions
trap 'echo -e "\n${RED}Uninstallation interrupted!${NC}"; exit 1' INT TERM

# Run main function
main "$@"