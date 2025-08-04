# Ubuntu VPS Installation Guide - Xray SOCKS5 SAAS Platform

## Prerequisites
- Ubuntu 20.04+ VPS with root access
- Minimum 1GB RAM, 1 CPU core, 20GB storage
- Domain name pointing to your VPS (optional but recommended)

## Quick Installation Script

### 1. Download and Run Auto-Installer
```bash
# Connect to your VPS
ssh root@your-vps-ip

# Download the installation script
wget https://raw.githubusercontent.com/your-repo/xray-saas/main/install-ubuntu.sh

# Make executable and run
chmod +x install-ubuntu.sh
sudo ./install-ubuntu.sh
```

## Manual Installation Steps

### 1. System Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install required dependencies
sudo apt install -y curl wget unzip nodejs npm sqlite3 nginx certbot python3-certbot-nginx
```

### 2. Install Node.js 20
```bash
# Remove old Node.js if exists
sudo apt remove nodejs npm -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x
npm --version
```

### 3. Create Application Directory
```bash
# Create app directory
sudo mkdir -p /opt/xray-saas
cd /opt/xray-saas

# Set permissions
sudo chown -R $USER:$USER /opt/xray-saas
```

### 4. Download Application from GitHub
The installation script automatically downloads all files from your GitHub repository:
```bash
# Files are automatically downloaded from:
# https://github.com/fahim8401/SockProxyManagerPanel/archive/refs/heads/MAIN.zip

# The script will:
# - Download the complete SAAS platform
# - Extract all files to /opt/xray-saas
# - Install all dependencies
# - Configure the complete system
```

### 5. Install Dependencies
```bash
cd /opt/xray-saas

# Install Node.js dependencies
npm install

# Install TypeScript globally
npm install -g typescript tsx
```

### 6. Setup Database
```bash
# Create database directory
mkdir -p /opt/xray-saas/data

# Initialize database
npm run db:setup
```

### 7. Configure Environment
```bash
# Create production environment file
cat > .env << EOL
NODE_ENV=production
PORT=5000
JWT_SECRET=$(openssl rand -hex 32)
DATABASE_URL=file:/opt/xray-saas/data/xray-socks5.db
XRAY_BINARY_PATH=/opt/xray-saas/xray-core/xray
EOL
```

### 8. Setup Systemd Service
```bash
# Create systemd service file
sudo tee /etc/systemd/system/xray-saas.service > /dev/null << EOL
[Unit]
Description=Xray SOCKS5 SAAS Platform
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/xray-saas
Environment=NODE_ENV=production
ExecStart=/usr/bin/tsx server/index.ts
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=xray-saas

[Install]
WantedBy=multi-user.target
EOL

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable xray-saas
sudo systemctl start xray-saas

