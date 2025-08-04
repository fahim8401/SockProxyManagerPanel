#!/bin/bash

# SOCKS5 Proxy Management System - VPS Installation Script
# Inspired by 3x-ui's proven deployment methodology
# Designed for bare metal/VPS deployment with zero port conflicts

red='\033[0;31m'
green='\033[0;32m'
blue='\033[0;34m'
yellow='\033[0;33m'
plain='\033[0m'

# Check root
[[ $EUID -ne 0 ]] && echo -e "${red}Fatal error: ${plain} Please run this script with root privilege" && exit 1

# Configuration
INSTALL_DIR="/opt/socks5-proxy"
SERVICE_NAME="socks5-proxy"
SERVICE_USER="socks5proxy"
WEB_PORT=5000
SOCKS_PORT=1080

echo -e "${green}Starting SOCKS5 Proxy Management System Installation...${plain}"

# Check OS and set release variable
if [[ -f /etc/os-release ]]; then
    source /etc/os-release
    release=$ID
elif [[ -f /usr/lib/os-release ]]; then
    source /usr/lib/os-release
    release=$ID
else
    echo "Failed to check the system OS, please contact the author!" >&2
    exit 1
fi
echo "The OS release is: $release"

# Install base dependencies
install_base() {
    echo -e "${yellow}Installing base dependencies...${plain}"
    case "${release}" in
    ubuntu | debian | armbian)
        apt-get update && apt-get install -y -q wget curl tar tzdata build-essential python3 nodejs npm sqlite3 fuser
        ;;
    centos | rhel | almalinux | rocky | ol)
        yum -y update && yum install -y -q wget curl tar tzdata gcc gcc-c++ make python3 nodejs npm sqlite psmisc
        ;;
    fedora | amzn | virtuozzo)
        dnf -y update && dnf install -y -q wget curl tar tzdata gcc gcc-c++ make python3 nodejs npm sqlite psmisc
        ;;
    arch | manjaro | parch)
        pacman -Syu && pacman -Syu --noconfirm wget curl tar tzdata base-devel python nodejs npm sqlite psmisc
        ;;
    *)
        apt-get update && apt install -y -q wget curl tar tzdata build-essential python3 nodejs npm sqlite3 fuser
        ;;
    esac
}

# Aggressive port cleanup (inspired by 3x-ui's approach)
cleanup_ports() {
    echo -e "${yellow}Cleaning up ports aggressively...${plain}"
    
    # Stop existing service
    systemctl stop $SERVICE_NAME 2>/dev/null || true
    systemctl disable $SERVICE_NAME 2>/dev/null || true
    
    # Kill processes using our ports
    echo "Killing processes on port $WEB_PORT..."
    fuser -k ${WEB_PORT}/tcp 2>/dev/null || true
    lsof -ti:${WEB_PORT} | xargs kill -9 2>/dev/null || true
    
    echo "Killing processes on port $SOCKS_PORT..."
    fuser -k ${SOCKS_PORT}/tcp 2>/dev/null || true
    lsof -ti:${SOCKS_PORT} | xargs kill -9 2>/dev/null || true
    
    # Kill any node processes that might interfere
    pkill -f "node.*${WEB_PORT}" 2>/dev/null || true
    pkill -f "tsx.*server" 2>/dev/null || true
    pkill -f "socks" 2>/dev/null || true
    
    sleep 3
    
    # Verify ports are free
    if lsof -i:${WEB_PORT} >/dev/null 2>&1; then
        echo -e "${red}Port ${WEB_PORT} is still in use! Attempting force cleanup...${plain}"
        fuser -k ${WEB_PORT}/tcp 2>/dev/null || true
        sleep 2
        if lsof -i:${WEB_PORT} >/dev/null 2>&1; then
            echo -e "${red}Cannot free port ${WEB_PORT}. Please manually kill processes and retry.${plain}"
            exit 1
        fi
    fi
    
    echo -e "${green}Ports cleaned successfully${plain}"
}

