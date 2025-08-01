# 🚀 SOCKS5 Proxy Admin Panel - Final Production Release

![SOCKS5 Proxy Admin Panel](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)
![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

A comprehensive, enterprise-grade SOCKS5 proxy management system with complete administrative interface. Features real-time monitoring, user management, API integration, IP pool management, and advanced analytics.

## ✨ Key Features

### 🎯 Complete SOCKS5 Proxy Server
- **Multi-user Authentication**: Secure username/password authentication
- **Real-time Connection Tracking**: Monitor active connections and bandwidth usage
- **Data Quota Management**: Per-user bandwidth limits and monitoring
- **IP Pool Assignment**: Automatic IP address assignment from managed pool
- **Custom Port Configuration**: Flexible port assignment for users

### 🖥️ Advanced Admin Dashboard
- **Real-time Statistics**: Live monitoring of users, connections, and data transfer
- **WebSocket Integration**: Real-time updates without page refresh
- **System Health Monitoring**: Server status and performance metrics
- **Interactive Analytics**: Charts and graphs for usage patterns
- **Connection Health**: Live connection status and diagnostics

### 👥 Enhanced User Management
- **Complete User Profiles**: Detailed user information with network configuration
- **Visual Data Usage**: Progress bars and usage statistics
- **Suspend/Resume Controls**: Instant user account management
- **Expiration Tracking**: Time-based access control with alerts
- **Activity Timeline**: User connection history and patterns

### 🔑 API Management System
- **API Key Generation**: Secure API key creation and management
- **External API Endpoints**: RESTful API for integration (/api/v1/users)
- **Complete Documentation**: Built-in API documentation with examples
- **Rate Limiting**: API usage controls and monitoring
- **Authentication Security**: Secure API key validation

### 🌐 IP Pool Management
- **IPv4/IPv6 Support**: Complete support for both IP versions
- **Network Scanning**: Automatic detection of available IP addresses
- **Dynamic Assignment**: Automatic IP assignment to users
- **Geographic Distribution**: Support for multiple IP ranges
- **Availability Tracking**: Real-time IP usage monitoring

### 📊 Comprehensive Analytics
- **Usage Patterns**: Detailed analysis of user behavior
- **Bandwidth Analytics**: Data transfer patterns and trends
- **Connection Statistics**: Success rates and performance metrics
- **Geographic Distribution**: User location analytics
- **Historical Data**: Long-term usage trends and reporting

### 🔒 Enterprise Security
- **JWT Authentication**: Secure admin panel access
- **bcrypt Password Hashing**: Industry-standard password security
- **Rate Limiting**: Protection against abuse and attacks
- **Session Management**: Secure session handling
- **Audit Logging**: Complete activity logging

## 🚀 Quick Installation

### One-Click Installation (Recommended)
```bash
# Download and run the installation script
curl -fsSL https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/main/install.sh | bash

# Or clone and run locally
git clone https://github.com/fahim8401/SockProxyManagerPanel.git
cd SockProxyManagerPanel
chmod +x install.sh
sudo ./install.sh
```

### Manual Installation
```bash
# Clone the repository
git clone https://github.com/fahim8401/SockProxyManagerPanel.git
cd SockProxyManagerPanel

# Install dependencies
npm install

# Build for production
npm run build

# Initialize database
npm run db:push

# Start the application
npm start
```

## 🎯 Access Information

### Admin Panel
- **URL**: `http://your-server-ip` or `http://localhost:5000`
- **Default Username**: `admin`
- **Default Password**: `admin123`

### SOCKS5 Proxy
- **Host**: Your server IP address
- **Port**: `1080`
- **Authentication**: Username/password from created users

## 📡 API Documentation

### Authentication
All API endpoints require authentication via API key:
```bash
Authorization: Bearer <your-api-key>
```

### External API Endpoints

#### Get All Users
```bash
GET /api/v1/users
```

#### Create User
```bash
POST /api/v1/users
Content-Type: application/json

{
  "username": "newuser",
  "password": "securepassword",
  "email": "user@example.com",
  "dataLimit": 10737418240,
  "daysValid": 30,
  "ipAddress": "192.168.1.100",
  "port": 1080
}
```

#### Update User
```bash
PATCH /api/v1/users/:id
Content-Type: application/json

{
  "isActive": false,
  "dataLimit": 21474836480
}
```

#### Delete User
```bash
DELETE /api/v1/users/:id
```

### Response Format
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "username": "username",
    "email": "user@example.com",
    "isActive": true,
    "dataLimit": 10737418240,
    "dataUsed": 1073741824,
    "ipAddress": "192.168.1.100",
    "port": 1080,
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

## 🛠️ Configuration

### Environment Variables
```bash
# Required
DATABASE_URL=file:./database.sqlite
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production

# Optional
PORT=5000
SOCKS_PORT=1080
```

### System Requirements
- **OS**: Linux (Ubuntu 18+, Debian 9+, CentOS 7+)
- **Node.js**: 18.0+ or 20.0+ (recommended)
- **RAM**: 512MB minimum, 2GB+ recommended
- **Storage**: 1GB minimum, 10GB+ recommended
- **Network**: Public IP address

## 🔧 Service Management

### Systemd Commands
```bash
# Start service
sudo systemctl start socks-proxy-admin

# Stop service
sudo systemctl stop socks-proxy-admin

# Restart service
sudo systemctl restart socks-proxy-admin

# Check status
sudo systemctl status socks-proxy-admin

# View logs
sudo journalctl -u socks-proxy-admin -f
```

### Manual Commands
```bash
# Development mode
npm run dev

# Production mode
npm start

# Build application
npm run build

# Database operations
npm run db:push
```

## 📊 Usage Examples

### SOCKS5 Client Configuration

#### Node.js with socks-proxy-agent
```javascript
const { SocksProxyAgent } = require('socks-proxy-agent');

const agent = new SocksProxyAgent({
  hostname: 'your-server-ip',
  port: 1080,
  username: 'your-username',
  password: 'your-password'
});

const response = await fetch('https://api.example.com', { agent });
```

#### cURL
```bash
curl --socks5 username:password@your-server-ip:1080 https://api.example.com
```

#### Python with requests
```python
import requests

proxies = {
    'http': 'socks5://username:password@your-server-ip:1080',
    'https': 'socks5://username:password@your-server-ip:1080'
}

response = requests.get('https://api.example.com', proxies=proxies)
```

## 🔒 Security Best Practices

### Initial Setup
1. **Change Default Password**: Immediately change the default admin password
2. **Update System**: Keep the server OS and packages updated
3. **Configure Firewall**: Properly configure firewall rules
4. **SSL/TLS**: Install SSL certificates for HTTPS access
5. **Regular Backups**: Set up automated database backups

### Ongoing Security
- Monitor system logs regularly
- Update application dependencies
- Review user access patterns
- Implement fail2ban for additional protection
- Use strong passwords for all accounts

## 📈 Monitoring & Analytics

### Built-in Dashboard
- Real-time connection monitoring
- Bandwidth usage analytics
- User activity tracking
- System performance metrics
- Geographic distribution maps

### Log Files
- Application logs: `journalctl -u socks-proxy-admin`
- Nginx logs: `/var/log/nginx/`
- System logs: `/var/log/syslog`

## 🚀 Production Deployment

### Nginx Configuration
The installation script automatically configures Nginx as a reverse proxy. For manual setup:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### SSL/TLS Setup (Let's Encrypt)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📋 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :5000
sudo lsof -i :1080

# Kill the process
sudo kill -9 <PID>
```

#### Database Issues
```bash
# Reset database
rm database.sqlite
npm run db:push
```

#### Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER /opt/socks-proxy-admin
chmod +x /opt/socks-proxy-admin/install.sh
```

#### Service Won't Start
```bash
# Check logs
sudo journalctl -u socks-proxy-admin -n 50

# Check configuration
sudo systemctl status socks-proxy-admin
```

## 📞 Support & Documentation

### Additional Resources
- **Installation Guide**: [UBUNTU_INSTALLATION_GUIDE.md](UBUNTU_INSTALLATION_GUIDE.md)
- **VPS Setup**: [VPS_SETUP_GUIDE.md](VPS_SETUP_GUIDE.md)
- **Production Deployment**: [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)
- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### Getting Help
1. Check the troubleshooting guide first
2. Review system logs for error messages
3. Ensure all requirements are met
4. Verify network connectivity and firewall settings

## 🏆 Features Summary

✅ **Complete SOCKS5 Proxy Server** with multi-user authentication  
✅ **Real-time Admin Dashboard** with live monitoring  
✅ **Enhanced User Management** with detailed profiles and controls  
✅ **API Management System** with key generation and documentation  
✅ **IP Pool Management** with automatic assignment  
✅ **Comprehensive Analytics** with historical data  
✅ **Enterprise Security** with rate limiting and encryption  
✅ **Cross-platform Support** for Linux distributions  
✅ **One-click Installation** with automated setup  
✅ **Production Ready** with optimization and monitoring  

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

---

**Ready for production deployment!** 🚀

This system provides enterprise-level SOCKS5 proxy management with complete administrative control, real-time monitoring, and comprehensive user management capabilities.