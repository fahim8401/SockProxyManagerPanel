# SOCKS5 Proxy Admin Panel - Ubuntu Installation Guide

This comprehensive guide will help you install and deploy the SOCKS5 Proxy Management System on Ubuntu Server.

## System Requirements

- Ubuntu Server 20.04 LTS or higher
- Minimum 2GB RAM (4GB recommended)
- 20GB free disk space
- Root or sudo access
- Internet connection

## Features Overview

This SOCKS5 proxy management system includes:

✅ **Complete Admin Dashboard**
- Real-time statistics and monitoring
- User management with quotas and expiration
- IP pool management (IPv4/IPv6)
- Detailed analytics and reporting
- System logs and activity monitoring
- Comprehensive settings panel

✅ **SOCKS5 Proxy Server**
- Full SOCKS5 protocol implementation
- User authentication with database
- Bandwidth tracking and quotas
- Connection monitoring
- IP assignment from managed pool
- Real-time connection tracking

✅ **Security Features**
- Rate limiting protection
- Geographic blocking options
- Fail2Ban integration
- Strong authentication
- Session management
- Encrypted connections

✅ **Advanced Features**
- WebSocket real-time updates
- Multi-IP support (IPv4/IPv6)
- Data usage monitoring
- Connection history
- Automated backups
- User activity logs

## Installation Steps

### 1. Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js 20.x

```bash
# Install Node.js repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### 3. Install PostgreSQL Database

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

In PostgreSQL shell:
```sql
CREATE DATABASE socks5_proxy;
CREATE USER socks5_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE socks5_proxy TO socks5_user;
\q
```

### 4. Install Additional Dependencies

```bash
# Install build tools
sudo apt install -y build-essential git curl

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install -y nginx

# Install UFW firewall
sudo apt install -y ufw
```

### 5. Clone and Setup Application

```bash
# Create application directory
sudo mkdir -p /opt/socks5-admin
cd /opt/socks5-admin

# Clone your application (replace with your repository)
git clone https://github.com/fahim8401/SockProxyManager.git .

# Set proper permissions
sudo chown -R $USER:$USER /opt/socks5-admin

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### 6. Configure Environment Variables

Edit the `.env` file:

```bash
sudo nano .env
```

Add these configurations:

```env
# Database Configuration
DATABASE_URL="postgresql://socks5_user:your_secure_password@localhost:5432/socks5_proxy"

# Server Configuration
PORT=5000
NODE_ENV=production

# SOCKS5 Configuration
SOCKS5_PORT=1080
SOCKS5_HOST=0.0.0.0

# Security Configuration
JWT_SECRET=your_jwt_secret_key_here
SESSION_SECRET=your_session_secret_here

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password

# Optional: Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 7. Setup Database Schema

```bash
# Run database migrations
npm run db:push

# Seed initial data (optional)
npm run db:seed
```

### 8. Build Application

```bash
# Build the application
npm run build

# Test the build
npm start
```

### 9. Configure Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow SOCKS5 proxy port
sudo ufw allow 1080

# Allow admin panel port (temporary)
sudo ufw allow 5000

# Check status
sudo ufw status
```

### 10. Configure Nginx Reverse Proxy

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/socks5-admin
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

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

    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/socks5-admin /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 11. Setup SSL Certificate (Optional but Recommended)

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
```

Add this line to crontab:
```bash
0 12 * * * /usr/bin/certbot renew --quiet
```

### 12. Setup PM2 Process Manager

Create PM2 ecosystem file:

```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'socks5-admin',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    log_file: '/var/log/pm2/socks5-admin.log',
    error_file: '/var/log/pm2/socks5-admin-error.log',
    out_file: '/var/log/pm2/socks5-admin-out.log',
    max_memory_restart: '1G'
  }]
};
```

Start the application:

```bash
# Create log directory
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

### 13. Setup System Services

Create a systemd service for the SOCKS5 proxy:

```bash
sudo nano /etc/systemd/system/socks5-proxy.service
```

```ini
[Unit]
Description=SOCKS5 Proxy Server
After=network.target

[Service]
Type=simple
User=socks5-user
Group=socks5-user
WorkingDirectory=/opt/socks5-admin
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Create socks5 user:

```bash
sudo useradd -r -s /bin/false socks5-user
sudo chown -R socks5-user:socks5-user /opt/socks5-admin
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable socks5-proxy
sudo systemctl start socks5-proxy
```

### 14. Setup Log Rotation

```bash
sudo nano /etc/logrotate.d/socks5-admin
```

```bash
/var/log/pm2/socks5-admin*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 ubuntu ubuntu
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 15. Setup Monitoring (Optional)

