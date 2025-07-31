# Troubleshooting Guide

## Installation Issues

### Build Failure: "vite: not found"

**Problem**: During installation, the build fails with "vite: not found" error.

**Solution**: The updated install.sh script now installs all dependencies first, builds the application, then cleans up dev dependencies. If you encounter this issue:

```bash
# Manual fix
cd /opt/SockProxyManagerPanel
sudo -u socks5admin npm install  # Install all dependencies
sudo -u socks5admin npm run build  # Build application
sudo -u socks5admin npm prune --production  # Clean dev dependencies
```

### Permission Errors

**Problem**: Permission denied errors during installation.

**Solution**:
```bash
# Fix ownership
sudo chown -R socks5admin:socks5admin /opt/SockProxyManagerPanel

# Fix permissions
sudo chmod -R 755 /opt/SockProxyManagerPanel
sudo chmod 600 /opt/SockProxyManagerPanel/.env
```

### Service Won't Start

**Problem**: systemd service fails to start.

**Diagnosis**:
```bash
# Check service status
sudo systemctl status socks5-proxy-admin

# View logs
sudo journalctl -u socks5-proxy-admin -n 50

# Check if port is in use
sudo netstat -tlnp | grep :5000
sudo netstat -tlnp | grep :1080
```

**Common Solutions**:
1. **Port conflicts**:
   ```bash
   # Kill process using port 5000
   sudo lsof -ti:5000 | xargs sudo kill -9
   
   # Kill process using port 1080
   sudo lsof -ti:1080 | xargs sudo kill -9
   ```

2. **Node.js path issues**:
   ```bash
   # Find Node.js path
   which node
   
   # Update systemd service if needed
   sudo systemctl edit socks5-proxy-admin
   ```

3. **Environment variables**:
   ```bash
   # Check .env file exists
   ls -la /opt/SockProxyManagerPanel/.env
   
   # Verify permissions
   sudo chmod 600 /opt/SockProxyManagerPanel/.env
   ```

### Database Issues

**Problem**: Database connection or initialization errors.

**Solution**:
```bash
# Check database directory
ls -la /opt/SockProxyManagerPanel/data/

# Fix database permissions
sudo chown -R socks5admin:socks5admin /opt/SockProxyManagerPanel/data
sudo chmod 755 /opt/SockProxyManagerPanel/data

# Check database file
sudo -u socks5admin sqlite3 /opt/SockProxyManagerPanel/data/database.sqlite ".tables"
```

### Firewall Issues

**Problem**: Can't access admin panel from external IP.

**Diagnosis**:
```bash
# Check if service is listening
sudo netstat -tlnp | grep :5000

# Test local connection
curl http://localhost:5000/api/health

# Check firewall status
sudo ufw status
```

**Solutions**:
```bash
# UFW (Ubuntu/Debian)
sudo ufw allow 5000/tcp
sudo ufw allow 1080/tcp
sudo ufw reload

# Firewalld (CentOS/RHEL)
sudo firewall-cmd --add-port=5000/tcp --permanent
sudo firewall-cmd --add-port=1080/tcp --permanent
sudo firewall-cmd --reload

# iptables
sudo iptables -A INPUT -p tcp --dport 5000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 1080 -j ACCEPT
sudo iptables-save
```

## Runtime Issues

### Login Problems

**Problem**: Can't login to admin panel.

**Solutions**:
1. **Check default credentials**:
   ```bash
   # View .env file
   sudo cat /opt/SockProxyManagerPanel/.env | grep ADMIN
   ```

2. **Reset admin credentials**:
   ```bash
   # Edit .env file
   sudo nano /opt/SockProxyManagerPanel/.env
   
   # Restart service
   sudo systemctl restart socks5-proxy-admin
   ```

### SOCKS5 Connection Issues

**Problem**: SOCKS5 proxy connections fail.

**Diagnosis**:
1. **Test SOCKS5 server**:
   ```bash
   # Check if SOCKS5 server is listening
   sudo netstat -tlnp | grep :1080
   
   # Test with curl (if socks5 user exists)
   curl --socks5 username:password@localhost:1080 http://httpbin.org/ip
   ```

2. **Check user credentials**:
   - Login to admin panel
   - Verify user exists and is active
   - Check expiration date and data limits

