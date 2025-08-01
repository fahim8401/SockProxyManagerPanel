# SOCKS5 Proxy Admin Panel - Production Deployment Guide

## 🚀 Final Production Release

This is the complete, production-ready SOCKS5 proxy management system with full administrative capabilities.

## ✅ Complete Feature Set

### Core Functionality
- **Full SOCKS5 Proxy Server**: Custom implementation with multi-user authentication
- **Real-time Dashboard**: Live statistics, connection monitoring, system health
- **User Management**: Complete CRUD operations with detailed user profiles
- **API Management**: External API access with key generation and documentation
- **IP Pool Management**: IPv4/IPv6 address assignment and management
- **Admin Management**: Multi-admin system with role-based permissions
- **Analytics**: Comprehensive usage analytics and reporting
- **Security**: Rate limiting, authentication, session management

### Advanced Features
- **Real-time Monitoring**: WebSocket-powered live updates
- **Data Quota Management**: Per-user bandwidth limits and tracking
- **Expiration Controls**: Time-based user access management
- **Suspend/Resume**: User account control with visual indicators
- **Network Detection**: Automatic IP scanning and assignment
- **Export Capabilities**: Data export for reporting and backup

## 🛠 Technical Architecture

### Frontend Stack
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **shadcn/ui** components with Tailwind CSS
- **TanStack Query** for efficient data fetching
- **Wouter** for lightweight routing
- **Real-time WebSocket** integration

### Backend Stack
- **Express.js** with TypeScript
- **SQLite** database with Drizzle ORM
- **JWT** authentication system
- **bcrypt** password hashing
- **Custom SOCKS5** proxy implementation
- **WebSocket** server for real-time updates

### Database Schema
- **Users**: Complete user management with quotas and expiration
- **Connections**: Real-time connection tracking and history
- **IP Pool**: Dynamic IP address management and assignment
- **Admins**: Multi-admin system with permissions and roles

## 🔧 Installation & Setup

### Quick Start (Recommended)
```bash
# Clone the repository
git clone https://github.com/fahim8401/SockProxyManagerPanel.git
cd SockProxyManagerPanel

# Run the one-click installation script
chmod +x install.sh
./install.sh
```

### Manual Setup
```bash
# Install dependencies
npm install

# Initialize database
npm run db:push

# Start development server
npm run dev

# For production build
npm run build
npm start
```

## 🔑 Default Credentials

**Admin Login:**
- Username: `admin`
- Password: `admin123`

**SOCKS5 Proxy:**
- Host: `localhost` or your server IP
- Port: `1080`
- Authentication: Username/password from created users

## 📡 API Endpoints

### Admin Panel API
- `POST /api/auth/login` - Admin authentication
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PATCH /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/stats` - System statistics
- `GET /api/connections` - Active connections
- `GET /api/ip-pool` - IP address management

### External API (v1)
All endpoints require API key authentication via `Authorization: Bearer <api_key>`

- `GET /api/v1/users` - List users
- `POST /api/v1/users` - Create user
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### API Key Management
- Generate API keys in the Admin Panel → API Management
- Use API keys for external system integration
- Monitor API usage and activity

## 🌐 SOCKS5 Proxy Usage

### Client Configuration
```javascript
// Node.js example with socks-proxy-agent
const { SocksProxyAgent } = require('socks-proxy-agent');

const agent = new SocksProxyAgent({
  hostname: 'your-server-ip',
  port: 1080,
  username: 'your-username',
  password: 'your-password'
});

