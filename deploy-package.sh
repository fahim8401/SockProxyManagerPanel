#!/bin/bash

# Deploy Package Creator for Xray SOCKS5 SAAS Platform
# This script creates a deployment package for Ubuntu VPS

set -e

echo "📦 Creating deployment package for Ubuntu VPS..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Create deployment directory
DEPLOY_DIR="xray-saas-deployment-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$DEPLOY_DIR"

print_status "Creating deployment package in: $DEPLOY_DIR"

# Copy application files
print_status "Copying application files..."
cp -r server "$DEPLOY_DIR/"
cp -r client "$DEPLOY_DIR/"
cp -r shared "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp package-lock.json "$DEPLOY_DIR/" 2>/dev/null || true
cp tsconfig.json "$DEPLOY_DIR/"
cp drizzle.config.ts "$DEPLOY_DIR/" 2>/dev/null || true

# Copy installation files
cp install-ubuntu.sh "$DEPLOY_DIR/"
cp UBUNTU_VPS_INSTALLATION.md "$DEPLOY_DIR/"

# Create production environment template
cat > "$DEPLOY_DIR/.env.example" << 'EOL'
NODE_ENV=production
PORT=5000
JWT_SECRET=your-jwt-secret-here
DATABASE_PATH=/opt/xray-saas/data/xray-socks5.db
XRAY_BINARY_PATH=/opt/xray-saas/xray-core/xray
DOMAIN_NAME=your-domain.com
SERVER_IP=your-server-ip
EOL

# Create deployment README
cat > "$DEPLOY_DIR/DEPLOY_README.md" << 'EOL'
# Deployment Package - Xray SOCKS5 SAAS Platform

## Quick Deployment

1. **Upload to your VPS:**
   ```bash
   scp -r xray-saas-deployment-* root@your-vps-ip:/opt/
   ```

2. **Run installation:**
   ```bash
   ssh root@your-vps-ip
   cd /opt/xray-saas-deployment-*
   chmod +x install-ubuntu.sh
   sudo ./install-ubuntu.sh
   ```

3. **Copy application files:**
   ```bash
   cp -r server client shared package.json tsconfig.json /opt/xray-saas/
   cd /opt/xray-saas
   npm install
   sudo systemctl restart xray-saas
   ```

## Files Included

- `server/` - Backend Node.js application
- `client/` - Frontend application
- `shared/` - Shared types and schemas
- `install-ubuntu.sh` - Auto-installation script
- `UBUNTU_VPS_INSTALLATION.md` - Detailed installation guide
- `.env.example` - Environment configuration template

## Requirements

- Ubuntu 20.04+ VPS
- Minimum 1GB RAM, 1 CPU core
- Root or sudo access
- Domain name (optional)

## Support

For issues and support, check the installation guide or system logs:
```bash
sudo journalctl -u xray-saas -f
```
EOL

# Create systemd service template
cat > "$DEPLOY_DIR/xray-saas.service" << 'EOL'
[Unit]
Description=Xray SOCKS5 SAAS Platform
Documentation=https://github.com/your-repo/xray-saas
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=/opt/xray-saas
Environment=NODE_ENV=production
Environment=PATH=/usr/bin:/usr/local/bin
EnvironmentFile=/opt/xray-saas/.env
ExecStart=/usr/bin/tsx server/index.ts
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=10
TimeoutStopSec=20
KillMode=mixed
StandardOutput=journal
StandardError=journal
SyslogIdentifier=xray-saas

# Security settings
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/xray-saas

[Install]
WantedBy=multi-user.target
EOL

# Create nginx configuration template
cat > "$DEPLOY_DIR/nginx-xray-saas.conf" << 'EOL'
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Main application proxy
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API endpoints
    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json;
}
EOL

# Create update script
cat > "$DEPLOY_DIR/update.sh" << 'EOL'
#!/bin/bash

# Update script for Xray SOCKS5 SAAS Platform

echo "🔄 Updating Xray SOCKS5 SAAS Platform..."

cd /opt/xray-saas

# Backup current version
echo "📦 Creating backup..."
sudo ./backup.sh

# Stop service
echo "⏹️ Stopping service..."
sudo systemctl stop xray-saas

# Install updates
echo "📥 Installing updates..."
npm install

# Start service
echo "▶️ Starting service..."
sudo systemctl start xray-saas

# Check status
if systemctl is-active --quiet xray-saas; then
    echo "✅ Update completed successfully!"
else
    echo "❌ Update failed. Check logs: sudo journalctl -u xray-saas"
    exit 1
fi
EOL

chmod +x "$DEPLOY_DIR/update.sh"

# Create backup script
cat > "$DEPLOY_DIR/backup.sh" << 'EOL'
#!/bin/bash

# Backup script for Xray SOCKS5 SAAS Platform

BACKUP_DIR="/opt/xray-saas/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.tar.gz"

