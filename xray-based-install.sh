#!/bin/bash

# SOCKS5 Proxy Management System - Xray-based Implementation
# Inspired by 3x-ui's architecture using Xray-core for robust proxy handling
# This creates a production-ready system like 3x-ui but focused on SOCKS5

red='\033[0;31m'
green='\033[0;32m'
blue='\033[0;34m'
yellow='\033[0;33m'
plain='\033[0m'

# Check root
[[ $EUID -ne 0 ]] && echo -e "${red}Fatal error: ${plain} Please run this script with root privilege" && exit 1

# Configuration
INSTALL_DIR="/opt/socks5-xray"
SERVICE_NAME="socks5-xray"
SERVICE_USER="socks5xray"
WEB_PORT=5000
SOCKS_PORT=1080
XRAY_VERSION="v24.9.30"  # Latest stable version

echo -e "${green}Starting Xray-based SOCKS5 Management System Installation...${plain}"
echo -e "${yellow}Using Xray-core like 3x-ui for maximum compatibility${plain}"

# Detect architecture
arch() {
    case "$(uname -m)" in
    x86_64 | x64 | amd64) echo 'linux-64' ;;
    i*86 | x86) echo 'linux-32' ;;
    armv8* | armv8 | arm64 | aarch64) echo 'linux-arm64-v8a' ;;
    armv7* | armv7 | arm) echo 'linux-arm32-v7a' ;;
    armv6* | armv6) echo 'linux-arm32-v6' ;;
    armv5* | armv5) echo 'linux-arm32-v5' ;;
    s390x) echo 'linux-s390x' ;;
    *) echo -e "${red}Unsupported CPU architecture! ${plain}" && exit 1 ;;
    esac
}

echo "Architecture: $(arch)"

# Check OS and install dependencies
install_base() {
    echo -e "${yellow}Installing base dependencies...${plain}"
    if [[ -f /etc/os-release ]]; then
        source /etc/os-release
        release=$ID
    else
        echo "Failed to check the system OS!" >&2
        exit 1
    fi
    
    case "${release}" in
    ubuntu | debian | armbian)
        apt-get update && apt-get install -y -q wget curl tar unzip nodejs npm sqlite3 fuser
        ;;
    centos | rhel | almalinux | rocky | ol)
        yum -y update && yum install -y -q wget curl tar unzip nodejs npm sqlite psmisc
        ;;
    fedora | amzn | virtuozzo)
        dnf -y update && dnf install -y -q wget curl tar unzip nodejs npm sqlite psmisc
        ;;
    *)
        apt-get update && apt install -y -q wget curl tar unzip nodejs npm sqlite3 fuser
        ;;
    esac
    
    echo -e "${green}Dependencies installed${plain}"
}

# Aggressive port cleanup (like 3x-ui)
cleanup_ports() {
    echo -e "${yellow}Cleaning up ports aggressively...${plain}"
    
    # Stop existing services
    systemctl stop $SERVICE_NAME 2>/dev/null || true
    systemctl disable $SERVICE_NAME 2>/dev/null || true
    
    # Kill processes using our ports
    fuser -k ${WEB_PORT}/tcp 2>/dev/null || true
    fuser -k ${SOCKS_PORT}/tcp 2>/dev/null || true
    
    # Kill any running xray/node processes
    pkill -f "xray" 2>/dev/null || true
    pkill -f "node.*${WEB_PORT}" 2>/dev/null || true
    
    sleep 3
    echo -e "${green}Ports cleaned successfully${plain}"
}

# Create system user
create_user() {
    echo -e "${yellow}Creating system user...${plain}"
    if ! id "$SERVICE_USER" &>/dev/null; then
        useradd --system --shell /bin/false --home $INSTALL_DIR --create-home $SERVICE_USER
        echo -e "${green}Created user: $SERVICE_USER${plain}"
    fi
}