// Use with HTTP requests
const response = await fetch('https://api.example.com', { agent });
```

### cURL Example
```bash
curl --socks5 username:password@your-server-ip:1080 https://api.example.com
```

### Browser Setup
Configure your browser's proxy settings:
- Protocol: SOCKS5
- Host: your-server-ip
- Port: 1080
- Username/Password: As created in admin panel

## 📊 Monitoring & Analytics

### Real-time Dashboard
- Live connection count and status
- Data transfer statistics
- User activity monitoring
- System health indicators
- Geographic distribution maps

### Analytics Features
- Historical usage data
- Peak usage analysis
- User behavior patterns
- Bandwidth utilization
- Connection success rates

## 🔒 Security Features

### Authentication & Authorization
- JWT-based admin authentication
- bcrypt password hashing
- Session management
- Role-based permissions

### Network Security
- Rate limiting protection
- Connection throttling
- Failed login attempt tracking
- IP-based access controls

### Data Protection
- Encrypted password storage
- Secure session handling
- API key management
- Audit logging

## 🖥 System Requirements

### Minimum Requirements
- **OS**: Linux (Ubuntu 18+, Debian 9+, CentOS 7+)
- **RAM**: 512MB
- **Storage**: 1GB free space
- **Network**: Public IP address
- **Node.js**: 18.0+ or 20.0+

### Recommended Specifications
- **OS**: Ubuntu 22.04 LTS
- **RAM**: 2GB+
- **Storage**: 10GB+ SSD
- **CPU**: 2+ cores
- **Network**: Dedicated server with good bandwidth

## 🚀 Production Deployment

### Environment Variables
```bash
# Required
DATABASE_URL=file:./database.sqlite
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=production

# Optional
PORT=5000
SOCKS_PORT=1080
```

### Process Management
```bash
# Using PM2 (recommended)
npm install -g pm2
pm2 start npm --name "socks-admin" -- start
pm2 startup
pm2 save

# Using systemd
sudo systemctl enable socks-admin
sudo systemctl start socks-admin
```

### Reverse Proxy (Nginx)
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
    }
}
```

### Firewall Configuration
```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp      # SSH
sudo ufw allow 80/tcp      # HTTP
sudo ufw allow 443/tcp     # HTTPS
sudo ufw allow 1080/tcp    # SOCKS5
sudo ufw allow 5000/tcp    # Admin Panel (if direct access needed)
sudo ufw enable

# iptables
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -p tcp --dport 1080 -j ACCEPT
iptables -A INPUT -p tcp --dport 5000 -j ACCEPT
```

## 📈 Performance Optimization

### Database Optimization
- Regular SQLite VACUUM operations
- Connection pooling
- Query optimization
- Index management

### Application Performance
- Redis caching (optional)
- Connection pooling
- Rate limiting
- Memory monitoring

### Monitoring Tools
- PM2 monitoring dashboard
- System resource monitoring
- Log file rotation
- Backup automation

## 🔧 Maintenance

### Regular Tasks
- Database backup (daily)
- Log file cleanup (weekly)
- Security updates (monthly)
- Performance monitoring (continuous)

### Backup Strategy
```bash
# Database backup
cp database.sqlite backups/database-$(date +%Y%m%d).sqlite

# Full system backup
tar -czf backup-$(date +%Y%m%d).tar.gz . --exclude=node_modules --exclude=backups
```

### Updates
```bash
# Update dependencies
npm update

# Rebuild application
npm run build

# Restart services
pm2 restart socks-admin
```

## 📞 Support & Documentation

### Additional Resources
- **GitHub Repository**: https://github.com/fahim8401/SockProxyManagerPanel
- **Installation Guide**: UBUNTU_INSTALLATION_GUIDE.md
- **VPS Setup**: VPS_SETUP_GUIDE.md
- **Troubleshooting**: TROUBLESHOOTING.md

### Common Issues
1. **Port conflicts**: Ensure ports 1080 and 5000 are available
2. **Permission issues**: Run with appropriate user permissions
3. **Database locks**: Handle SQLite concurrent access properly
4. **Memory usage**: Monitor and optimize for production loads

## 🎯 Production Checklist

- [ ] Server requirements met
- [ ] Firewall configured
- [ ] SSL certificates installed
- [ ] Environment variables set
- [ ] Database initialized
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Admin credentials changed
- [ ] API keys generated
- [ ] User accounts created
- [ ] SOCKS5 proxy tested
- [ ] Performance optimized
- [ ] Documentation reviewed

## 🏆 Features Summary

✅ **Complete Admin Dashboard** with real-time monitoring
✅ **Full User Management** with detailed profiles and controls
✅ **API Management System** with key generation and documentation
✅ **SOCKS5 Proxy Server** with multi-user authentication
✅ **IP Pool Management** with automatic assignment
✅ **Real-time Analytics** with historical data
✅ **Security Features** with rate limiting and encryption
✅ **Cross-platform Support** for Linux distributions
✅ **One-click Installation** with automated setup
✅ **Production Ready** with optimization and monitoring

This system is now ready for production deployment and can handle enterprise-level SOCKS5 proxy management requirements.