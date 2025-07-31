# Ubuntu Installation Complete - How to Start

## ✅ Installation Status
Your SOCKS5 Proxy Admin Panel has been successfully installed! Based on your log, the installation completed these steps:

1. ✅ Dependencies installed (720 packages)
2. ✅ Application built successfully 
3. ✅ Database configured (SQLite)
4. ✅ Environment variables set
5. ✅ Firewall configured (ports 5000, 1080)

## 🚀 Starting the Application

### Method 1: Systemd Service (Recommended for Production)

The installer created a systemd service that runs automatically:

```bash
# Check if service is running
sudo systemctl status socks5-proxy-admin

# Start the service
sudo systemctl start socks5-proxy-admin

# Enable auto-start on boot
sudo systemctl enable socks5-proxy-admin

# View real-time logs
sudo journalctl -u socks5-proxy-admin -f
```

### Method 2: Manual Start (For Testing)

If you want to run it manually for testing:

```bash
# Navigate to installation directory
cd /opt/SockProxyManagerPanel

# Start the application
sudo -u socks5admin npm start

# Or run in development mode (with auto-reload)
sudo -u socks5admin npm run dev
```

### Method 3: PM2 Process Manager (Alternative)

For advanced process management:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start with PM2
cd /opt/SockProxyManagerPanel
sudo -u socks5admin pm2 start dist/index.js --name socks5-proxy-admin

# Save PM2 configuration
sudo -u socks5admin pm2 save
sudo -u socks5admin pm2 startup
```

## 🌐 Accessing the Admin Panel

Once started, access your admin panel at:
- **URL**: `http://your-server-ip:5000`
- **Username**: `admin`
- **Password**: `admin123`

### Local Access (from the server itself):
```bash
curl http://localhost:5000/api/health
```

### Remote Access:
Replace `your-server-ip` with your actual server IP address:
```
http://192.168.1.100:5000  # Example IP
```

## 🔧 Service Management Commands

```bash
# Check service status
sudo systemctl status socks5-proxy-admin

# Start service
sudo systemctl start socks5-proxy-admin

# Stop service
sudo systemctl stop socks5-proxy-admin

# Restart service
sudo systemctl restart socks5-proxy-admin

# View logs
sudo journalctl -u socks5-proxy-admin -n 50

# Follow logs in real-time
sudo journalctl -u socks5-proxy-admin -f
```

## 🔍 Verification Steps

1. **Check if services are running:**
   ```bash
   # Check web server (port 5000)
   sudo netstat -tlnp | grep :5000
   
   # Check SOCKS5 proxy (port 1080)
   sudo netstat -tlnp | grep :1080
   ```

2. **Test API endpoint:**
   ```bash
   curl http://localhost:5000/api/health
   # Should return: {"status":"healthy","timestamp":"..."}
   ```

3. **Check database:**
   ```bash
   sudo -u socks5admin sqlite3 /opt/SockProxyManagerPanel/data/database.sqlite ".tables"
   # Should show: admins, connections, ip_pool, users
   ```

## 🛠 Troubleshooting

### If service won't start:
```bash
# Check detailed error logs
sudo journalctl -u socks5-proxy-admin --no-pager

# Check file permissions
ls -la /opt/SockProxyManagerPanel/

# Restart the service
sudo systemctl restart socks5-proxy-admin
```

### If you can't access the web interface:
```bash
# Check firewall status
sudo ufw status

# Ensure ports are open
sudo ufw allow 5000/tcp
sudo ufw allow 1080/tcp

# Check if service is listening
sudo ss -tlnp | grep -E ":(5000|1080)"
```

### If you forgot the admin password:
```bash
# Check environment file
sudo cat /opt/SockProxyManagerPanel/.env

# The default credentials are:
# Username: admin
# Password: admin123
```

## 📊 Next Steps

1. **Access the admin panel** at `http://your-server-ip:5000`
2. **Login** with admin/admin123
3. **Change the default password** in settings
4. **Create SOCKS5 users** in the user management section
5. **Configure IP pool** if needed
6. **Test SOCKS5 connections** using the created users

## 🔒 Security Recommendations

1. **Change default credentials immediately**
2. **Configure SSL/TLS** for HTTPS access
3. **Set up fail2ban** for brute-force protection
4. **Regular database backups**
5. **Keep system updated**

Your SOCKS5 Proxy Admin Panel is now ready to use! 🎉