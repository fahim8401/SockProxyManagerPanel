# SOCKS5 Proxy Admin Panel

A comprehensive full-stack SOCKS5 proxy management system with complete admin interface, built with React, Node.js, TypeScript, and SQLite.

## 🚀 Features

### 📊 Admin Dashboard
- Real-time statistics and KPIs
- Live connection monitoring via WebSocket
- System status indicators with health checks
- Data transfer analytics and charts
- User activity overview

### 👥 User Management
- Create/edit/delete SOCKS5 users
- Username/password authentication with bcrypt
- Data quota management (GB limits)
- Expiration date controls
- IP address assignment from pool
- Custom port assignment (default: 1080)
- User status management (active/inactive)

### 🌐 IP Pool Management
- IPv4 and IPv6 address management
- Automatic IP assignment to users
- IP availability tracking
- Bulk IP import capabilities
- Geographic distribution support

### 📈 Real-time Analytics
- Connection patterns and trends
- Data transfer monitoring
- Geographic user distribution
- Protocol usage statistics
- Historical data analysis

### 🔒 Security Features
- JWT authentication for admin panel
- bcrypt password hashing
- Rate limiting protection
- Session management
- Role-based access control

### 🔧 System Administration
- Comprehensive settings panel
- SQLite database (portable)
- Real-time monitoring
- Service health checks
- Automated user provisioning API

## 🛠 One-Click Installation

### Ubuntu/Debian/CentOS/RHEL

```bash
curl -sSL https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/refs/heads/MAIN/install.sh | sudo bash
```

### Manual Installation

```bash
# Clone repository
git clone https://github.com/fahim8401/SockProxyManagerPanel.git
cd SockProxyManagerPanel

# Install dependencies
npm install

# Build application
npm run build

# Start production server
npm start
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
NODE_ENV=production
PORT=5000
JWT_SECRET=your-secret-key-here
DATABASE_URL=sqlite:./data/database.sqlite

# Default admin credentials (CHANGE THESE!)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# SOCKS5 Proxy Configuration
SOCKS_PORT=1080
SOCKS_HOST=0.0.0.0
```

### Default Credentials

**⚠️ Important: Change these before production use!**

- **Admin Panel**: `admin` / `admin123`
- **Access URL**: `http://your-server-ip:5000`

## 🌐 Usage

### Admin Panel Access

1. Open browser to `http://your-server-ip:5000`
2. Login with admin credentials
3. Create SOCKS5 users through the user management interface
4. Monitor connections in real-time via dashboard

### SOCKS5 Proxy Configuration

Configure your applications to use:
- **Host**: `your-server-ip`
- **Port**: `1080`
- **Username**: User created in admin panel
- **Password**: Password set in admin panel

### API Endpoints

- `POST /api/auth/login` - Admin authentication
- `GET /api/stats` - System statistics
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/ip-pool` - IP pool management
- `GET /api/connections` - Active connections
- `GET /api/health` - Health check

## 🏗 Architecture

### Frontend
- **React 18** with TypeScript
- **shadcn/ui** components (Radix UI primitives)
- **Tailwind CSS** for styling
- **TanStack Query** for state management
- **Wouter** for routing
- **React Hook Form** with Zod validation

### Backend
- **Express.js** with TypeScript
- **SQLite** database with Drizzle ORM
- **WebSocket** for real-time updates
- **JWT** authentication
- **bcrypt** password hashing
- **Custom SOCKS5** proxy server

### Database Schema
- **Users**: SOCKS5 user credentials and settings
- **IP Pool**: Available IPv4/IPv6 addresses
- **Connections**: Active and historical proxy connections
- **Admins**: Admin panel user management

## 🔄 Management Commands

```bash
# Service Management (if installed via install.sh)
sudo systemctl start socks5-proxy-admin
sudo systemctl stop socks5-proxy-admin
sudo systemctl restart socks5-proxy-admin
sudo systemctl status socks5-proxy-admin

# View logs
sudo journalctl -u socks5-proxy-admin -f

# Development
npm run dev          # Start development server
npm run build        # Build for production
npm start           # Start production server
npm run db:push     # Push database schema changes
```

## 📁 Project Structure

```
SockProxyManagerPanel/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/        # Application pages
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utilities
├── server/                # Express.js backend
│   ├── services/         # Business logic
│   ├── routes.ts         # API endpoints
│   ├── storage.ts        # Database operations
│   └── index.ts          # Server entry point
├── shared/                # Shared TypeScript types
│   └── schema.ts         # Database schema
├── data/                  # SQLite database files
├── install.sh            # One-click installation script
└── README.md
```

## 🔐 Security Considerations

1. **Change Default Credentials**: Always change admin username/password
2. **Use HTTPS**: Configure SSL/TLS for production
3. **Firewall**: Ensure ports 5000 and 1080 are properly configured
4. **Database**: SQLite file is stored locally - ensure proper backup
5. **JWT Secret**: Use a strong, random JWT secret key
6. **Updates**: Keep dependencies updated regularly

## 🐛 Troubleshooting

### Common Issues

1. **Service won't start**:
   ```bash
   sudo journalctl -u socks5-proxy-admin --no-pager
   ```

2. **Database permissions**:
   ```bash
   sudo chown -R socks5admin:socks5admin /opt/SockProxyManagerPanel/data
   ```

3. **Port conflicts**:
   ```bash
   sudo netstat -tlnp | grep :5000
   sudo netstat -tlnp | grep :1080
   ```

4. **Firewall issues**:
   ```bash
   sudo ufw status
   sudo ufw allow 5000/tcp
   sudo ufw allow 1080/tcp
   ```

## 📝 Development

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Development Setup

```bash
# Clone and install
git clone https://github.com/fahim8401/SockProxyManagerPanel.git
cd SockProxyManagerPanel
npm install

# Start development server
npm run dev

# Database operations
npm run db:push     # Push schema changes
npm run db:studio   # Open database studio (if available)
```

### Building for Production

```bash
npm run build
npm start
```

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Create Pull Request

## 🆘 Support

- 🐛 Issues: https://github.com/fahim8401/SockProxyManagerPanel/issues
- 📖 Documentation: README.md, DEPLOYMENT.md, TROUBLESHOOTING.md
- 💬 Discussions: GitHub Discussions

## 🔧 Build Fix for Debian 12

If you encounter "vite: not found" during installation, the updated install.sh script now handles this by:
1. Installing all dependencies (including dev dependencies)
2. Building the application
3. Cleaning up dev dependencies for production

For manual installations, always run `npm install` (not `npm install --production`) before building.

---

**⚠️ Security Notice**: This software is provided as-is. Always review security settings and change default credentials before production deployment.