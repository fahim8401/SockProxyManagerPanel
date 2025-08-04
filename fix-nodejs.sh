#!/bin/bash

# Fix Node.js and npm dependency conflicts
# This script resolves common package conflicts on Ubuntu/Debian systems

set -e

echo "🔧 Fixing Node.js and npm dependency conflicts..."
echo "================================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   print_error "This script must be run as root"
   echo "Please run: sudo bash fix-nodejs.sh"
   exit 1
fi

print_status "Starting Node.js dependency fix..."

# Step 1: Remove problematic packages
print_status "Removing conflicting packages..."
apt remove --purge -y nodejs npm node-* 2>/dev/null || true
apt autoremove -y
apt autoclean

# Step 2: Clean package cache
print_status "Cleaning package cache..."
apt clean
rm -rf /var/lib/apt/lists/*
apt update

# Step 3: Fix broken packages
print_status "Fixing broken packages..."
apt --fix-broken install -y
dpkg --configure -a

# Step 4: Install Node.js using NodeSource repository (recommended method)
print_status "Installing Node.js from NodeSource repository..."

# Install prerequisites
apt install -y curl software-properties-common

# Add NodeSource repository for Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -

# Install Node.js (this includes npm)
apt install -y nodejs

# Step 5: Verify installation
print_status "Verifying installation..."
NODE_VERSION=$(node --version 2>/dev/null || echo "Not installed")
NPM_VERSION=$(npm --version 2>/dev/null || echo "Not installed")

if [[ "$NODE_VERSION" == "Not installed" ]] || [[ "$NPM_VERSION" == "Not installed" ]]; then
    print_error "Installation failed. Trying alternative method..."
    
    # Alternative: Install using snap
    print_status "Trying installation via snap..."
    apt install -y snapd
    snap install node --classic
    
    # Create symlinks if needed
    ln -sf /snap/bin/node /usr/bin/node 2>/dev/null || true
    ln -sf /snap/bin/npm /usr/bin/npm 2>/dev/null || true
    
    NODE_VERSION=$(node --version 2>/dev/null || echo "Not installed")
    NPM_VERSION=$(npm --version 2>/dev/null || echo "Not installed")
fi

# Final verification
if [[ "$NODE_VERSION" != "Not installed" ]] && [[ "$NPM_VERSION" != "Not installed" ]]; then
    print_status "✅ Node.js and npm installed successfully!"
    echo "Node.js version: $NODE_VERSION"
    echo "npm version: $NPM_VERSION"
    
    # Update npm to latest version
    print_status "Updating npm to latest version..."
    npm install -g npm@latest
    
    print_status "🎉 All dependencies fixed! You can now run the installation script."
    echo ""
    echo "Next steps:"
    echo "1. Run: curl -fsSL https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/MAIN/install-linux.sh | sudo bash"
    echo "2. Or with domain: curl -fsSL https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/MAIN/install-linux.sh | sudo bash -s yourdomain.com"
    
else
    print_error "❌ Installation still failed. Manual intervention required."
    echo ""
    echo "Manual fix options:"
    echo "1. Try: apt install -f"
    echo "2. Or install Node.js manually from: https://nodejs.org/en/download/"
    echo "3. Or use nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    exit 1
fi

print_status "Fix completed successfully!"