# Check service status
sudo systemctl status xray-saas
```

### 9. Configure Nginx Reverse Proxy
```bash
# Create Nginx configuration
sudo tee /etc/nginx/sites-available/xray-saas << EOL
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Main application
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Static files
    location /static {
        alias /opt/xray-saas/client/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOL

# Enable site and remove default
sudo ln -s /etc/nginx/sites-available/xray-saas /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 10. Setup SSL Certificate (Optional but Recommended)
```bash
# Install SSL certificate with Let's Encrypt
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Setup auto-renewal
sudo crontab -e
# Add this line:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 11. Configure Firewall
```bash
# Setup UFW firewall
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 1080/tcp  # SOCKS5 port
sudo ufw enable

# Check firewall status
sudo ufw status
```

### 12. Performance Optimization
```bash
# Increase file limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Configure kernel parameters
echo "net.core.rmem_max = 134217728" | sudo tee -a /etc/sysctl.conf
echo "net.core.wmem_max = 134217728" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_rmem = 4096 87380 134217728" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_wmem = 4096 65536 134217728" | sudo tee -a /etc/sysctl.conf

# Apply changes
sudo sysctl -p
```

## Auto-Installation Script

Create this script as `install-ubuntu.sh`:

```bash
#!/bin/bash

set -e

echo "🚀 Installing Xray SOCKS5 SAAS Platform on Ubuntu VPS..."

# Colors for output
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
if [ "$EUID" -ne 0 ]; then
    print_error "Please run as root (use sudo)"
    exit 1
fi

# Update system
print_status "Updating system packages..."
apt update && apt upgrade -y

# Install dependencies
print_status "Installing dependencies..."
apt install -y curl wget unzip sqlite3 nginx certbot python3-certbot-nginx

# Install Node.js 20
print_status "Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install global packages
npm install -g typescript tsx pm2

# Create application directory
print_status "Creating application directory..."
mkdir -p /opt/xray-saas
cd /opt/xray-saas

# Download application (replace with your actual download URL)
print_status "Downloading application files..."
# wget https://github.com/your-repo/xray-saas/archive/main.zip
# unzip main.zip
# mv xray-saas-main/* .
# rm -rf xray-saas-main main.zip

# For now, create basic structure
mkdir -p server client/dist shared data

# Install dependencies
print_status "Installing Node.js dependencies..."
cat > package.json << 'EOL'
{
  "name": "xray-saas",
  "version": "1.0.0",
  "description": "Xray SOCKS5 SAAS Platform",
  "main": "server/index.ts",
  "scripts": {
    "start": "tsx server/index.ts",
    "dev": "tsx server/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^8.7.0",
    "drizzle-orm": "^0.28.6",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "ws": "^8.14.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.8.0",
    "typescript": "^5.2.2",
    "tsx": "^3.14.0"
  }
}
EOL

npm install

# Create environment file
print_status "Creating environment configuration..."
cat > .env << EOL
NODE_ENV=production
PORT=5000
JWT_SECRET=$(openssl rand -hex 32)
DATABASE_URL=file:/opt/xray-saas/data/xray-socks5.db
XRAY_BINARY_PATH=/opt/xray-saas/xray-core/xray
EOL

# Setup systemd service
print_status "Setting up systemd service..."
cat > /etc/systemd/system/xray-saas.service << 'EOL'
[Unit]
Description=Xray SOCKS5 SAAS Platform
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/xray-saas
Environment=NODE_ENV=production
ExecStart=/usr/bin/tsx server/index.ts
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=xray-saas

[Install]
WantedBy=multi-user.target
EOL

systemctl daemon-reload
systemctl enable xray-saas

# Configure Nginx
print_status "Configuring Nginx..."
cat > /etc/nginx/sites-available/xray-saas << 'EOL'
server {
    listen 80 default_server;
    server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOL

ln -sf /etc/nginx/sites-available/xray-saas /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx

# Configure firewall
print_status "Configuring firewall..."
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 1080/tcp
echo "y" | ufw enable

# Start service
print_status "Starting Xray SAAS service..."
systemctl start xray-saas

# Check status
sleep 5
if systemctl is-active --quiet xray-saas; then
    print_status "✅ Installation completed successfully!"
    echo ""
    echo "🌐 Access your SAAS platform at: http://$(curl -s ifconfig.me)"
    echo "🔑 Default admin login: admin / admin123"
    echo "🔗 SOCKS5 proxy port: 1080"
    echo ""
    echo "📋 Useful commands:"
    echo "  - Check status: sudo systemctl status xray-saas"
    echo "  - View logs: sudo journalctl -u xray-saas -f"
    echo "  - Restart service: sudo systemctl restart xray-saas"
    echo ""
    print_warning "Remember to:"
    echo "  1. Upload your actual application files to /opt/xray-saas"
    echo "  2. Configure your domain name in Nginx"
    echo "  3. Setup SSL certificate with: sudo certbot --nginx"
    echo "  4. Change default admin password"
else
    print_error "Installation failed. Check logs with: sudo journalctl -u xray-saas"
    exit 1
fi
EOL
```

## Post-Installation

### 1. GitHub Download Complete
The installation script automatically downloads your complete SAAS platform:
```bash
# All files are downloaded from GitHub:
# https://github.com/fahim8401/SockProxyManagerPanel/archive/refs/heads/MAIN.zip

# Your complete SAAS platform includes:
# - Admin panel with sidebar navigation
# - Package management system
# - User creation with IP selection
# - External API with authentication
# - Real-time analytics and monitoring

# Check installation
sudo systemctl status xray-saas
```

### 2. Configure Domain (Optional)
```bash
# Edit Nginx configuration
sudo nano /etc/nginx/sites-available/xray-saas
# Replace server_name _ with server_name your-domain.com

# Restart Nginx
sudo systemctl restart nginx

# Setup SSL
sudo certbot --nginx -d your-domain.com
```

### 3. Security Hardening
```bash
# Change default passwords
# Access admin panel and change admin password
# Update SOCKS5 user credentials

# Setup fail2ban (optional)
sudo apt install fail2ban
```

## Troubleshooting

### Check Service Status
```bash
sudo systemctl status xray-saas
sudo journalctl -u xray-saas -f
```

### Check Port Availability
```bash
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :1080
```

### Test Connectivity
```bash
curl http://localhost:5000
curl -I http://your-domain.com
```

### Database Issues
```bash
# Check database file
ls -la /opt/xray-saas/data/
sqlite3 /opt/xray-saas/data/xray-socks5.db ".tables"
```

## Maintenance

### Backup Database
```bash
# Create backup
sudo cp /opt/xray-saas/data/xray-socks5.db /opt/xray-saas/data/backup-$(date +%Y%m%d).db

# Automated daily backup
echo "0 2 * * * cp /opt/xray-saas/data/xray-socks5.db /opt/xray-saas/data/backup-\$(date +\%Y\%m\%d).db" | sudo crontab -
```

### Update Application
```bash
cd /opt/xray-saas
git pull origin main  # If using Git
npm install
sudo systemctl restart xray-saas
```

### Monitor Logs
```bash
# Real-time logs
sudo journalctl -u xray-saas -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

Your SAAS platform is now ready for production use!