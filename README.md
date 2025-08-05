# Xray SOCKS5 Management System

## Complete SAAS Platform for SOCKS5 Proxy Management

A comprehensive SOCKS5 proxy management system built with Xray-core, featuring a professional admin panel, user management, package-based billing, and enterprise-grade functionality.

## Features

### 🔐 Professional Admin Panel
- Real-time dashboard with system statistics
- Complete SOCKS5 user management (CRUD operations)
- Package management with pricing tiers
- Connection monitoring and bandwidth tracking
- System settings and database maintenance
- Auto-refresh functionality and alert notifications

### 🌐 SOCKS5 Proxy Service
- High-performance Xray-core v24.9.30 engine
- Multi-user support with individual credentials
- Data limits and expiry management
- Real-time connection monitoring

### 💼 SAAS Platform Features
- Package-based subscription system
- User data limits and validity periods
- Professional web interface
- REST API for external integrations
- SQLite database with extended schema

## Quick Installation

### Single Command Installation

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_REPO/install.sh | sudo bash
```

Or download and run manually:

```bash
wget https://raw.githubusercontent.com/YOUR_REPO/install.sh
chmod +x install.sh
sudo ./install.sh
```

### With Custom Domain

```bash
sudo ./install.sh yourdomain.com
```

## Default Access

After installation, access your system:

- **Web Interface**: `http://YOUR_SERVER_IP:3000`
- **Admin Panel**: `http://YOUR_SERVER_IP:3000/admin`
- **SOCKS5 Proxy**: `YOUR_SERVER_IP:1080`

### Default Credentials

- **Admin Login**: `admin` / `admin123`
- **SOCKS5 User**: `testuser` / `testpass`

## Admin Panel Overview

### Dashboard
- Total users, active users, connections count
- System status monitoring
- Recent activity logs

### User Management
- Create/delete SOCKS5 users
- Set data limits and expiry dates
- Monitor user activity and bandwidth usage

### Package Management
- Create subscription packages
- Set pricing and data limits
- Manage package availability

### Connection Monitoring
- View active connections
- Track bandwidth usage
- Monitor connection history

### System Settings
- Configure SOCKS5 port and limits
- Database maintenance tools
- System configuration options

## API Endpoints

### Health Check
```bash
GET /api/health
```

### User Management
```bash
GET /api/users          # List all users
POST /api/users         # Create new user
DELETE /api/users/:id   # Delete user
```

### Package Management
```bash
GET /api/packages       # List all packages
POST /api/packages      # Create new package
DELETE /api/packages/:id # Delete package
```

### Connections
```bash
GET /api/connections    # List active connections
```

### Admin Operations
```bash
POST /api/admin/clean-database  # Clean database (preserves admin accounts)
```

## Default Packages

The system comes with three pre-configured packages:

1. **Basic** - $9.99/month - 1GB data limit
2. **Premium** - $19.99/month - 5GB data limit  
3. **Enterprise** - $39.99/month - 20GB data limit

## Service Management

Control the service using systemd:

```bash
# Start service
sudo systemctl start xray-socks5

# Stop service
sudo systemctl stop xray-socks5

# Restart service
sudo systemctl restart xray-socks5

# Check status
sudo systemctl status xray-socks5

# View logs
sudo journalctl -u xray-socks5 -f
```

## File Locations

- **Installation Directory**: `/opt/xray-socks5`
- **Database**: `/opt/xray-socks5/xray-socks5.db`
- **Service File**: `/etc/systemd/system/xray-socks5.service`
- **Nginx Config**: `/etc/nginx/sites-available/xray-socks5`

## Requirements

- **OS**: Ubuntu 18+, Debian 9+, CentOS 7+, or compatible Linux
- **Memory**: 512MB RAM minimum
- **Storage**: 1GB free space
- **Network**: Port 80, 443, 1080 access

## Architecture

### Technology Stack
- **Backend**: Node.js with Express.js
- **Database**: SQLite with comprehensive schema
- **Frontend**: Modern HTML/CSS/JavaScript
- **Proxy Engine**: Xray-core v24.9.30
- **Web Server**: Nginx reverse proxy

### Database Schema
- `admins` - Administrative accounts
- `proxy_users` - SOCKS5 user credentials and limits  
- `packages` - Subscription packages with pricing
- `connections` - Connection tracking and monitoring
- `settings` - System configuration

## Security Features

- JWT-based admin authentication
- bcrypt password hashing
- SQL injection protection via prepared statements  
- Firewall configuration (UFW/firewalld)
- Rate limiting and connection monitoring

## Troubleshooting

### Service Won't Start
```bash
sudo journalctl -u xray-socks5 -n 50
```

### Database Issues
```bash
cd /opt/xray-socks5
sqlite3 xray-socks5.db ".tables"
```

### Port Conflicts
```bash
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :1080
```

### Nginx Issues
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## Support

For support and updates:
- Check logs: `sudo journalctl -u xray-socks5 -f`
- Verify service: `sudo systemctl status xray-socks5`
- Test API: `curl http://localhost:3000/api/health`

## License

This project is licensed under the MIT License.

## Version

Current Version: **2.0** - Complete SAAS Platform

Built with Xray-core technology for enterprise-grade performance and reliability.