# Download and install Xray-core (like 3x-ui)
install_xray() {
    echo -e "${yellow}Installing Xray-core...${plain}"
    
    mkdir -p $INSTALL_DIR/bin
    cd /tmp
    
    # Download Xray-core
    XRAY_URL="https://github.com/XTLS/Xray-core/releases/download/${XRAY_VERSION}/Xray-${XRAY_VERSION}-$(arch).zip"
    echo "Downloading from: $XRAY_URL"
    
    wget -O xray.zip "$XRAY_URL"
    if [[ $? -ne 0 ]]; then
        echo -e "${red}Failed to download Xray-core${plain}"
        exit 1
    fi
    
    unzip -o xray.zip -d xray-tmp/
    mv xray-tmp/xray $INSTALL_DIR/bin/
    chmod +x $INSTALL_DIR/bin/xray
    
    rm -rf xray.zip xray-tmp/
    echo -e "${green}Xray-core installed successfully${plain}"
}

# Create Xray configuration (SOCKS5 focused)
create_xray_config() {
    echo -e "${yellow}Creating Xray configuration...${plain}"
    
    cat > $INSTALL_DIR/config.json << 'EOF'
{
  "log": {
    "access": "/var/log/xray/access.log",
    "error": "/var/log/xray/error.log",
    "loglevel": "warning"
  },
  "api": {
    "tag": "api",
    "services": [
      "HandlerService",
      "LoggerService",
      "StatsService"
    ]
  },
  "stats": {},
  "policy": {
    "levels": {
      "0": {
        "handshake": 4,
        "connIdle": 300,
        "uplinkOnly": 5,
        "downlinkOnly": 30,
        "statsUserUplink": true,
        "statsUserDownlink": true
      }
    },
    "system": {
      "statsInboundUplink": true,
      "statsInboundDownlink": true,
      "statsOutboundUplink": true,
      "statsOutboundDownlink": true
    }
  },
  "inbounds": [
    {
      "listen": "127.0.0.1",
      "port": 8080,
      "protocol": "dokodemo-door",
      "settings": {
        "address": "127.0.0.1"
      },
      "tag": "api"
    },
    {
      "listen": "0.0.0.0",
      "port": 1080,
      "protocol": "socks",
      "settings": {
        "auth": "password",
        "accounts": [
          {
            "user": "testuser",
            "pass": "testpass"
          }
        ],
        "udp": true,
        "ip": "0.0.0.0"
      },
      "streamSettings": {
        "network": "tcp"
      },
      "tag": "socks-in",
      "sniffing": {
        "enabled": true,
        "destOverride": ["http", "tls"]
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "settings": {
        "domainStrategy": "UseIP"
      },
      "tag": "direct"
    },
    {
      "protocol": "blackhole",
      "settings": {
        "response": {
          "type": "http"
        }
      },
      "tag": "blocked"
    }
  ],
  "routing": {
    "domainStrategy": "IPIfNonMatch",
    "rules": [
      {
        "inboundTag": ["api"],
        "outboundTag": "api",
        "type": "field"
      },
      {
        "type": "field",
        "protocol": ["bittorrent"],
        "outboundTag": "blocked"
      }
    ]
  }
}
EOF

    # Create log directory
    mkdir -p /var/log/xray
    chown -R $SERVICE_USER:$SERVICE_USER /var/log/xray
    
    echo -e "${green}Xray configuration created${plain}"
}

# Create management web interface
create_web_interface() {
    echo -e "${yellow}Creating web management interface...${plain}"
    
    # Create package.json
    cat > $INSTALL_DIR/package.json << 'EOF'
{
  "name": "socks5-xray-admin",
  "version": "1.0.0",
  "description": "SOCKS5 Management System using Xray-core",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "bcryptjs": "^3.0.2",
    "jsonwebtoken": "^9.0.10",
    "sqlite3": "^5.1.6",
    "axios": "^1.5.0"
  }
}
EOF

    # Create main server
    cat > $INSTALL_DIR/server.js << 'EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'xray-socks5-secret';
const XRAY_API_PORT = 8080;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const db = new sqlite3.Database('/opt/socks5-xray/users.db');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        enabled INTEGER DEFAULT 1,
        data_limit INTEGER DEFAULT 1073741824,
        data_used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);
    
    // Insert default admin
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)`, 
           ['admin', hashedPassword]);
    
    // Insert default SOCKS5 user
    db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, 
           ['testuser', 'testpass']);
});

// Xray process management
let xrayProcess = null;

function startXray() {
    if (xrayProcess) {
        xrayProcess.kill();
    }
    
    xrayProcess = spawn('/opt/socks5-xray/bin/xray', ['run', '-config', '/opt/socks5-xray/config.json'], {
        stdio: 'pipe',
        detached: false
    });
    
    xrayProcess.stdout.on('data', (data) => {
        console.log(`Xray: ${data}`);
    });
    
    xrayProcess.stderr.on('data', (data) => {
        console.error(`Xray Error: ${data}`);
    });
    
    xrayProcess.on('close', (code) => {
        console.log(`Xray process exited with code ${code}`);
        // Auto-restart after 5 seconds
        setTimeout(startXray, 5000);
    });
    
    console.log('🚀 Xray-core started with SOCKS5 proxy on port 1080');
}

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
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    
    db.get('SELECT * FROM admins WHERE username = ?', [username], (err, admin) => {
        if (err || !admin || !bcrypt.compareSync(password, admin.password)) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { username: admin.username, role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.json({ token, user: { username: admin.username, role: 'admin' } });
    });
});

// API routes
app.get('/api/health', (req, res) => {
    const xrayRunning = xrayProcess && !xrayProcess.killed;
    res.json({ 
        status: 'healthy', 
        xrayRunning,
        timestamp: new Date().toISOString() 
    });
});

app.get('/api/stats', authenticate, (req, res) => {
    db.get('SELECT COUNT(*) as totalUsers FROM users WHERE enabled = 1', (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        db.get('SELECT SUM(data_used) as totalData FROM users', (err2, result2) => {
            if (err2) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            res.json({
                totalUsers: result.totalUsers,
                totalDataTransfer: result2.totalData || 0,
                xrayRunning: xrayProcess && !xrayProcess.killed,
                uptime: process.uptime()
            });
        });
    });
});

app.get('/api/users', authenticate, (req, res) => {
    db.all('SELECT id, username, enabled, data_limit, data_used, created_at FROM users', (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(users);
    });
});

app.post('/api/users', authenticate, (req, res) => {
    const { username, password } = req.body;
    
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
           [username, password], function(err) {
        if (err) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Update Xray config and restart
        updateXrayConfig();
        
        res.json({ id: this.lastID, username, message: 'User created successfully' });
    });
});

app.delete('/api/users/:id', authenticate, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        
        // Update Xray config and restart
        updateXrayConfig();
        
        res.json({ message: 'User deleted successfully' });
    });
});

// Update Xray config with current users
function updateXrayConfig() {
    db.all('SELECT username, password FROM users WHERE enabled = 1', (err, users) => {
        if (err) {
            console.error('Error fetching users:', err);
            return;
        }
        
        const config = {
            "log": {
                "access": "/var/log/xray/access.log",
                "error": "/var/log/xray/error.log",
                "loglevel": "warning"
            },
            "api": {
                "tag": "api",
                "services": ["HandlerService", "LoggerService", "StatsService"]
            },
            "stats": {},
            "policy": {
                "levels": {
                    "0": {
                        "handshake": 4,
                        "connIdle": 300,
                        "uplinkOnly": 5,
                        "downlinkOnly": 30,
                        "statsUserUplink": true,
                        "statsUserDownlink": true
                    }
                }
            },
            "inbounds": [
                {
                    "listen": "127.0.0.1",
                    "port": 8080,
                    "protocol": "dokodemo-door",
                    "settings": { "address": "127.0.0.1" },
                    "tag": "api"
                },
                {
                    "listen": "0.0.0.0",
                    "port": 1080,
                    "protocol": "socks",
                    "settings": {
                        "auth": "password",
                        "accounts": users.map(user => ({
                            "user": user.username,
                            "pass": user.password
                        })),
                        "udp": true,
                        "ip": "0.0.0.0"
                    },
                    "streamSettings": { "network": "tcp" },
                    "tag": "socks-in",
                    "sniffing": {
                        "enabled": true,
                        "destOverride": ["http", "tls"]
                    }
                }
            ],
            "outbounds": [
                {
                    "protocol": "freedom",
                    "settings": { "domainStrategy": "UseIP" },
                    "tag": "direct"
                }
            ],
            "routing": {
                "domainStrategy": "IPIfNonMatch",
                "rules": [
                    {
                        "inboundTag": ["api"],
                        "outboundTag": "api",
                        "type": "field"
                    }
                ]
            }
        };
        
        fs.writeFileSync('/opt/socks5-xray/config.json', JSON.stringify(config, null, 2));
        
        // Restart Xray
        setTimeout(() => {
            startXray();
        }, 1000);
    });
}

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start servers
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 SOCKS5 Management Panel running on port ${PORT}`);
    console.log(`🔑 Login: admin / admin123`);
    startXray();
});

