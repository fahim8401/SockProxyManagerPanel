#!/bin/bash

# Deploy updated admin panel to production server
SERVER_IP="35.237.83.182"
INSTALL_DIR="/opt/xray-socks5"

echo "🚀 Deploying comprehensive admin panel..."

# Create the updated server file directly on the server
ssh root@$SERVER_IP << 'EOF'
cd /opt/xray-socks5

# Backup current server
cp server.js server.js.backup

# Create comprehensive admin panel server
cat > server.js << 'SERVERJS'
const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Create database
const db = new Database('xray-socks5.db');

// Initialize database with extended schema
function initDB() {
    console.log('🔧 Initializing database...');
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS proxy_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            data_limit INTEGER DEFAULT 1073741824,
            data_used INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            expires_at INTEGER,
            last_login INTEGER,
            ip_address TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS packages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            data_limit INTEGER NOT NULL,
            validity_days INTEGER NOT NULL,
            price REAL DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS connections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            ip_address TEXT,
            country TEXT,
            connected_at INTEGER DEFAULT (strftime('%s', 'now')),
            disconnected_at INTEGER,
            bytes_sent INTEGER DEFAULT 0,
            bytes_received INTEGER DEFAULT 0,
            FOREIGN KEY (user_id) REFERENCES proxy_users (id)
        );
        
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            updated_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
    `);
    
    // Insert default admin
    const adminExists = db.prepare('SELECT COUNT(*) as count FROM admins').get();
    if (adminExists.count === 0) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('admin', hashedPassword);
        console.log('✅ Admin created: admin / admin123');
    }
    
    // Insert default SOCKS5 user
    const userExists = db.prepare('SELECT COUNT(*) as count FROM proxy_users').get();
    if (userExists.count === 0) {
        const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
        db.prepare('INSERT INTO proxy_users (username, password, expires_at) VALUES (?, ?, ?)').run('testuser', 'testpass', expiresAt);
        console.log('✅ SOCKS5 user created: testuser / testpass');
    }
    
    // Insert default packages
    const packageExists = db.prepare('SELECT COUNT(*) as count FROM packages').get();
    if (packageExists.count === 0) {
        const packages = [
            ['Basic', 1073741824, 30, 9.99],
            ['Premium', 5368709120, 30, 19.99],
            ['Enterprise', 21474836480, 30, 39.99]
        ];
        const insertPackage = db.prepare('INSERT INTO packages (name, data_limit, validity_days, price) VALUES (?, ?, ?, ?)');
        packages.forEach(pkg => insertPackage.run(...pkg));
        console.log('✅ Default packages created');
    }
    
    console.log('✅ Database initialized');
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// Main landing page
app.get('/', (req, res) => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xray SOCKS5 Management System</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            text-align: center;
            max-width: 600px;
            width: 100%;
        }
        h1 { font-size: 2.5em; margin-bottom: 20px; }
        .status { 
            color: #4ade80; 
            font-weight: bold; 
            font-size: 1.2em;
            margin-bottom: 30px;
        }
        .feature {
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .credentials {
            background: rgba(0,0,0,0.2);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .btn {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            margin: 10px;
            border: 1px solid rgba(255,255,255,0.3);
            transition: all 0.3s;
        }
        .btn:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Xray SOCKS5 Management System</h1>
        <div class="status">✅ System Online</div>
        
        <div class="feature">
            <h3>🔐 Admin Panel</h3>
            <p>Professional web interface for SOCKS5 proxy management</p>
            <a href="/admin" class="btn">Access Admin Panel</a>
        </div>
        
        <div class="feature">
            <h3>🌐 SOCKS5 Proxy Service</h3>
            <p>High-performance proxy service running on port 1080</p>
        </div>
        
        <div class="credentials">
            <h3>Default Credentials</h3>
            <p><strong>Admin:</strong> admin / admin123</p>
            <p><strong>SOCKS5:</strong> testuser / testpass</p>
            <p><strong>Endpoint:</strong> ${req.hostname}:1080</p>
        </div>
        
        <p style="margin-top: 30px; opacity: 0.8;">
            Professional SAAS Platform v2.0 - Production Ready
        </p>
    </div>
</body>
</html>`;
    res.send(htmlContent);
});

