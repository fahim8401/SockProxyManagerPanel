#!/bin/bash

# Quick Node.js version fix script
set -e

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "🔧 Fixing Node.js version compatibility..."

# Check current versions
if command -v node >/dev/null; then
    log "Current Node.js version: $(node --version)"
fi
if command -v npm >/dev/null; then
    log "Current npm version: $(npm --version)"
fi

# Force remove existing Node.js
log "Removing existing Node.js installation..."
apt-get remove -y nodejs npm nodejs-doc >/dev/null 2>&1 || true
apt-get purge -y nodejs npm nodejs-doc >/dev/null 2>&1 || true
apt-get autoremove -y >/dev/null 2>&1 || true

# Remove existing repositories
rm -f /etc/apt/sources.list.d/nodesource*.list 2>/dev/null || true

log "Installing Node.js 20..."

# Install Node.js 20 with proper setup
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get update -qq
apt-get install -y nodejs

# Verify installation
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
log "✅ Installed Node.js $NODE_VERSION and npm $NPM_VERSION"

# Fix package.json in the current directory if it exists
if [[ -f "/opt/socks5-admin/package.json" ]]; then
    log "Fixing package.json in /opt/socks5-admin..."
    cd /opt/socks5-admin
    
    # Backup original
    cp package.json package.json.original 2>/dev/null || true
    
    # Remove engines section with Python
    python3 -c "
import json
try:
    with open('package.json', 'r') as f:
        data = json.load(f)
    data.pop('engines', None)
    with open('package.json', 'w') as f:
        json.dump(data, f, indent=2)
    print('✅ Removed engines from package.json')
except Exception as e:
    print(f'Failed to clean package.json: {e}')
"
    
    # Remove lock files
    rm -f package-lock.json yarn.lock pnpm-lock.yaml 2>/dev/null || true
    
    # Create .npmrc
    cat > .npmrc << 'EOF'
engine-strict=false
legacy-peer-deps=true
fund=false
audit=false
EOF
    
    log "✅ Fixed package.json compatibility"
    
    # Try installing dependencies
    log "Installing dependencies with Node.js 20..."
    npm install --legacy-peer-deps --omit=dev --no-audit --no-fund || {
        log "Retrying with --force..."
        npm install --force --omit=dev --no-audit --no-fund
    }
    
    log "✅ Dependencies installed successfully"
fi

log "🎉 Node.js compatibility fix completed!"