**Solutions**:
1. **Restart SOCKS5 service**:
   ```bash
   sudo systemctl restart socks5-proxy-admin
   ```

2. **Check logs for SOCKS5 errors**:
   ```bash
   sudo journalctl -u socks5-proxy-admin | grep -i socks
   ```

### Performance Issues

**Problem**: Slow response times or high memory usage.

**Solutions**:
1. **Check system resources**:
   ```bash
   # Memory usage
   free -h
   
   # CPU usage
   top -p $(pgrep -f "node.*dist/index.js")
   
   # Disk space
   df -h
   ```

2. **Optimize Node.js**:
   ```bash
   # Edit systemd service
   sudo systemctl edit socks5-proxy-admin
   
   # Add memory optimization
   [Service]
   Environment=NODE_OPTIONS=--max-old-space-size=2048
   ```

3. **Database optimization**:
   ```bash
   # Vacuum SQLite database
   sudo -u socks5admin sqlite3 /opt/SockProxyManagerPanel/data/database.sqlite "VACUUM;"
   
   # Analyze database
   sudo -u socks5admin sqlite3 /opt/SockProxyManagerPanel/data/database.sqlite "ANALYZE;"
   ```

## Recovery Procedures

### Complete Reinstallation

If all else fails, completely reinstall:

```bash
# Stop and remove service
sudo systemctl stop socks5-proxy-admin
sudo systemctl disable socks5-proxy-admin
sudo rm /etc/systemd/system/socks5-proxy-admin.service

# Backup database (if needed)
sudo cp /opt/SockProxyManagerPanel/data/database.sqlite /tmp/database.sqlite.backup

# Remove installation
sudo rm -rf /opt/SockProxyManagerPanel
sudo userdel socks5admin

# Reinstall
curl -sSL https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/refs/heads/MAIN/install.sh | sudo bash

# Restore database (if needed)
sudo systemctl stop socks5-proxy-admin
sudo cp /tmp/database.sqlite.backup /opt/SockProxyManagerPanel/data/database.sqlite
sudo chown socks5admin:socks5admin /opt/SockProxyManagerPanel/data/database.sqlite
sudo systemctl start socks5-proxy-admin
```

### Backup and Restore

**Backup**:
```bash
# Create backup directory
sudo mkdir -p /opt/backups

# Backup database
sudo cp /opt/SockProxyManagerPanel/data/database.sqlite /opt/backups/database.sqlite.$(date +%Y%m%d_%H%M%S)

# Backup configuration
sudo cp /opt/SockProxyManagerPanel/.env /opt/backups/.env.$(date +%Y%m%d_%H%M%S)
```

**Restore**:
```bash
# Stop service
sudo systemctl stop socks5-proxy-admin

# Restore database
sudo cp /opt/backups/database.sqlite.YYYYMMDD_HHMMSS /opt/SockProxyManagerPanel/data/database.sqlite

# Fix permissions
sudo chown socks5admin:socks5admin /opt/SockProxyManagerPanel/data/database.sqlite

# Start service
sudo systemctl start socks5-proxy-admin
```

## Getting Help

### Log Collection

When reporting issues, collect these logs:

```bash
# System info
uname -a
cat /etc/os-release

# Service status
sudo systemctl status socks5-proxy-admin

# Service logs (last 100 lines)
sudo journalctl -u socks5-proxy-admin -n 100

# System logs related to the service
sudo journalctl --since "1 hour ago" | grep -i socks

# Network status
sudo netstat -tlnp | grep -E ":(5000|1080)"

# Disk space
df -h

# Memory usage
free -h
```

### Debug Mode

Enable debug logging:

```bash
# Edit systemd service
sudo systemctl edit socks5-proxy-admin

# Add debug environment
[Service]
Environment=NODE_ENV=development
Environment=DEBUG=*

# Restart service
sudo systemctl restart socks5-proxy-admin

# View debug logs
sudo journalctl -u socks5-proxy-admin -f
```

### Contact Information

- **GitHub Issues**: https://github.com/fahim8401/SockProxyManagerPanel/issues
- **Documentation**: Check README.md and DEPLOYMENT.md
- **Community**: GitHub Discussions