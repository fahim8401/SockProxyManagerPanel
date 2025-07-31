# VPS Server Setup Guide

## Issue: Missing Development Dependencies

You're getting "vite: not found" and "tsx: not found" errors because the development dependencies weren't installed on your VPS.

## Quick Fix Commands

Run these commands on your VPS to fix the issue:

```bash
# Navigate to your application directory
cd /opt/socks5-proxy-admin

# Install ALL dependencies (including dev dependencies)
npm install

# Build the application
npm run build

# Start the production server
npm start
```

## Alternative: Install Dependencies Globally

If you prefer to install the build tools globally:

```bash
# Install vite and tsx globally
npm install -g vite tsx esbuild

# Then build
npm run build

# Start production server
npm start
```

## Production Deployment Steps

For a clean production deployment:

```bash
# 1. Install all dependencies
npm install

# 2. Build the application
npm run build

# 3. Clean up dev dependencies (optional)
npm prune --production

# 4. Start the server
npm start
```

## Systemd Service Setup

Create a proper systemd service for auto-start:

```bash
# Create systemd service file
sudo tee /etc/systemd/system/socks5-proxy-admin.service > /dev/null <<EOF
[Unit]
Description=SOCKS5 Proxy Admin Panel
After=network.target

[Service]
Type=simple
User=socks5admin
WorkingDirectory=/opt/socks5-proxy-admin
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable socks5-proxy-admin
sudo systemctl start socks5-proxy-admin

# Check status
sudo systemctl status socks5-proxy-admin
```

## Environment Variables

Make sure your .env file exists:

```bash
# Check if .env exists
ls -la /opt/socks5-proxy-admin/.env

# If missing, create it
cat > /opt/socks5-proxy-admin/.env << EOF
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
EOF

# Set proper permissions
chmod 600 /opt/socks5-proxy-admin/.env
chown socks5admin:socks5admin /opt/socks5-proxy-admin/.env
```

## Troubleshooting

### If build still fails:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

### If Node.js version is too old:
```bash
# Install newer Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify version
node --version  # Should be 20.x or higher
npm --version
```

### Check application status:
```bash
# Test web server
curl http://localhost:5000

# Check if ports are listening
ss -tlnp | grep -E ":(5000|1080)"

# View logs
sudo journalctl -u socks5-proxy-admin -f
```

## Access Your Application

Once running:
- **Web Interface**: http://your-vps-ip:5000
- **SOCKS5 Proxy**: your-vps-ip:1080
- **Login**: admin / admin123

Your SOCKS5 Proxy Admin Panel will be fully operational on your VPS!