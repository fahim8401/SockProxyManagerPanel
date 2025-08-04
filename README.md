# Socks5 Panel - Professional SOCKS5 Proxy Management

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![Platform](https://img.shields.io/badge/platform-Linux-lightgrey.svg)](https://www.linux.org/)

> **Complete SAAS Platform** for professional SOCKS5 proxy management with enterprise-grade features, built using Xray-core framework.

## 🚀 Quick Installation

**Single Command Installation** (recommended):
```bash
curl -fsSL https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/MAIN/install-linux.sh | sudo bash
```

**With Custom Domain**:
```bash
curl -fsSL https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/MAIN/install-linux.sh | sudo bash -s yourdomain.com
```

## 🌟 Key Features

### 🎯 **Professional SAAS Platform**
- **User Management** - Create, edit, delete users with package-based billing
- **Package Plans** - Flexible data limits, speed controls, and expiry management
- **IP Pool Selection** - Dedicated IP assignment for enterprise clients
- **Real-time Analytics** - Monitor usage, connections, and performance metrics
- **External API** - Complete REST API for third-party integrations

### 🔧 **Enterprise-Grade Infrastructure**
- **Xray-core v24.9.30** - High-performance proxy framework (same as 3x-ui)
- **Universal Linux Support** - Works on Ubuntu, Debian, CentOS, RHEL, Fedora, Arch, Alpine
- **Production Ready** - Systemd services, Nginx reverse proxy, SSL certificates
- **Security Hardened** - JWT authentication, bcryptjs hashing, firewall configuration
- **Automated Backups** - Daily backups with 7-day retention

### 📊 **Management Interface**
- **Modern Web UI** - Responsive design with dark/light theme support
- **User Portal** - Self-service dashboard for end users
- **Admin Panel** - Comprehensive management tools
- **Real-time Monitoring** - Live connection tracking and bandwidth usage
- **Database Management** - Built-in cleanup and maintenance tools

## 💻 System Requirements

- **OS**: Linux (any distribution)
- **RAM**: 512MB minimum, 1GB recommended
- **Storage**: 2GB free space
- **Network**: Public IP address
- **Ports**: 80 (HTTP), 443 (HTTPS), 1080 (SOCKS5), 5000 (Admin Panel)

## 🔧 Installation Details

### Supported Linux Distributions
- ✅ **Ubuntu** 18.04, 20.04, 22.04, 24.04
- ✅ **Debian** 9, 10, 11, 12
- ✅ **CentOS** 7, 8, 9
- ✅ **RHEL** 7, 8, 9
- ✅ **Rocky Linux** 8, 9
- ✅ **AlmaLinux** 8, 9
- ✅ **Fedora** 35, 36, 37, 38+
- ✅ **Arch Linux** & Manjaro
- ✅ **OpenSUSE** Leap & Tumbleweed
- ✅ **Alpine Linux** 3.15+

### What Gets Installed
1. **Node.js 18.x** - Application runtime (with dependency conflict resolution)
2. **Xray-core v24.9.30** - High-performance proxy engine
3. **Nginx** - Reverse proxy with WebSocket support
4. **Systemd Service** - Auto-start and process management
5. **Firewall Rules** - Secure port configuration
6. **SSL Certificate** - Automatic HTTPS setup (if domain provided)
7. **Backup System** - Automated daily backups

## 🎮 Default Access Credentials

After installation, access your panel with these default credentials:

### Web Interface
- **URL**: `http://your-server-ip` or `https://yourdomain.com`
- **Admin Login**: `admin` / `admin123`

### SOCKS5 Proxy
- **Server**: `your-server-ip:1080`
- **Username**: `testuser`
- **Password**: `testpass`

> ⚠️ **Important**: Change default passwords immediately after installation!

## 📱 Management Commands

```bash
# Check service status
sudo systemctl status xray-socks5

# View real-time logs
sudo journalctl -u xray-socks5 -f

# Restart the service
sudo systemctl restart xray-socks5

# Create manual backup
sudo /opt/xray-socks5/backup.sh

# View Nginx configuration
sudo nano /etc/nginx/sites-available/xray-socks5
```

## 🔗 API Integration

Complete REST API for external integrations:

```bash
# Get all users
curl -H "X-API-Key: your-api-key" http://your-server/api/external/users

# Create new user
curl -X POST -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"username":"newuser","password":"password123","dataLimit":10737418240}' \
  http://your-server/api/external/users

# Get system statistics
curl -H "X-API-Key: your-api-key" http://your-server/api/external/stats
```

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Client Apps   │───▶│   Nginx      │───▶│  Socks5 Panel   │
│  (Web Browser)  │    │ (Port 80/443)│    │   (Port 5000)   │
└─────────────────┘    └──────────────┘    └─────────────────┘
                                                    │
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│  SOCKS5 Client  │───▶│  Xray-core   │───▶│   SQLite DB     │
│  (Applications) │    │ (Port 1080)  │    │   (Data Store)  │
└─────────────────┘    └──────────────┘    └─────────────────┘
```

## 🛠️ Configuration Files

- **Application**: `/opt/xray-socks5/`
- **Service**: `/etc/systemd/system/xray-socks5.service`
- **Nginx**: `/etc/nginx/sites-available/xray-socks5`
- **Logs**: `/var/log/nginx/` and `journalctl -u xray-socks5`
- **Backups**: `/opt/xray-socks5/backups/`

## 🔒 Security Features

- **JWT Authentication** - Secure session management
- **bcryptjs Password Hashing** - Industry-standard encryption
- **API Key Authentication** - External integration security
- **Firewall Configuration** - Automated port security
- **SSL/TLS Support** - HTTPS encryption
- **Process Isolation** - Dedicated user and permissions
- **Security Hardening** - Systemd security features

## 📈 Monitoring & Analytics

- **Real-time Connection Tracking** - Live user sessions
- **Bandwidth Monitoring** - Upload/download statistics
- **User Activity Logs** - Detailed access records
- **System Performance** - CPU, memory, and network metrics
- **Package Usage Tracking** - Data consumption by plan
- **IP Pool Management** - Available and assigned addresses

## 🆘 Troubleshooting

### Installation Issues
```bash
# Check if all services are running
sudo systemctl status xray-socks5 nginx

# View installation logs
sudo journalctl -u xray-socks5 --since today

# Test Nginx configuration
sudo nginx -t

# Check firewall status
sudo ufw status
```

### Connection Problems
```bash
# Test SOCKS5 proxy
curl --socks5 your-server-ip:1080 --socks5-hostname your-server-ip:1080 http://httpbin.org/ip

# Check if ports are open
sudo netstat -tlnp | grep -E '(1080|5000|80|443)'

# Restart all services
sudo systemctl restart xray-socks5 nginx
```

### Log Locations
- **Application Logs**: `sudo journalctl -u xray-socks5 -f`
- **Nginx Access**: `sudo tail -f /var/log/nginx/access.log`
- **Nginx Errors**: `sudo tail -f /var/log/nginx/error.log`
- **System Logs**: `sudo dmesg | tail -20`

## 🔄 Updates & Maintenance

### Update to Latest Version
```bash
# Download latest installation script
curl -fsSL https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/MAIN/install-linux.sh -o install-linux.sh

# Run update (preserves data)
sudo bash install-linux.sh
```

### Manual Backup
```bash
# Create backup
sudo /opt/xray-socks5/backup.sh

# Restore from backup
sudo systemctl stop xray-socks5
sudo tar -xzf /opt/xray-socks5/backups/backup_file.tar.gz -C /
sudo systemctl start xray-socks5
```

## 🤝 Support & Community

- **Documentation**: [Complete API Documentation](API_DOCUMENTATION.md)
- **GitHub Issues**: [Report Problems](https://github.com/fahim8401/SockProxyManagerPanel/issues)
- **Feature Requests**: Open a GitHub issue with enhancement label

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🏢 Enterprise Features

- ✅ **Multi-tenant Architecture** - Separate user spaces
- ✅ **Package-based Billing** - Flexible pricing plans
- ✅ **External API Integration** - REST API for automation
- ✅ **Real-time Analytics** - Comprehensive reporting
- ✅ **IP Pool Management** - Dedicated IP assignment
- ✅ **Automated Backups** - Data protection
- ✅ **SSL/TLS Security** - Enterprise-grade encryption
- ✅ **High Availability** - Production-ready deployment

---

**Made by [fasthostbd.cloud](https://fasthostbd.cloud) | © 2025 All Rights Reserved**

> 🚀 **Ready to deploy?** Run the installation command and have your professional SOCKS5 management platform running in minutes!