# Deployment Guide

## Quick Installation (Recommended)

### One-Click Installation Script

For Ubuntu 18.04+, Debian 10+, CentOS 7+, RHEL 7+:

```bash
curl -sSL https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/refs/heads/MAIN/install.sh | sudo bash
```

This script will:
- Install Node.js 20 and system dependencies
- Create a dedicated user (`socks5admin`)
- Configure firewall (ports 5000, 1080)
- Set up systemd service
- Start the application automatically

## Manual Installation

### Prerequisites

- Node.js 18+ 
- Git
- SQLite3
- Build tools (gcc, make, python3)

### Step 1: Clone Repository

```bash
git clone https://github.com/fahim8401/SockProxyManagerPanel.git
cd SockProxyManagerPanel
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

```bash
cp .env.example .env
nano .env
```

Update the following variables:
- `JWT_SECRET`: Generate a secure random string
- `ADMIN_USERNAME`: Change from default 'admin'
- `ADMIN_PASSWORD`: Change from default 'admin123'

### Step 4: Build Application

```bash
npm run build
```

### Step 5: Create Data Directory

```bash
mkdir -p data
```

### Step 6: Start Application

```bash
npm start
```

## Production Deployment

### Using systemd (Recommended)

1. Create service user:
```bash
sudo useradd -r -s /bin/false -d /opt/socks5-proxy-admin socks5admin
```

2. Move application to production directory:
```bash
sudo mv SockProxyManagerPanel /opt/
sudo chown -R socks5admin:socks5admin /opt/SockProxyManagerPanel
```

3. Create systemd service:
```bash
sudo tee /etc/systemd/system/socks5-proxy-admin.service > /dev/null <<EOF
[Unit]
Description=SOCKS5 Proxy Admin Panel
After=network.target

[Service]
Type=simple
User=socks5admin
Group=socks5admin
WorkingDirectory=/opt/socks5-proxy-admin
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

4. Enable and start service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable socks5-proxy-admin
sudo systemctl start socks5-proxy-admin
```

### Using PM2

```bash
npm install -g pm2
pm2 start dist/index.js --name socks5-proxy-admin
pm2 startup
pm2 save
```

### Using Docker

```bash
# Build image
docker build -t socks5-proxy-admin .

# Run container
docker run -d \
  -p 5000:5000 \
  -p 1080:1080 \
  -v $(pwd)/data:/app/data \
  --name socks5-proxy-admin \
  socks5-proxy-admin
```

## Firewall Configuration

### UFW (Ubuntu/Debian)

```bash
sudo ufw allow 5000/tcp comment "SOCKS5 Admin Panel"
sudo ufw allow 1080/tcp comment "SOCKS5 Proxy"
sudo ufw enable
```

### Firewalld (CentOS/RHEL)

```bash
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --permanent --add-port=1080/tcp
sudo firewall-cmd --reload
```

### iptables

```bash
sudo iptables -A INPUT -p tcp --dport 5000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 1080 -j ACCEPT
sudo iptables-save > /etc/iptables/rules.v4
```

## SSL/TLS Setup (Recommended for Production)

### Using Nginx Reverse Proxy

1. Install Nginx:
```bash
sudo apt install nginx  # Ubuntu/Debian
sudo yum install nginx  # CentOS/RHEL
```

2. Configure Nginx:
```bash
sudo tee /etc/nginx/sites-available/socks5-admin > /dev/null <<EOF
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
```

3. Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/socks5-admin /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

4. Install SSL with Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check service status
sudo systemctl status socks5-proxy-admin

# View logs
sudo journalctl -u socks5-proxy-admin -f

# Test health endpoint
curl http://localhost:5000/api/health
```

### Database Backup

```bash
# Backup SQLite database
cp data/database.sqlite data/database.sqlite.backup.$(date +%Y%m%d_%H%M%S)

# Automated backup script
sudo tee /opt/backup-socks5-db.sh > /dev/null <<'EOF'
#!/bin/bash
BACKUP_DIR="/opt/socks5-proxy-admin/backups"
mkdir -p $BACKUP_DIR
cp /opt/socks5-proxy-admin/data/database.sqlite $BACKUP_DIR/database.sqlite.$(date +%Y%m%d_%H%M%S)
find $BACKUP_DIR -name "*.sqlite.*" -mtime +7 -delete
EOF

sudo chmod +x /opt/backup-socks5-db.sh

# Add to crontab for daily backups
echo "0 2 * * * /opt/backup-socks5-db.sh" | sudo crontab -
```

### Log Rotation

```bash
sudo tee /etc/logrotate.d/socks5-proxy-admin > /dev/null <<EOF
/var/log/socks5-proxy-admin/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 socks5admin socks5admin
    postrotate
        systemctl reload socks5-proxy-admin
    endscript
}
EOF
```

## Troubleshooting

### Common Issues

1. **Service fails to start**:
   - Check logs: `sudo journalctl -u socks5-proxy-admin`
   - Verify file permissions: `ls -la /opt/socks5-proxy-admin`
   - Check Node.js version: `node --version`

2. **Database permission errors**:
   ```bash
   sudo chown -R socks5admin:socks5admin /opt/socks5-proxy-admin/data
   sudo chmod 755 /opt/socks5-proxy-admin/data
   ```

3. **Port conflicts**:
   ```bash
   sudo netstat -tlnp | grep :5000
   sudo netstat -tlnp | grep :1080
   ```

4. **Memory issues**:
   - Increase Node.js memory limit in systemd service:
   ```
   Environment=NODE_OPTIONS=--max-old-space-size=2048
   ```

### Performance Tuning

1. **Node.js optimizations**:
   ```bash
   # Add to systemd service
   Environment=NODE_ENV=production
   Environment=NODE_OPTIONS=--max-old-space-size=2048
   ```

2. **SQLite optimizations**:
   - Regular VACUUM operations
   - Proper indexing
   - WAL mode for better concurrency

3. **System limits**:
   ```bash
   # Increase file descriptor limits
   echo "socks5admin soft nofile 65536" >> /etc/security/limits.conf
   echo "socks5admin hard nofile 65536" >> /etc/security/limits.conf
   ```

## Security Checklist

- [ ] Change default admin credentials
- [ ] Use strong JWT secret
- [ ] Enable firewall with minimal ports
- [ ] Configure SSL/TLS
- [ ] Regular security updates
- [ ] Monitor access logs
- [ ] Backup database regularly
- [ ] Use dedicated user account
- [ ] Restrict file permissions

## Update Procedure

1. Stop service:
   ```bash
   sudo systemctl stop socks5-proxy-admin
   ```

2. Backup database:
   ```bash
   cp /opt/socks5-proxy-admin/data/database.sqlite /opt/socks5-proxy-admin/data/database.sqlite.backup
   ```

3. Update code:
   ```bash
   cd /opt/SockProxyManagerPanel
   sudo -u socks5admin git pull origin MAIN
   sudo -u socks5admin npm install
   sudo -u socks5admin npm run build
   sudo -u socks5admin npm prune --production
   ```

4. Start service:
   ```bash
   sudo systemctl start socks5-proxy-admin
   ```

5. Verify:
   ```bash
   curl http://localhost:5000/api/health
   ```