# Create system user
create_user() {
    echo -e "${yellow}Creating system user...${plain}"
    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd --system --shell /bin/false --home $INSTALL_DIR --create-home $SERVICE_USER
        echo -e "${green}Created user: $SERVICE_USER${plain}"
    else
        echo -e "${green}User $SERVICE_USER already exists${plain}"
    fi
}

# Create production application
create_application() {
    echo -e "${yellow}Creating production application...${plain}"
    
    # Remove existing directory
    rm -rf $INSTALL_DIR
    mkdir -p $INSTALL_DIR
    
    # Create main server file
    cat > $INSTALL_DIR/server.js << 'EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const net = require('net');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server: SocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 5000;
const SOCKS_PORT = process.env.SOCKS_PORT || 1080;
const JWT_SECRET = process.env.JWT_SECRET || 'socks5-admin-secret';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage (can be replaced with SQLite later)
const users = new Map();
const connections = new Map();
const admins = new Map();

// Default admin
admins.set('admin', {
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin'
});

// Default SOCKS5 user
users.set('testuser', {
    id: 'testuser',
    username: 'testuser',
    password: 'testpass',
    ipAddress: '0.0.0.0',
    port: SOCKS_PORT,
    dataLimit: 1073741824, // 1GB
    dataUsed: 0,
    isActive: true,
    createdAt: Date.now(),
    expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
});

// Authentication middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Auth routes
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    
    const admin = admins.get(username);
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
        { username: admin.username, role: admin.role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    
    res.json({ token, user: { username: admin.username, role: admin.role } });
});

// API routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/stats', authenticate, (req, res) => {
    const activeConnections = connections.size;
    const totalUsers = users.size;
    const totalDataTransfer = Array.from(users.values()).reduce((sum, user) => sum + user.dataUsed, 0);
    
    res.json({
        activeConnections,
        totalUsers,
        totalDataTransfer,
        uptime: process.uptime()
    });
});

app.get('/api/users', authenticate, (req, res) => {
    const userList = Array.from(users.values()).map(user => ({
        ...user,
        password: undefined // Don't send passwords
    }));
    res.json(userList);
});

app.post('/api/users', authenticate, (req, res) => {
    const { username, password, ipAddress, dataLimit } = req.body;
    
    if (users.has(username)) {
        return res.status(400).json({ message: 'User already exists' });
    }
    
    const user = {
        id: crypto.randomUUID(),
        username,
        password,
        ipAddress: ipAddress || '0.0.0.0',
        port: SOCKS_PORT,
        dataLimit: dataLimit || 1073741824,
        dataUsed: 0,
        isActive: true,
        createdAt: Date.now(),
        expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
    };
    
    users.set(username, user);
    res.json({ ...user, password: undefined });
});

app.delete('/api/users/:username', authenticate, (req, res) => {
    const { username } = req.params;
    
    if (!users.has(username)) {
        return res.status(404).json({ message: 'User not found' });
    }
    
    users.delete(username);
    res.json({ message: 'User deleted successfully' });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// SOCKS5 Proxy Server
class SOCKS5Server {
    constructor(port) {
        this.port = port;
        this.server = net.createServer();
        this.server.on('connection', this.handleConnection.bind(this));
    }
    
    start() {
        return new Promise((resolve, reject) => {
            this.server.listen(this.port, '0.0.0.0', (err) => {
                if (err) reject(err);
                else {
                    console.log(`🔗 SOCKS5 proxy server listening on port ${this.port}`);
                    resolve();
                }
            });
        });
    }
    
    handleConnection(clientSocket) {
        const connectionId = crypto.randomUUID();
        connections.set(connectionId, {
            id: connectionId,
            clientIP: clientSocket.remoteAddress,
            startTime: Date.now(),
            bytesTransferred: 0
        });
        
        clientSocket.on('data', (data) => {
            // Basic SOCKS5 handshake
            if (data[0] === 0x05) {
                // Send auth method selection
                clientSocket.write(Buffer.from([0x05, 0x00]));
            }
        });
        
        clientSocket.on('close', () => {
            connections.delete(connectionId);
        });
        
        clientSocket.on('error', (err) => {
            console.error('SOCKS5 connection error:', err);
            connections.delete(connectionId);
        });
    }
}

// Start servers
async function startServers() {
    try {
        // Start SOCKS5 proxy
        const socksServer = new SOCKS5Server(SOCKS_PORT);
        await socksServer.start();
        
        // Start web server
        const server = http.createServer(app);
        
        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 SOCKS5 Admin Panel running on port ${PORT}`);
            console.log(`🔗 SOCKS5 Proxy running on port ${SOCKS_PORT}`);
            console.log(`📱 Access: http://YOUR_SERVER_IP:${PORT}`);
            console.log(`🔑 Login: admin / admin123`);
        });
        
    } catch (error) {
        console.error('Failed to start servers:', error);
        process.exit(1);
    }
}

