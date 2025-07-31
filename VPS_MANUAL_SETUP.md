# Manual VPS Setup Guide

## Current Issue Fix

You're getting "Cannot find package 'vite'" error because the build process isn't working correctly. Here's how to fix it manually:

### Step 1: Clean Installation

```bash
cd /opt/socks5-proxy-admin

# Remove existing build and modules
rm -rf dist/ node_modules/ package-lock.json

# Clear npm cache
npm cache clean --force

# Install all dependencies
npm install
```

### Step 2: Build the Application

```bash
# Install build tools globally if needed
npm install -g vite tsx esbuild

# Build the application
npm run build

# Verify build completed
ls -la dist/
```

### Step 3: Start the Application

```bash
# Start production server
npm start

# Or start manually
node dist/index.js
```

## Alternative: Use Development Mode

If build continues to fail, run in development mode:

```bash
# Install tsx globally
npm install -g tsx

# Run in development mode
npm run dev
```

## Fix Script for Your VPS

Run this complete fix script on your VPS:

```bash
#!/bin/bash
cd /opt/socks5-proxy-admin

echo "🔧 Fixing SOCKS5 Proxy Admin Panel..."

# Stop any running services
systemctl stop socks5-proxy-admin 2>/dev/null || true

# Clean everything
echo "Cleaning installation..."
rm -rf dist/ node_modules/ package-lock.json

# Clear caches
npm cache clean --force

# Install dependencies
echo "Installing dependencies..."
npm install

# Install build tools globally
echo "Installing build tools..."
npm install -g vite tsx esbuild

# Build application
echo "Building application..."
npm run build

# Check if build succeeded
if [ -f "dist/index.js" ]; then
    echo "✅ Build successful!"
    
    # Start the application
    echo "Starting application..."
    npm start &
    
    # Wait and check
    sleep 5
    if curl -s http://localhost:5000 > /dev/null; then
        echo "✅ Application is running!"
        echo "Access at: http://$(curl -s ifconfig.me):5000"
        echo "Login: admin / admin123"
    else
        echo "❌ Application failed to start"
        echo "Check logs: npm start"
    fi
else
    echo "❌ Build failed"
    echo "Try development mode: npm run dev"
fi
```

## System Service Setup

After manual fix, create the systemd service:

```bash
# Create service file
sudo tee /etc/systemd/system/socks5-proxy-admin.service > /dev/null <<EOF
[Unit]
Description=SOCKS5 Proxy Admin Panel
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/socks5-proxy-admin
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable socks5-proxy-admin
sudo systemctl start socks5-proxy-admin

# Check status
sudo systemctl status socks5-proxy-admin
```

## Verification Commands

```bash
# Check if application is running
curl http://localhost:5000

# Check processes
ps aux | grep node

# Check ports
netstat -tlnp | grep -E ":(5000|1080)"

# Check logs
journalctl -u socks5-proxy-admin -f
```

Your SOCKS5 Proxy Admin Panel should now be running properly!