Install monitoring tools:

```bash
# Install htop for system monitoring
sudo apt install -y htop

# Install netstat for network monitoring
sudo apt install -y net-tools

# Check if services are running
sudo systemctl status socks5-proxy
sudo systemctl status nginx
sudo systemctl status postgresql
pm2 status
```

## Configuration

### Default Admin Access

Once installed, access the admin panel at:
- **URL**: `http://your-server-ip` or `https://your-domain.com`
- **Username**: `admin`
- **Password**: The password you set in the `.env` file

### SOCKS5 Proxy Settings

Your SOCKS5 proxy will be available at:
- **Host**: Your server IP
- **Port**: `1080`
- **Authentication**: Username/Password (created through admin panel)

### Adding IP Addresses

1. Login to admin panel
2. Go to "IP Pool Management"
3. Add IPv4/IPv6 addresses that will be assigned to users
4. Users will get IPs from this pool when created

### Creating Users

1. Go to "Dashboard"
2. Click "Add User"
3. Fill in user details:
   - Username and password
   - Select IP address from pool
   - Set port (or use random)
   - Set data limit (GB)
   - Set expiration days
   - Optional email

## Testing

### Test SOCKS5 Proxy

```bash
# Test with curl (replace with your server IP and user credentials)
curl --socks5 username:password@your-server-ip:1080 http://httpbin.org/ip
```

### Test Admin Panel

```bash
# Check if admin panel is accessible
curl -I http://your-server-ip

# Check WebSocket connection
# This should show upgrade to WebSocket
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: SGVsbG8sIHdvcmxkIQ==" -H "Sec-WebSocket-Version: 13" http://your-server-ip/ws
```

## Maintenance

### Daily Maintenance

```bash
# Check system status
sudo systemctl status socks5-proxy nginx postgresql
pm2 status

# Check logs
pm2 logs socks5-admin
sudo tail -f /var/log/nginx/error.log

# Check system resources
htop
df -h
```

### Backup Database

```bash
# Create backup script
sudo nano /opt/socks5-admin/backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/socks5-admin/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup database
pg_dump -h localhost -U socks5_user socks5_proxy > $BACKUP_DIR/db_backup_$DATE.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_backup_$DATE.sql"
```

Make executable and add to cron:

```bash
chmod +x /opt/socks5-admin/backup.sh
sudo crontab -e
```

Add this line for daily backup at 2 AM:
```bash
0 2 * * * /opt/socks5-admin/backup.sh
```

### Update Application

```bash
cd /opt/socks5-admin

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Rebuild application
npm run build

# Restart services
pm2 restart socks5-admin
sudo systemctl restart socks5-proxy
```

## Troubleshooting

### Common Issues

1. **Can't connect to SOCKS5 proxy**
   ```bash
   # Check if service is running
   sudo systemctl status socks5-proxy
   
   # Check if port is open
   sudo netstat -tulpn | grep :1080
   
   # Check firewall
   sudo ufw status
   ```

2. **Admin panel not accessible**
   ```bash
   # Check PM2 status
   pm2 status
   
   # Check Nginx
   sudo systemctl status nginx
   
   # Check logs
   pm2 logs socks5-admin
   sudo tail -f /var/log/nginx/error.log
   ```

3. **Database connection issues**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Test database connection
   psql -h localhost -U socks5_user -d socks5_proxy
   ```

### Performance Optimization

1. **Increase file descriptor limits**
   ```bash
   sudo nano /etc/security/limits.conf
   ```
   
   Add:
   ```
   * soft nofile 65536
   * hard nofile 65536
   ```

2. **Optimize PostgreSQL**
   ```bash
   sudo nano /etc/postgresql/14/main/postgresql.conf
   ```
   
   Adjust based on your server specs:
   ```
   shared_buffers = 256MB
   effective_cache_size = 1GB
   work_mem = 4MB
   maintenance_work_mem = 64MB
   ```

3. **Enable connection pooling**
   Install and configure pgBouncer for better database performance.

## Security Considerations

1. **Change default passwords** immediately after installation
2. **Enable SSL/TLS** for admin panel
3. **Use strong passwords** for all accounts
4. **Regularly update** the system and application
5. **Monitor logs** for suspicious activity
6. **Backup data** regularly
7. **Limit admin panel access** to specific IP addresses if possible

## Support

For issues and support:
1. Check the logs first
2. Review this installation guide
3. Check system resources (RAM, disk space, CPU)
4. Verify all services are running
5. Test network connectivity

This installation provides a complete, production-ready SOCKS5 proxy management system with all advanced features enabled.