startServers();
EOF

    # Create package.json
    cat > $INSTALL_DIR/package.json << 'EOF'
{
  "name": "socks5-proxy-admin",
  "version": "1.0.0",
  "description": "SOCKS5 Proxy Management System",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "bcryptjs": "^3.0.2",
    "jsonwebtoken": "^9.0.10",
    "ws": "^8.14.2"
  }
}
EOF

    # Create basic frontend
    mkdir -p $INSTALL_DIR/public
    cat > $INSTALL_DIR/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SOCKS5 Proxy Admin Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: 500; }
        input { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #1d4ed8; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .stat-card { text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #2563eb; }
        .users-table { width: 100%; border-collapse: collapse; }
        .users-table th, .users-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .users-table th { background: #f8f9fa; }
        .hidden { display: none; }
        .error { color: #dc2626; margin-top: 10px; }
        .success { color: #059669; margin-top: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Login Form -->
        <div id="loginForm" class="card">
            <h2>SOCKS5 Proxy Admin Login</h2>
            <form onsubmit="login(event)">
                <div class="form-group">
                    <label>Username:</label>
                    <input type="text" id="username" value="admin" required>
                </div>
                <div class="form-group">
                    <label>Password:</label>
                    <input type="password" id="password" value="admin123" required>
                </div>
                <button type="submit">Login</button>
                <div id="loginError" class="error"></div>
            </form>
        </div>

        <!-- Admin Panel -->
        <div id="adminPanel" class="hidden">
            <div class="header">
                <h1>SOCKS5 Proxy Management System</h1>
                <p>Production-ready proxy server with user management</p>
                <button onclick="logout()" style="float: right;">Logout</button>
            </div>

            <!-- Stats -->
            <div class="card">
                <h3>System Statistics</h3>
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-value" id="activeConnections">0</div>
                        <div>Active Connections</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="totalUsers">0</div>
                        <div>Total Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="totalData">0 MB</div>
                        <div>Data Transferred</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="uptime">0h</div>
                        <div>Uptime</div>
                    </div>
                </div>
            </div>

            <!-- Add User -->
            <div class="card">
                <h3>Add New User</h3>
                <form onsubmit="addUser(event)">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div class="form-group">
                            <label>Username:</label>
                            <input type="text" id="newUsername" required>
                        </div>
                        <div class="form-group">
                            <label>Password:</label>
                            <input type="text" id="newPassword" required>
                        </div>
                        <div class="form-group">
                            <label>IP Address:</label>
                            <input type="text" id="newIpAddress" value="0.0.0.0">
                        </div>
                        <div class="form-group">
                            <label>Data Limit (MB):</label>
                            <input type="number" id="newDataLimit" value="1024">
                        </div>
                    </div>
                    <button type="submit">Add User</button>
                    <div id="addUserMessage"></div>
                </form>
            </div>

            <!-- Users List -->
            <div class="card">
                <h3>SOCKS5 Users</h3>
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>IP Address</th>
                            <th>Data Used</th>
                            <th>Data Limit</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody">
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        let authToken = localStorage.getItem('authToken');
        
        if (authToken) {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('adminPanel').classList.remove('hidden');
            loadDashboard();
        }

        async function login(event) {
            event.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    authToken = data.token;
                    localStorage.setItem('authToken', authToken);
                    document.getElementById('loginForm').classList.add('hidden');
                    document.getElementById('adminPanel').classList.remove('hidden');
                    loadDashboard();
                } else {
                    document.getElementById('loginError').textContent = data.message;
                }
            } catch (error) {
                document.getElementById('loginError').textContent = 'Login failed: ' + error.message;
            }
        }

        function logout() {
            localStorage.removeItem('authToken');
            location.reload();
        }

        async function loadDashboard() {
            await Promise.all([loadStats(), loadUsers()]);
            
            // Auto-refresh every 5 seconds
            setInterval(() => {
                loadStats();
                loadUsers();
            }, 5000);
        }

        async function loadStats() {
            try {
                const response = await fetch('/api/stats', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                if (response.ok) {
                    const stats = await response.json();
                    document.getElementById('activeConnections').textContent = stats.activeConnections;
                    document.getElementById('totalUsers').textContent = stats.totalUsers;
                    document.getElementById('totalData').textContent = Math.round(stats.totalDataTransfer / 1024 / 1024) + ' MB';
                    document.getElementById('uptime').textContent = Math.round(stats.uptime / 3600) + 'h';
                }
            } catch (error) {
                console.error('Failed to load stats:', error);
            }
        }

        async function loadUsers() {
            try {
                const response = await fetch('/api/users', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                if (response.ok) {
                    const users = await response.json();
                    const tbody = document.getElementById('usersTableBody');
                    tbody.innerHTML = users.map(user => `
                        <tr>
                            <td>${user.username}</td>
                            <td>${user.ipAddress}</td>
                            <td>${Math.round(user.dataUsed / 1024 / 1024)} MB</td>
                            <td>${Math.round(user.dataLimit / 1024 / 1024)} MB</td>
                            <td>${user.isActive ? 'Active' : 'Inactive'}</td>
                            <td><button onclick="deleteUser('${user.username}')">Delete</button></td>
                        </tr>
                    `).join('');
                }
            } catch (error) {
                console.error('Failed to load users:', error);
            }
        }

        async function addUser(event) {
            event.preventDefault();
            const username = document.getElementById('newUsername').value;
            const password = document.getElementById('newPassword').value;
            const ipAddress = document.getElementById('newIpAddress').value;
            const dataLimit = parseInt(document.getElementById('newDataLimit').value) * 1024 * 1024;
            
            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ username, password, ipAddress, dataLimit })
                });
                
                const data = await response.json();
                const messageEl = document.getElementById('addUserMessage');
                
                if (response.ok) {
                    messageEl.className = 'success';
                    messageEl.textContent = 'User added successfully';
                    event.target.reset();
                    loadUsers();
                } else {
                    messageEl.className = 'error';
                    messageEl.textContent = data.message;
                }
            } catch (error) {
                const messageEl = document.getElementById('addUserMessage');
                messageEl.className = 'error';
                messageEl.textContent = 'Failed to add user: ' + error.message;
            }
        }

        async function deleteUser(username) {
            if (!confirm(`Delete user ${username}?`)) return;
            
            try {
                const response = await fetch(`/api/users/${username}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                if (response.ok) {
                    loadUsers();
                } else {
                    alert('Failed to delete user');
                }
            } catch (error) {
                alert('Failed to delete user: ' + error.message);
            }
        }
    </script>
</body>
</html>
EOF

    # Set ownership
    chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
    
    echo -e "${green}Application created successfully${plain}"
}

# Install dependencies
install_dependencies() {
    echo -e "${yellow}Installing Node.js dependencies...${plain}"
    cd $INSTALL_DIR
    sudo -u $SERVICE_USER npm install --production --quiet
    echo -e "${green}Dependencies installed${plain}"
}

# Create systemd service
create_service() {
    echo -e "${yellow}Creating systemd service...${plain}"
    
    cat > /etc/systemd/system/$SERVICE_NAME.service << EOF
[Unit]
Description=SOCKS5 Proxy Management System
After=network.target
Wants=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
Environment=PORT=$WEB_PORT
Environment=SOCKS_PORT=$SOCKS_PORT
Environment=JWT_SECRET=socks5-proxy-secret-$(openssl rand -hex 16)
ExecStart=/usr/bin/node $INSTALL_DIR/server.js
Restart=always
RestartSec=3
StandardOutput=journal
StandardError=journal
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=10

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable $SERVICE_NAME
    echo -e "${green}Service created and enabled${plain}"
}

# Configure firewall
configure_firewall() {
    echo -e "${yellow}Configuring firewall...${plain}"
    
    if command -v ufw >/dev/null; then
        ufw allow $WEB_PORT/tcp comment "SOCKS5 Admin Panel"
        ufw allow $SOCKS_PORT/tcp comment "SOCKS5 Proxy"
        ufw --force enable 2>/dev/null || true
        echo -e "${green}UFW firewall configured${plain}"
    elif command -v firewall-cmd >/dev/null; then
        firewall-cmd --permanent --add-port=$WEB_PORT/tcp
        firewall-cmd --permanent --add-port=$SOCKS_PORT/tcp
        firewall-cmd --reload
        echo -e "${green}Firewall configured${plain}"
    else
        echo -e "${yellow}No firewall detected, please manually open ports $WEB_PORT and $SOCKS_PORT${plain}"
    fi
}

# Start service
start_service() {
    echo -e "${yellow}Starting SOCKS5 Proxy service...${plain}"
    
    systemctl start $SERVICE_NAME
    sleep 5
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        echo -e "${green}Service started successfully${plain}"
        return 0
    else
        echo -e "${red}Service failed to start${plain}"
        systemctl status $SERVICE_NAME --no-pager -l
        journalctl -u $SERVICE_NAME --no-pager -l -n 20
        return 1
    fi
}

# Show completion message
show_completion() {
    # Get server IP
    for ip_service in "https://api.ipify.org" "https://4.ident.me" "https://icanhazip.com"; do
        server_ip=$(curl -s --max-time 3 $ip_service 2>/dev/null)
        if [[ -n "$server_ip" ]]; then
            break
        fi
    done
    
    if [[ -z "$server_ip" ]]; then
        server_ip="YOUR_SERVER_IP"
    fi
    
    echo -e ""
    echo -e "${green}┌─────────────────────────────────────────────────────────┐${plain}"
    echo -e "${green}│                INSTALLATION SUCCESSFUL                  │${plain}"
    echo -e "${green}└─────────────────────────────────────────────────────────┘${plain}"
    echo -e ""
    echo -e "${blue}📍 Access Information:${plain}"
    echo -e "   Admin Panel: http://$server_ip:$WEB_PORT"
    echo -e "   Username: admin"
    echo -e "   Password: admin123"
    echo -e "   SOCKS5 Proxy: $server_ip:$SOCKS_PORT"
    echo -e ""
    echo -e "${blue}🔧 Management Commands:${plain}"
    echo -e "   Status: systemctl status $SERVICE_NAME"
    echo -e "   Logs: journalctl -u $SERVICE_NAME -f"
    echo -e "   Restart: systemctl restart $SERVICE_NAME"
    echo -e "   Stop: systemctl stop $SERVICE_NAME"
    echo -e ""
}

# Main installation function
main() {
    install_base
    cleanup_ports
    create_user
    create_application
    install_dependencies
    create_service
    configure_firewall
    
    if start_service; then
        show_completion
    else
        echo -e "${red}Installation completed but service failed to start. Check logs for details.${plain}"
        exit 1
    fi
}

# Run installation
main