process.on('SIGTERM', () => {
    if (xrayProcess) {
        xrayProcess.kill();
    }
    db.close();
    server.close();
});
EOF

    # Create simple frontend
    mkdir -p $INSTALL_DIR/public
    cat > $INSTALL_DIR/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SOCKS5 Xray Management</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #1d4ed8; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: 500; }
        input { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #1d4ed8; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #1e40af; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .stat-card { text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #1d4ed8; }
        .users-table { width: 100%; border-collapse: collapse; }
        .users-table th, .users-table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        .users-table th { background: #f8f9fa; }
        .hidden { display: none; }
        .error { color: #dc2626; margin-top: 10px; }
        .success { color: #059669; margin-top: 10px; }
        .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-left: 10px; }
        .status-running { background: #10b981; }
        .status-stopped { background: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Login Form -->
        <div id="loginForm" class="card">
            <h2>SOCKS5 Xray Management Login</h2>
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
                <h1>SOCKS5 Proxy Management (Xray-powered)</h1>
                <p>Production-ready proxy server using Xray-core like 3x-ui</p>
                <button onclick="logout()" style="float: right;">Logout</button>
            </div>

            <!-- System Status -->
            <div class="card">
                <h3>System Status</h3>
                <p>Xray Core: <span id="xrayStatus">Checking...</span><span id="xrayIndicator" class="status-indicator"></span></p>
                <p>SOCKS5 Port: 1080</p>
                <p>Management Port: 5000</p>
            </div>

            <!-- Stats -->
            <div class="card">
                <h3>Statistics</h3>
                <div class="stats">
                    <div class="stat-card">
                        <div class="stat-value" id="totalUsers">0</div>
                        <div>Active Users</div>
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
                <h3>Add SOCKS5 User</h3>
                <form onsubmit="addUser(event)">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label>Username:</label>
                            <input type="text" id="newUsername" required>
                        </div>
                        <div class="form-group">
                            <label>Password:</label>
                            <input type="text" id="newPassword" required>
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
                            <th>Data Used</th>
                            <th>Data Limit</th>
                            <th>Status</th>
                            <th>Created</th>
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
            await Promise.all([loadStats(), loadUsers(), checkXrayStatus()]);
            
            // Auto-refresh every 5 seconds
            setInterval(() => {
                loadStats();
                loadUsers();
                checkXrayStatus();
            }, 5000);
        }

        async function checkXrayStatus() {
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                
                const statusEl = document.getElementById('xrayStatus');
                const indicatorEl = document.getElementById('xrayIndicator');
                
                if (data.xrayRunning) {
                    statusEl.textContent = 'Running';
                    indicatorEl.className = 'status-indicator status-running';
                } else {
                    statusEl.textContent = 'Stopped';
                    indicatorEl.className = 'status-indicator status-stopped';
                }
            } catch (error) {
                console.error('Failed to check Xray status:', error);
            }
        }

        async function loadStats() {
            try {
                const response = await fetch('/api/stats', {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                
                if (response.ok) {
                    const stats = await response.json();
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
                            <td>${Math.round(user.data_used / 1024 / 1024)} MB</td>
                            <td>${Math.round(user.data_limit / 1024 / 1024)} MB</td>
                            <td>${user.enabled ? 'Active' : 'Inactive'}</td>
                            <td>${new Date(user.created_at).toLocaleDateString()}</td>
                            <td><button onclick="deleteUser(${user.id})">Delete</button></td>
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
            
            try {
                const response = await fetch('/api/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ username, password })
                });
                
                const data = await response.json();
                const messageEl = document.getElementById('addUserMessage');
                
                if (response.ok) {
                    messageEl.className = 'success';
                    messageEl.textContent = 'User added successfully. Xray config updated.';
                    event.target.reset();
                    setTimeout(() => loadUsers(), 2000);
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

        async function deleteUser(id) {
            if (!confirm('Delete this user?')) return;
            
            try {
                const response = await fetch(`/api/users/${id}`, {
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

    echo -e "${green}Web interface created${plain}"
}

# Install Node.js dependencies
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
Description=SOCKS5 Xray Management System
After=network.target
Wants=network.target

[Service]
Type=simple
User=$SERVICE_USER
Group=$SERVICE_USER
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
Environment=PORT=$WEB_PORT
Environment=JWT_SECRET=xray-socks5-secret-$(openssl rand -hex 16)
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

    # Set ownership
    chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR
    
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
    fi
}

# Start service
start_service() {
    echo -e "${yellow}Starting SOCKS5 Xray service...${plain}"
    
    systemctl start $SERVICE_NAME
    sleep 5
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        echo -e "${green}Service started successfully${plain}"
        return 0
    else
        echo -e "${red}Service failed to start${plain}"
        systemctl status $SERVICE_NAME --no-pager -l
        return 1
    fi
}

# Show completion message
show_completion() {
    # Get server IP
    for ip_service in "https://api.ipify.org" "https://4.ident.me"; do
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
    echo -e "${green}│            XRAY-BASED SOCKS5 INSTALLATION              │${plain}"
    echo -e "${green}│                     SUCCESSFUL                          │${plain}"
    echo -e "${green}└─────────────────────────────────────────────────────────┘${plain}"
    echo -e ""
    echo -e "${blue}🎯 Like 3x-ui but focused on SOCKS5${plain}"
    echo -e ""
    echo -e "${blue}📍 Access Information:${plain}"
    echo -e "   Admin Panel: http://$server_ip:$WEB_PORT"
    echo -e "   Username: admin"
    echo -e "   Password: admin123"
    echo -e "   SOCKS5 Proxy: $server_ip:$SOCKS_PORT"
    echo -e "   Default User: testuser / testpass"
    echo -e ""
    echo -e "${blue}🔧 Management Commands:${plain}"
    echo -e "   Status: systemctl status $SERVICE_NAME"
    echo -e "   Logs: journalctl -u $SERVICE_NAME -f"
    echo -e "   Restart: systemctl restart $SERVICE_NAME"
    echo -e ""
    echo -e "${blue}✨ Features:${plain}"
    echo -e "   • Xray-core powered (same as 3x-ui)"
    echo -e "   • Real-time user management"
    echo -e "   • Auto-config updates"
    echo -e "   • Production-ready reliability"
    echo -e ""
}

# Main installation function
main() {
    install_base
    cleanup_ports
    create_user
    install_xray
    create_xray_config
    create_web_interface
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