echo "📦 Creating backup: $BACKUP_FILE"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
cd /opt/xray-saas
tar -czf "$BACKUP_FILE" \
    data/ \
    .env \
    --exclude=data/logs \
    --exclude=data/temp

# Keep only last 7 backups
find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -mtime +7 -delete

echo "✅ Backup created successfully: $BACKUP_FILE"
EOL

chmod +x "$DEPLOY_DIR/backup.sh"

# Create monitoring script
cat > "$DEPLOY_DIR/monitor.sh" << 'EOL'
#!/bin/bash

# Monitoring script for Xray SOCKS5 SAAS Platform

echo "📊 Xray SOCKS5 SAAS Platform Status"
echo "=================================="

# Service status
echo "🔧 Service Status:"
if systemctl is-active --quiet xray-saas; then
    echo "   ✅ xray-saas: Running"
else
    echo "   ❌ xray-saas: Stopped"
fi

if systemctl is-active --quiet nginx; then
    echo "   ✅ nginx: Running"
else
    echo "   ❌ nginx: Stopped"
fi

# Port status
echo ""
echo "🌐 Port Status:"
if netstat -tlpn | grep -q ":5000 "; then
    echo "   ✅ Port 5000: Listening"
else
    echo "   ❌ Port 5000: Not listening"
fi

if netstat -tlpn | grep -q ":1080 "; then
    echo "   ✅ Port 1080: Listening"
else
    echo "   ❌ Port 1080: Not listening"
fi

# Disk space
echo ""
echo "💾 Disk Usage:"
df -h /opt/xray-saas | tail -1 | awk '{print "   Used: " $3 " / " $2 " (" $5 ")"}'

# Memory usage
echo ""
echo "🧠 Memory Usage:"
free -h | grep Mem | awk '{print "   Used: " $3 " / " $2}'

# CPU load
echo ""
echo "⚡ CPU Load:"
uptime | awk '{print "   Load: " $10 $11 $12}'

# Recent logs
echo ""
echo "📋 Recent Logs (last 5 lines):"
journalctl -u xray-saas --no-pager -n 5 | tail -5

echo ""
echo "For detailed logs: sudo journalctl -u xray-saas -f"
EOL

chmod +x "$DEPLOY_DIR/monitor.sh"

# Create quick setup script
cat > "$DEPLOY_DIR/quick-setup.sh" << 'EOL'
#!/bin/bash

# Quick setup script for existing Ubuntu VPS

echo "🚀 Quick setup for Xray SOCKS5 SAAS Platform..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo ./quick-setup.sh"
    exit 1
fi

# Copy files to application directory
echo "📁 Copying files to /opt/xray-saas..."
mkdir -p /opt/xray-saas
cp -r server client shared package.json tsconfig.json /opt/xray-saas/
cp .env.example /opt/xray-saas/.env
cp backup.sh update.sh monitor.sh /opt/xray-saas/
cp xray-saas.service /etc/systemd/system/

# Set permissions
chown -R root:root /opt/xray-saas
chmod +x /opt/xray-saas/*.sh
chmod 600 /opt/xray-saas/.env

# Install dependencies
echo "📦 Installing dependencies..."
cd /opt/xray-saas
npm install

# Setup systemd service
echo "🔧 Setting up service..."
systemctl daemon-reload
systemctl enable xray-saas
systemctl start xray-saas

# Check status
if systemctl is-active --quiet xray-saas; then
    echo "✅ Service started successfully!"
    echo "🌐 Access your application at: http://$(curl -s ifconfig.me):5000"
else
    echo "❌ Service failed to start. Check logs: sudo journalctl -u xray-saas"
fi
EOL

chmod +x "$DEPLOY_DIR/quick-setup.sh"

# Create archive
print_status "Creating compressed archive..."
tar -czf "${DEPLOY_DIR}.tar.gz" "$DEPLOY_DIR"

# Cleanup temporary directory
rm -rf "$DEPLOY_DIR"

print_status "✅ Deployment package created: ${DEPLOY_DIR}.tar.gz"
echo ""
echo "📋 Deployment Instructions:"
echo "1. Upload package to your VPS:"
echo "   scp ${DEPLOY_DIR}.tar.gz root@your-vps-ip:/opt/"
echo ""
echo "2. Extract and run installation:"
echo "   ssh root@your-vps-ip"
echo "   cd /opt"
echo "   tar -xzf ${DEPLOY_DIR}.tar.gz"
echo "   cd ${DEPLOY_DIR}"
echo "   chmod +x install-ubuntu.sh"
echo "   sudo ./install-ubuntu.sh"
echo ""
echo "3. Copy application files:"
echo "   sudo ./quick-setup.sh"
echo ""
print_warning "📝 Don't forget to:"
echo "- Configure your domain name in .env"
echo "- Setup SSL certificate with certbot"
echo "- Change default passwords"
echo "- Configure firewall rules"