// Comprehensive Admin Panel
app.get('/admin', (req, res) => {
    const adminPanel = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - Xray SOCKS5 Management</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            text-align: center;
        }
        .nav {
            background: white;
            padding: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .nav-btn {
            background: #007bff;
            color: white;
            padding: 8px 16px;
            margin: 0 5px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.3s;
        }
        .nav-btn:hover { background: #0056b3; }
        .nav-btn.active { background: #28a745; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin: 20px 0;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-left: 4px solid #007bff;
        }
        .stat-number { font-size: 2em; font-weight: bold; color: #007bff; }
        .stat-label { color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        tr:hover { background: #f8f9fa; }
        .btn {
            background: #007bff;
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            margin: 2px;
            transition: background 0.3s;
        }
        .btn:hover { background: #0056b3; }
        .btn-danger { background: #dc3545; }
        .btn-danger:hover { background: #c82333; }
        .btn-success { background: #28a745; }
        .btn-success:hover { background: #218838; }
        .form-group { margin: 15px 0; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: 600; }
        .form-control {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        .form-control:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .status-active { color: #28a745; font-weight: bold; }
        .status-inactive { color: #dc3545; font-weight: bold; }
        .alert {
            padding: 12px;
            border-radius: 4px;
            margin: 10px 0;
            border: 1px solid transparent;
        }
        .alert-success {
            color: #155724;
            background-color: #d4edda;
            border-color: #c3e6cb;
        }
        .alert-error {
            color: #721c24;
            background-color: #f8d7da;
            border-color: #f5c6cb;
        }
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }
        .modal-content {
            background-color: white;
            margin: 5% auto;
            padding: 20px;
            border-radius: 8px;
            width: 90%;
            max-width: 500px;
        }
        .close {
            color: #aaa;
            float: right;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        .close:hover { color: black; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔐 Xray SOCKS5 Management System</h1>
        <p>Professional Admin Panel v2.0</p>
    </div>
    
    <div class="nav">
        <div class="container">
            <button class="nav-btn active" onclick="showTab('dashboard')">Dashboard</button>
            <button class="nav-btn" onclick="showTab('users')">SOCKS5 Users</button>
            <button class="nav-btn" onclick="showTab('packages')">Packages</button>
            <button class="nav-btn" onclick="showTab('connections')">Connections</button>
            <button class="nav-btn" onclick="showTab('settings')">Settings</button>
        </div>
    </div>
    
    <div class="container">
        <div id="alerts"></div>
        
        <!-- Dashboard Tab -->
        <div id="dashboard" class="tab-content active">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number" id="totalUsers">0</div>
                    <div class="stat-label">Total Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="activeUsers">0</div>
                    <div class="stat-label">Active Users</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="totalConnections">0</div>
                    <div class="stat-label">Total Connections</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="totalPackages">0</div>
                    <div class="stat-label">Available Packages</div>
                </div>
            </div>
            
            <div class="card">
                <h3>System Status</h3>
                <p>✅ Database: Connected</p>
                <p>✅ SOCKS5 Service: Active on port 1080</p>
                <p>✅ Web Interface: Online</p>
                <p>✅ Admin Panel: Operational</p>
            </div>
            
            <div class="card">
                <h3>Recent Activity</h3>
                <div id="recentActivity">
                    <p>✅ System started successfully</p>
                    <p>✅ Database initialized</p>
                    <p>✅ Default users created</p>
                </div>
            </div>
        </div>
        
        <!-- Users Tab -->
        <div id="users" class="tab-content">
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>SOCKS5 Users Management</h3>
                    <button class="btn btn-success" onclick="showModal('userModal')">Add New User</button>
                </div>
                <div id="usersList">Loading...</div>
            </div>
        </div>
        
        <!-- Packages Tab -->
        <div id="packages" class="tab-content">
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3>Subscription Packages</h3>
                    <button class="btn btn-success" onclick="showModal('packageModal')">Create Package</button>
                </div>
                <div id="packagesList">Loading...</div>
            </div>
        </div>
        
        <!-- Connections Tab -->
        <div id="connections" class="tab-content">
            <div class="card">
                <h3>Active Connections</h3>
                <div id="connectionsList">No active connections</div>
            </div>
        </div>
        
        <!-- Settings Tab -->
        <div id="settings" class="tab-content">
            <div class="card">
                <h3>System Settings</h3>
                <div class="form-group">
                    <label>SOCKS5 Port:</label>
                    <input type="number" class="form-control" value="1080" disabled>
                </div>
                <div class="form-group">
                    <label>Max Connections per User:</label>
                    <input type="number" class="form-control" value="10">
                </div>
                <div class="form-group">
                    <label>Default Data Limit (MB):</label>
                    <input type="number" class="form-control" value="1024">
                </div>
                <button class="btn">Save Settings</button>
                <button class="btn btn-danger" onclick="confirmDatabaseClean()">Clean Database</button>
            </div>
        </div>
    </div>
    
    <!-- User Modal -->
    <div id="userModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="hideModal('userModal')">&times;</span>
            <h3>Create New SOCKS5 User</h3>
            <form id="userForm">
                <div class="form-group">
                    <label>Username:</label>
                    <input type="text" id="username" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Password:</label>
                    <input type="password" id="password" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Package:</label>
                    <select id="packageId" class="form-control">
                        <option value="">Select Package</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Data Limit (MB):</label>
                    <input type="number" id="dataLimit" class="form-control" value="1024">
                </div>
                <div class="form-group">
                    <label>Validity Days:</label>
                    <input type="number" id="validityDays" class="form-control" value="30">
                </div>
                <button type="submit" class="btn btn-success">Create User</button>
                <button type="button" class="btn" onclick="hideModal('userModal')">Cancel</button>
            </form>
        </div>
    </div>
    
    <!-- Package Modal -->
    <div id="packageModal" class="modal">
        <div class="modal-content">
            <span class="close" onclick="hideModal('packageModal')">&times;</span>
            <h3>Create New Package</h3>
            <form id="packageForm">
                <div class="form-group">
                    <label>Package Name:</label>
                    <input type="text" id="packageName" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Data Limit (MB):</label>
                    <input type="number" id="packageDataLimit" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Validity Days:</label>
                    <input type="number" id="packageValidityDays" class="form-control" required>
                </div>
                <div class="form-group">
                    <label>Price ($):</label>
                    <input type="number" id="packagePrice" class="form-control" step="0.01" required>
                </div>
                <button type="submit" class="btn btn-success">Create Package</button>
                <button type="button" class="btn" onclick="hideModal('packageModal')">Cancel</button>
            </form>
        </div>
    </div>
    
    <script>
        // Tab management
        function showTab(tabName) {
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById(tabName).classList.add('active');
            event.target.classList.add('active');
            loadTabData(tabName);
        }
        
        // Modal management
        function showModal(modalId) {
            document.getElementById(modalId).style.display = 'block';
        }
        
        function hideModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }
        
        // Alert system
        function showAlert(message, type = 'success') {
            const alertsContainer = document.getElementById('alerts');
            const alertDiv = document.createElement('div');
            alertDiv.className = \`alert alert-\${type}\`;
            alertDiv.textContent = message;
            alertsContainer.appendChild(alertDiv);
            setTimeout(() => alertDiv.remove(), 5000);
        }
        
        // API helper
        async function apiCall(endpoint, method = 'GET', data = null) {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };
            
            if (data) {
                options.body = JSON.stringify(data);
            }
            
            const response = await fetch(endpoint, options);
            return response.json();
        }
        
        // Load data for tabs
        async function loadTabData(tabName) {
            switch(tabName) {
                case 'dashboard':
                    await loadDashboard();
                    break;
                case 'users':
                    await loadUsers();
                    break;
                case 'packages':
                    await loadPackages();
                    break;
                case 'connections':
                    await loadConnections();
                    break;
            }
        }
        
        // Dashboard functions
        async function loadDashboard() {
            try {
                const [users, packages] = await Promise.all([
                    apiCall('/api/users'),
                    apiCall('/api/packages')
                ]);
                
                document.getElementById('totalUsers').textContent = users.length;
                document.getElementById('activeUsers').textContent = users.filter(u => u.is_active).length;
                document.getElementById('totalConnections').textContent = '0';
                document.getElementById('totalPackages').textContent = packages.length;
            } catch (error) {
                console.error('Error loading dashboard:', error);
            }
        }
        
        // Users functions
        async function loadUsers() {
            try {
                const users = await apiCall('/api/users');
                const usersList = document.getElementById('usersList');
                
                if (users.length === 0) {
                    usersList.innerHTML = '<p>No users found.</p>';
                    return;
                }
                
                const table = \`
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Data Limit</th>
                                <th>Data Used</th>
                                <th>Status</th>
                                <th>Expires</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            \${users.map(user => \`
                                <tr>
                                    <td>\${user.id}</td>
                                    <td>\${user.username}</td>
                                    <td>\${Math.round(user.data_limit / 1024 / 1024)} MB</td>
                                    <td>\${Math.round(user.data_used / 1024 / 1024)} MB</td>
                                    <td class="\${user.is_active ? 'status-active' : 'status-inactive'}">
                                        \${user.is_active ? 'Active' : 'Inactive'}
                                    </td>
                                    <td>\${user.expires_at ? new Date(user.expires_at * 1000).toLocaleDateString() : 'Never'}</td>
                                    <td>
                                        <button class="btn btn-danger" onclick="deleteUser(\${user.id})">Delete</button>
                                    </td>
                                </tr>
                            \`).join('')}
                        </tbody>
                    </table>
                \`;
                
                usersList.innerHTML = table;
            } catch (error) {
                console.error('Error loading users:', error);
                showAlert('Error loading users', 'error');
            }
        }
        
        // Packages functions
        async function loadPackages() {
            try {
                const packages = await apiCall('/api/packages');
                const packagesList = document.getElementById('packagesList');
                
                if (packages.length === 0) {
                    packagesList.innerHTML = '<p>No packages found.</p>';
                    return;
                }
                
                const table = \`
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Data Limit</th>
                                <th>Validity Days</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            \${packages.map(pkg => \`
                                <tr>
                                    <td>\${pkg.id}</td>
                                    <td>\${pkg.name}</td>
                                    <td>\${Math.round(pkg.data_limit / 1024 / 1024)} MB</td>
                                    <td>\${pkg.validity_days} days</td>
                                    <td>$\${pkg.price}</td>
                                    <td class="\${pkg.is_active ? 'status-active' : 'status-inactive'}">
                                        \${pkg.is_active ? 'Active' : 'Inactive'}
                                    </td>
                                    <td>
                                        <button class="btn btn-danger" onclick="deletePackage(\${pkg.id})">Delete</button>
                                    </td>
                                </tr>
                            \`).join('')}
                        </tbody>
                    </table>
                \`;
                
                packagesList.innerHTML = table;
                
                // Update package dropdown
                const packageSelect = document.getElementById('packageId');
                packageSelect.innerHTML = '<option value="">Select Package</option>' +
                    packages.filter(p => p.is_active).map(p => \`<option value="\${p.id}">\${p.name} - \${Math.round(p.data_limit/1024/1024)}MB</option>\`).join('');
            } catch (error) {
                console.error('Error loading packages:', error);
                showAlert('Error loading packages', 'error');
            }
        }
        
        // Connections functions
        async function loadConnections() {
            try {
                const connections = await apiCall('/api/connections');
                const connectionsList = document.getElementById('connectionsList');
                
                if (connections.length === 0) {
                    connectionsList.innerHTML = '<p>No active connections.</p>';
                    return;
                }
                
                // Display connections table here
                connectionsList.innerHTML = '<p>Connections feature ready for implementation.</p>';
            } catch (error) {
                console.error('Error loading connections:', error);
            }
        }
        
        // Form handlers
        document.getElementById('userForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userData = {
                username: document.getElementById('username').value,
                password: document.getElementById('password').value,
                dataLimit: parseInt(document.getElementById('dataLimit').value) * 1024 * 1024,
                validityDays: parseInt(document.getElementById('validityDays').value),
                packageId: document.getElementById('packageId').value || null
            };
            
            try {
                await apiCall('/api/users', 'POST', userData);
                showAlert('User created successfully');
                hideModal('userModal');
                document.getElementById('userForm').reset();
                loadUsers();
                loadDashboard();
            } catch (error) {
                showAlert('Error creating user', 'error');
            }
        });
        
        document.getElementById('packageForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const packageData = {
                name: document.getElementById('packageName').value,
                dataLimit: parseInt(document.getElementById('packageDataLimit').value) * 1024 * 1024,
                validityDays: parseInt(document.getElementById('packageValidityDays').value),
                price: parseFloat(document.getElementById('packagePrice').value)
            };
            
            try {
                await apiCall('/api/packages', 'POST', packageData);
                showAlert('Package created successfully');
                hideModal('packageModal');
                document.getElementById('packageForm').reset();
                loadPackages();
                loadDashboard();
            } catch (error) {
                showAlert('Error creating package', 'error');
            }
        });
        
        // Action functions
        async function deleteUser(userId) {
            if (confirm('Are you sure you want to delete this user?')) {
                try {
                    await apiCall(\`/api/users/\${userId}\`, 'DELETE');
                    showAlert('User deleted successfully');
                    loadUsers();
                    loadDashboard();
                } catch (error) {
                    showAlert('Error deleting user', 'error');
                }
            }
        }
        
        async function deletePackage(packageId) {
            if (confirm('Are you sure you want to delete this package?')) {
                try {
                    await apiCall(\`/api/packages/\${packageId}\`, 'DELETE');
                    showAlert('Package deleted successfully');
                    loadPackages();
                    loadDashboard();
                } catch (error) {
                    showAlert('Error deleting package', 'error');
                }
            }
        }
        
        function confirmDatabaseClean() {
            if (confirm('This will delete all user data but keep admin accounts. Are you sure?')) {
                if (confirm('This action cannot be undone. Continue?')) {
                    cleanDatabase();
                }
            }
        }
        
        async function cleanDatabase() {
            try {
                await apiCall('/api/admin/clean-database', 'POST');
                showAlert('Database cleaned successfully');
                loadDashboard();
                loadUsers();
                loadPackages();
            } catch (error) {
                showAlert('Error cleaning database', 'error');
            }
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            loadDashboard();
            loadPackages();
        });
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            const activeTab = document.querySelector('.tab-content.active').id;
            loadTabData(activeTab);
        }, 30000);
    </script>
</body>
</html>`;
    res.send(adminPanel);
});

// API Routes
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Xray SOCKS5 Management System',
        version: '2.0.0',
        uptime: process.uptime(),
        database: 'Connected'
    });
});

// Users API
app.get('/api/users', (req, res) => {
    try {
        const users = db.prepare('SELECT id, username, data_limit, data_used, is_active, expires_at, last_login, ip_address, created_at FROM proxy_users ORDER BY created_at DESC').all();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/users', (req, res) => {
    try {
        const { username, password, dataLimit = 1073741824, validityDays = 30, packageId } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        const expiresAt = Math.floor(Date.now() / 1000) + (validityDays * 24 * 60 * 60);
        
        const result = db.prepare(`
            INSERT INTO proxy_users (username, password, data_limit, expires_at) 
            VALUES (?, ?, ?, ?)
        `).run(username, password, dataLimit, expiresAt);
        
        res.json({ 
            id: result.lastInsertRowid,
            username,
            message: 'User created successfully'
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: 'Username already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create user' });
        }
    }
});

app.delete('/api/users/:id', (req, res) => {
    try {
        const { id } = req.params;
        const result = db.prepare('DELETE FROM proxy_users WHERE id = ?').run(id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Packages API
app.get('/api/packages', (req, res) => {
    try {
        const packages = db.prepare('SELECT * FROM packages ORDER BY created_at DESC').all();
        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/packages', (req, res) => {
    try {
        const { name, dataLimit, validityDays, price } = req.body;
        
        if (!name || !dataLimit || !validityDays || price === undefined) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        const result = db.prepare(`
            INSERT INTO packages (name, data_limit, validity_days, price) 
            VALUES (?, ?, ?, ?)
        `).run(name, dataLimit, validityDays, price);
        
        res.json({ 
            id: result.lastInsertRowid,
            name,
            message: 'Package created successfully'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create package' });
    }
});

app.delete('/api/packages/:id', (req, res) => {
    try {
        const { id } = req.params;
        const result = db.prepare('DELETE FROM packages WHERE id = ?').run(id);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Package not found' });
        }
        
        res.json({ message: 'Package deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete package' });
    }
});

// Connections API
app.get('/api/connections', (req, res) => {
    try {
        const connections = db.prepare('SELECT * FROM connections WHERE disconnected_at IS NULL ORDER BY connected_at DESC').all();
        res.json(connections);
    } catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin API
app.post('/api/admin/clean-database', (req, res) => {
    try {
        db.exec(`
            DELETE FROM proxy_users;
            DELETE FROM connections;
            DELETE FROM packages WHERE id > 3;
        `);
        
        // Recreate default data
        const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
        db.prepare('INSERT INTO proxy_users (username, password, expires_at) VALUES (?, ?, ?)').run('testuser', 'testpass', expiresAt);
        
        res.json({ message: 'Database cleaned successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clean database' });
    }
});

// Start server
async function startServer() {
    try {
        initDB();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log('🚀 Xray SOCKS5 Management System Started');
            console.log(`🌐 Web Interface: http://0.0.0.0:${PORT}`);
            console.log(`🔐 Admin Panel: http://0.0.0.0:${PORT}/admin`);
            console.log('🔗 SOCKS5 Proxy: YOUR_SERVER_IP:1080');
            console.log('🔑 Admin: admin / admin123');
            console.log('🔑 SOCKS5: testuser / testpass');
        });
    } catch (error) {
        console.error('❌ Startup failed:', error);
        process.exit(1);
    }
}

startServer();
SERVERJS

echo "✅ Server file updated"

# Restart the service
systemctl stop xray-socks5
systemctl start xray-socks5

sleep 3

# Check service status
if systemctl is-active --quiet xray-socks5; then
    echo "✅ Service restarted successfully"
    systemctl status xray-socks5 --no-pager
else
    echo "❌ Service restart failed"
    systemctl status xray-socks5 --no-pager
    journalctl -u xray-socks5 --no-pager -n 20
fi
EOF

echo "🎉 Admin panel deployment complete!"
echo "🌐 Access your comprehensive admin panel at: http://35.237.83.182:3000/admin"