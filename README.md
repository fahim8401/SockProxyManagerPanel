# Xray SOCKS5 Management System - Complete SAAS Platform

[![Version](https://img.shields.io/badge/version-2.0-blue.svg)](https://github.com/fahim8401/SockProxyManagerPanel)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Linux-orange.svg)](README.md)
[![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen.svg)](README.md)

A comprehensive commercial SAAS platform for SOCKS5 proxy management using Xray-core framework. Features enterprise-grade proxy management with package-based billing, IP selection options, data limits, expiry management, external API integration, and full automation.

## 🌟 Key Features

### 🚀 **Production-Ready SAAS Platform**
- **Package-Based Billing System** - Basic, Premium, Enterprise tiers
- **User Management** - Complete CRUD operations with package assignments
- **IP Pool Management** - Select specific IPs for users during creation
- **Data Limits & Expiry** - Customizable limits and validity periods
- **External API** - Secure integration endpoints with API key authentication
- **Real-time Analytics** - Comprehensive monitoring and reporting
- **Modern Web Interface** - Professional admin dashboard

### 🔧 **Enterprise Management**
- **Xray-core v24.9.30** - Latest stable proxy framework
- **WebSocket Real-time Updates** - Live connection monitoring
- **Database Cleaning** - Preserve admin data while clearing user data
- **Automated Backups** - Daily scheduled backups with retention
- **Speed Testing** - Integrated network performance monitoring
- **Multi-IP Support** - Advanced routing and IP assignment

### 🛡️ **Security & Authentication**
- **JWT Authentication** - Secure admin access
- **API Key Management** - External integration security
- **Role-based Access** - Admin and API user permissions
- **bcrypt Password Hashing** - Industry-standard security
- **SSL/TLS Support** - Production encryption ready

### 🌍 **Universal Linux Compatibility**
- **All Linux Distributions** - Ubuntu, Debian, CentOS, RHEL, Fedora, Arch, Alpine
- **Automated Installation** - Single command deployment
- **Systemd Integration** - Professional service management
- **Nginx Reverse Proxy** - Production web server setup
- **Firewall Configuration** - Automatic security setup

## 📋 System Requirements

### Minimum Requirements
- **OS**: Any Linux distribution (Ubuntu 18+, Debian 9+, CentOS 7+, etc.)
- **RAM**: 1GB minimum, 2GB recommended
- **CPU**: 1 core minimum, 2+ cores recommended
- **Storage**: 20GB minimum, 50GB recommended
- **Network**: Public IP address for SOCKS5 proxy service

### Recommended for Production
- **RAM**: 4GB or more
- **CPU**: 4+ cores
- **Storage**: 100GB+ SSD
- **Network**: Dedicated server or VPS with good bandwidth
- **Domain**: Optional but recommended for SSL setup

## 🚀 Quick Installation

### One-Command Installation

```bash
# Basic installation
curl -fsSL https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/MAIN/install-linux.sh | sudo bash

# Installation with custom domain (enables SSL)
curl -fsSL https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/MAIN/install-linux.sh | sudo bash -s yourdomain.com
```

### Manual Installation

```bash
# Download installer
wget https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/MAIN/install-linux.sh
chmod +x install-linux.sh

# Run installation
sudo ./install-linux.sh

# Or with domain for SSL
sudo ./install-linux.sh yourdomain.com
```

## 🔧 Configuration

### Default Configuration
- **Web Interface**: Port 5000 (HTTP) / 443 (HTTPS)
- **SOCKS5 Proxy**: Port 1080
- **Database**: SQLite (production-ready with WAL mode)
- **Admin Credentials**: admin / admin123
- **Default SOCKS5 User**: testuser / testpass

### Environment Variables
```bash
# Optional customization
export WEB_PORT=5000
export SOCKS_PORT=1080
export DOMAIN=your-domain.com
```

### Service Management
```bash
# Start/Stop/Restart service
sudo systemctl start xray-socks5
sudo systemctl stop xray-socks5
sudo systemctl restart xray-socks5

# Check status and logs
sudo systemctl status xray-socks5
sudo journalctl -u xray-socks5 -f
```

## 🌐 Access Information

### Web Interfaces
- **Main Dashboard**: `http://your-server-ip:5000`
- **Admin Panel**: `http://your-server-ip:5000/admin`
- **With Domain**: `https://yourdomain.com` (if SSL configured)

### SOCKS5 Proxy Connection
- **Host**: Your server IP
- **Port**: 1080 (default)
- **Username**: testuser (default)
- **Password**: testpass (default)

## 📊 Admin Panel Features

### 🏢 **SAAS Management**
- **Dashboard** - Real-time statistics and system overview
- **Package Management** - Create/edit/delete subscription packages
- **User Management** - Full CRUD with package assignments and IP selection
- **IP Pool Management** - Add/remove/assign IP addresses
- **API Key Management** - Generate secure external integration keys
- **Analytics** - Revenue tracking and user behavior analysis

### ⚙️ **System Administration**
- **General Settings** - Core system configuration
- **Xray Core Management** - Start/stop/restart proxy service
- **Network Performance** - Integrated speed testing with openspeedtest.hplink.com.bd
- **Backup & Maintenance** - Database backup and cleaning tools
- **System Logs** - Real-time log monitoring

### 🧹 **Database Management**
- **Clean Database** - Remove all user data while preserving admin credentials
- **Automated Backups** - Daily backups with 7-day retention
- **Manual Backup** - On-demand database exports

## 🔌 External API

### Authentication
All external API endpoints require an API key in the header:
```bash
X-API-Key: your-generated-api-key
```

### Available Endpoints

#### Users Management
```bash
# Get all users
GET /api/external/users

# Create new user
POST /api/external/users
{
  "username": "newuser",
  "password": "userpass",
  "packageId": 1,
  "dataLimit": 1073741824,
  "validityDays": 30
}

# Get system statistics
GET /api/external/stats
```

### Example API Usage
```bash
# Create a new user via API
curl -X POST http://your-server:5000/api/external/users \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "username": "client1",
    "password": "securepass",
    "packageId": 2,
    "dataLimit": 10737418240,
    "validityDays": 30
  }'
```

## 📦 Package Management

### Default Packages

| Package | Data Limit | Validity | Price | Connections | IPs |
|---------|------------|----------|--------|-------------|-----|
| Basic | 1GB | 30 days | $10.00 | 1 | 1 |
| Premium | 10GB | 30 days | $50.00 | 5 | 3 |
| Enterprise | 100GB | 90 days | $200.00 | 20 | 10 |

### Custom Package Creation
Create unlimited custom packages through the admin panel with:
- Custom data limits (GB/TB)
- Flexible validity periods (days)
- Competitive pricing tiers
- Connection limits
- IP assignment options

## 🛠️ Advanced Configuration

### Custom Port Configuration
```bash
# Edit service file
sudo systemctl edit xray-socks5

# Add custom environment variables
[Service]
Environment=WEB_PORT=8080
Environment=SOCKS_PORT=1080
```

### SSL Certificate Setup
```bash
# Manual SSL setup
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Nginx Custom Configuration
```bash
# Edit Nginx config
sudo nano /etc/nginx/sites-available/xray-socks5

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Security Best Practices

### Essential Security Steps
1. **Change Default Credentials** - Update admin password immediately
2. **Configure Firewall** - Limit access to necessary ports only
3. **Enable SSL** - Use HTTPS for web interface
4. **Regular Updates** - Keep system and dependencies updated
5. **Monitor Logs** - Set up log monitoring and alerting
6. **API Key Management** - Rotate API keys regularly
7. **Backup Strategy** - Implement comprehensive backup plan

### Recommended Firewall Rules
```bash
# UFW (Ubuntu/Debian)
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp  # Web interface
sudo ufw allow 1080/tcp  # SOCKS5 proxy
sudo ufw enable

# FirewallD (CentOS/RHEL/Fedora)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --permanent --add-port=1080/tcp
sudo firewall-cmd --reload
```

## 🔧 Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check service status
sudo systemctl status xray-socks5

# Check logs
sudo journalctl -u xray-socks5 -f

# Check port availability
sudo netstat -tlnp | grep 5000
```

#### Permission Issues
```bash
# Fix ownership
sudo chown -R xray-socks5:xray-socks5 /opt/xray-socks5

# Fix permissions
sudo chmod +x /opt/xray-socks5/server/index.js
```

#### Database Issues
```bash
# Check database file
ls -la /opt/xray-socks5/*.db

# Restore from backup
sudo /usr/local/bin/xray-socks5-backup
```

#### Network Issues
```bash
# Check firewall status
sudo ufw status          # Ubuntu/Debian
sudo firewall-cmd --list-all  # CentOS/RHEL

# Test connectivity
curl http://localhost:5000
telnet your-server-ip 1080
```

## 📚 Documentation

### Architecture Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │───▶│   Nginx Proxy   │───▶│  Node.js App    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                       ┌─────────────────┐           │
                       │  Xray-core      │◀──────────┤
                       │  SOCKS5 Proxy   │           │
                       └─────────────────┘           │
                                                      │
                       ┌─────────────────┐           │
                       │  SQLite DB      │◀──────────┘
                       │  (WAL Mode)     │
                       └─────────────────┘
```

### Database Schema
- **admins** - Administrative user accounts
- **packages** - Subscription package definitions
- **proxy_users** - SOCKS5 proxy user accounts
- **connections** - Active connection tracking
- **ip_pool** - Available IP addresses
- **api_keys** - External API authentication
- **settings** - System configuration
- **xray_configs** - Xray service configuration

## 🤝 Support & Contributing

### Getting Help
- **Issues**: [GitHub Issues](https://github.com/fahim8401/SockProxyManagerPanel/issues)
- **Documentation**: [Project Wiki](https://github.com/fahim8401/SockProxyManagerPanel/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/fahim8401/SockProxyManagerPanel/discussions)

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Setup
```bash
# Clone repository
git clone https://github.com/fahim8401/SockProxyManagerPanel.git
cd SockProxyManagerPanel

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📝 Changelog

### Version 2.0 (Latest)
- ✅ Complete SAAS platform upgrade
- ✅ Package-based user management system
- ✅ IP selection options for users
- ✅ Data limits and expiry management
- ✅ External API integration
- ✅ Database cleaning functionality
- ✅ Speed test integration
- ✅ Universal Linux compatibility
- ✅ Production deployment ready

### Version 1.0
- ✅ Basic SOCKS5 proxy management
- ✅ Web interface
- ✅ User management
- ✅ Xray-core integration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Xray-core** - High-performance proxy framework
- **3x-ui** - Inspiration for management interface
- **Express.js** - Web application framework
- **SQLite** - Reliable database engine
- **Contributors** - Thank you to all contributors

---

**© 2025 Xray SOCKS5 Management System - Production-Ready Commercial SAAS Platform**

*Built with ❤️ for enterprise proxy management*