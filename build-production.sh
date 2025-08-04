#!/bin/bash

# Build script for production deployment
# This compiles TypeScript to JavaScript for production use

set -e

echo "🔨 Building Socks5 Panel for Production..."
echo "=========================================="

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[BUILD]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if we're in the project directory
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found. Please run this script from the project root."
    exit 1
fi

print_status "Installing build dependencies..."
npm install

print_status "Compiling TypeScript to JavaScript..."
# Create dist directory
mkdir -p dist

# Compile TypeScript files
npx tsc --project tsconfig.json --outDir dist --target es2020 --module commonjs

print_status "Copying static files..."
# Copy package.json to dist
cp package.json dist/

# Copy client files
cp -r client/dist dist/client

# Create production package.json
cat > dist/package.json << EOF
{
  "name": "xray-socks5-management",
  "version": "2.0.0",
  "description": "Xray SOCKS5 Management System - Production Build",
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

print_status "Installing production dependencies..."
cd dist && npm install --production

print_status "Creating systemd service file..."
cat > xray-socks5.service << 'EOF'
[Unit]
Description=Xray SOCKS5 Management System
After=network.target

[Service]
Type=simple
User=xray-socks5
Group=xray-socks5
WorkingDirectory=/opt/xray-socks5
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=5000

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/xray-socks5

[Install]
WantedBy=multi-user.target
EOF

cd ..

print_status "✅ Production build completed!"
echo ""
echo "Build artifacts created in 'dist/' directory"
echo "To deploy:"
echo "1. Copy dist/ contents to /opt/xray-socks5/"
echo "2. Copy xray-socks5.service to /etc/systemd/system/"
echo "3. Run: systemctl enable xray-socks5 && systemctl start xray-socks5"
echo ""
echo "Quick deployment command:"
echo "sudo cp -r dist/* /opt/xray-socks5/ && sudo cp dist/xray-socks5.service /etc/systemd/system/ && sudo systemctl daemon-reload && sudo systemctl restart xray-socks5"