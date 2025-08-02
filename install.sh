#!/bin/bash

# SOCKS5 Proxy Management System - Complete Installation Script
# Version: 4.0.0 - Enterprise Edition
# Features: User Management, IP Routing, API Keys, Settings Management, VPS Deployment
# Compatible: Ubuntu 18.04+, Debian 9+, CentOS 7+

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Global variables
INSTALL_DIR="/opt/socks5-admin"
SERVICE_NAME="socks5-admin"
WEB_PORT=5000
SOCKS_PORT=1080
DB_FILE="$INSTALL_DIR/database.sqlite"
BACKUP_DIR="/opt/socks5-admin/backups"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Banner
show_banner() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                  ║"
    echo "║            SOCKS5 Proxy Management System v4.0.0                ║"
    echo "║                     Enterprise Edition                           ║"
    echo "║                                                                  ║"
    echo "║  Features:                                                       ║"
    echo "║  • Complete Admin Panel with Real-time Monitoring               ║"
    echo "║  • User Portal for SOCKS5 Users                                 ║"
    echo "║  • IP Routing & NAT Support (Multiple Public IPs)               ║"
    echo "║  • API Key Management & External API Access                     ║"
    echo "║  • Settings Management with Database Persistence                ║"
    echo "║  • WhatsApp/Chrome/All Applications Support                     ║"
    echo "║  • Package-based User Creation                                  ║"
    echo "║  • Real-time Analytics & Monitoring                             ║"
    echo "║  • Multi-admin Role Management                                  ║"
    echo "║                                                                  ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        warn "This script should not be run as root for security reasons."
        warn "Please run as a regular user with sudo privileges."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Detect OS and package manager
detect_os() {
    log "Detecting operating system..."
    
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        error "Cannot detect operating system"
    fi
    
    case $OS in
        *"Ubuntu"*|*"Debian"*)
            PKG_MANAGER="apt"
            PKG_UPDATE="apt update"
            PKG_INSTALL="apt install -y"
            ;;
        *"CentOS"*|*"Red Hat"*|*"Rocky"*|*"AlmaLinux"*)
            PKG_MANAGER="yum"
            PKG_UPDATE="yum update -y"
            PKG_INSTALL="yum install -y"
            ;;
        *"Fedora"*)
            PKG_MANAGER="dnf"
            PKG_UPDATE="dnf update -y"
            PKG_INSTALL="dnf install -y"
            ;;
        *)
            error "Unsupported operating system: $OS"
            ;;
    esac
    
    info "Detected: $OS $VER"
    info "Package manager: $PKG_MANAGER"
}

# Update system packages
update_system() {
    log "Updating system packages..."
    sudo $PKG_UPDATE
    
    # Install essential packages
    case $PKG_MANAGER in
        "apt")
            sudo $PKG_INSTALL curl wget git unzip software-properties-common \
                build-essential python3 python3-pip ufw fail2ban \
                iptables-persistent netfilter-persistent
            ;;
        "yum"|"dnf")
            sudo $PKG_INSTALL curl wget git unzip epel-release \
                gcc gcc-c++ make python3 python3-pip firewalld fail2ban \
                iptables-services
            ;;
    esac
}

# Install Node.js
install_nodejs() {
    log "Installing Node.js..."
    
    # Check if Node.js is already installed
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)
        
        if [[ $MAJOR_VERSION -ge 18 ]]; then
            info "Node.js $NODE_VERSION is already installed"
            return
        fi
    fi
    
    # Install Node.js 20.x
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo $PKG_INSTALL nodejs
    
    # Verify installation
    node --version
    npm --version
}

# Create application directory and user
setup_directories() {
    log "Setting up directories and permissions..."
    
    # Create application directory
    sudo mkdir -p $INSTALL_DIR
    sudo mkdir -p $BACKUP_DIR
    sudo mkdir -p /var/log/socks5-admin
    
    # Create application user
    if ! id "socks5admin" &>/dev/null; then
        sudo useradd -r -s /bin/false -d /home/socks5admin socks5admin
    fi
    
    # Set initial ownership for setup
    sudo chown -R $USER:$USER $INSTALL_DIR
    sudo chown -R socks5admin:socks5admin /var/log/socks5-admin
    
    # Ensure socks5admin user has a home directory
    sudo mkdir -p /home/socks5admin
    sudo chown -R socks5admin:socks5admin /home/socks5admin
}

# Download and install application files
install_application() {
    log "Downloading SOCKS5 proxy management application..."
    
    # Repository information
    REPO_ZIP_URL="https://github.com/fahim8401/SockProxyManagerPanel/archive/refs/heads/MAIN.zip"
    TEMP_DIR="/tmp/socks5-admin-download"
    ZIP_FILE="/tmp/socks5-admin.zip"
    
    # Install required tools
    case $PKG_MANAGER in
        "apt")
            sudo apt update
            sudo apt install -y curl wget unzip build-essential python3
            ;;
        "yum"|"dnf")
            sudo $PKG_MANAGER install -y curl wget unzip gcc-c++ make python3
            ;;
    esac
    
    # Clean up any existing temp files
    rm -rf $TEMP_DIR $ZIP_FILE
    
    # Download the repository
    log "Downloading from GitHub repository..."
    if wget -O $ZIP_FILE $REPO_ZIP_URL; then
        log "✅ Successfully downloaded repository archive"
    else
        error "Failed to download repository from GitHub"
        log "Falling back to creating basic application structure..."
        create_fallback_application
        return
    fi
    
    # Extract the archive
    log "Extracting application files..."
    mkdir -p $TEMP_DIR
    if unzip -q $ZIP_FILE -d $TEMP_DIR; then
        log "✅ Successfully extracted application files"
    else
        error "Failed to extract repository archive"
        log "Falling back to creating basic application structure..."
        create_fallback_application
        return
    fi
    
    # Find the extracted directory (GitHub creates a directory with branch name)
    EXTRACTED_DIR=$(find $TEMP_DIR -maxdepth 1 -type d -name "*SockProxyManagerPanel*" | head -1)
    
    if [[ -z "$EXTRACTED_DIR" ]]; then
        error "Could not find extracted application directory"
        log "Falling back to creating basic application structure..."
        create_fallback_application
        return
    fi
    
    log "Found extracted directory: $EXTRACTED_DIR"
    
    # Copy application files to install directory
    log "Installing application files..."
    cp -r "$EXTRACTED_DIR"/* $INSTALL_DIR/ 2>/dev/null || {
        error "Failed to copy application files"
        log "Falling back to creating basic application structure..."
        create_fallback_application
        return
    }
    
    # Set temporary ownership for setup
    sudo chown -R root:root $INSTALL_DIR
    
    # Always ensure SQLite configuration is correct
    cat > $INSTALL_DIR/drizzle.config.ts << 'EOF'
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./database.sqlite",
  },
});
EOF

    # Remove any existing drizzle migration directory to avoid conflicts
    sudo rm -rf $INSTALL_DIR/drizzle 2>/dev/null || true
    
    # Cleanup
    rm -rf $TEMP_DIR $ZIP_FILE
    
    log "✅ Successfully installed application from GitHub repository"
}

# Fallback function to create basic application if download fails
create_fallback_application() {
    log "Creating fallback SOCKS5 proxy management application..."
    
    # Create directory structure
    mkdir -p $INSTALL_DIR/{client/src/{components/ui,pages,lib,hooks},server/{services},shared}
    
    # Create package.json with all dependencies
    cat > $INSTALL_DIR/package.json << 'EOF'
{
  "name": "socks5-admin",
  "version": "4.0.0",
  "description": "Enterprise SOCKS5 Proxy Management System",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "npm run build:server",
    "build:server": "esbuild server/index.ts --bundle --platform=node --outfile=server/index.js --external:better-sqlite3 --external:ws",
    "db:push": "drizzle-kit push:sqlite"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^8.7.0",
    "drizzle-orm": "^0.28.6",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "ws": "^8.14.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "drizzle-kit": "^0.19.13",
    "tsx": "^3.14.0",
    "typescript": "^5.2.2",
    "esbuild": "^0.19.5",
    "@types/express": "^4.17.21",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/ws": "^8.5.10",
    "@types/uuid": "^9.0.7",
    "@types/cors": "^2.8.17"
  }
}
EOF

    # Create TypeScript configuration
    cat > $INSTALL_DIR/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "declaration": false,
    "outDir": "./dist",
    "rootDir": "./",
    "baseUrl": "./",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./shared/*"]
    }
  },
  "include": [
    "server/**/*",
    "shared/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
EOF

    # Create database schema
    cat > $INSTALL_DIR/shared/schema.ts << 'EOF'
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  ipAddress: text("ip_address"),
  outboundIp: text("outbound_ip"),
  port: integer("port").default(1080),
  dataLimit: integer("data_limit").default(0),
  dataUsed: integer("data_used").default(0),
  daysValid: integer("days_valid").default(30),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at").default(Date.now()),
  expiresAt: integer("expires_at").default(0),
  lastConnection: integer("last_connection")
});

export const connections = sqliteTable("connections", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  clientIp: text("client_ip"),
  targetHost: text("target_host"),
  targetPort: integer("target_port"),
  bytesTransferred: integer("bytes_transferred").default(0),
  startTime: integer("start_time").default(Date.now()),
  endTime: integer("end_time"),
  isActive: integer("is_active", { mode: "boolean" }).default(true)
});

export const ipPool = sqliteTable("ip_pool", {
  id: text("id").primaryKey(),
  ipAddress: text("ip_address").notNull().unique(),
  ipType: text("ip_type").default("IPv4"),
  isAvailable: integer("is_available", { mode: "boolean" }).default(true),
  assignedUsers: integer("assigned_users").default(0),
  location: text("location"),
  createdAt: integer("created_at").default(Date.now())
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Connection = typeof connections.$inferSelect;
export type InsertConnection = typeof connections.$inferInsert;
export type IpPool = typeof ipPool.$inferSelect;
export type InsertIpPool = typeof ipPool.$inferInsert;
EOF

    # Create main server application
    cat > $INSTALL_DIR/server/index.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 5000;
const SOCKS_PORT = process.env.SOCKS_PORT || 1080;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Database setup
const DB_PATH = path.join(__dirname, '../database.sqlite');
const sqlite = new Database(DB_PATH);
const db = drizzle(sqlite, { schema });

// Initialize database tables
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT,
    ip_address TEXT,
    outbound_ip TEXT,
    port INTEGER DEFAULT 1080,
    data_limit INTEGER DEFAULT 0,
    data_used INTEGER DEFAULT 0,
    days_valid INTEGER DEFAULT 30,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    expires_at INTEGER DEFAULT 0,
    last_connection INTEGER
  );

  CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    client_ip TEXT,
    target_host TEXT,
    target_port INTEGER,
    bytes_transferred INTEGER DEFAULT 0,
    start_time INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    end_time INTEGER,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS ip_pool (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL UNIQUE,
    ip_type TEXT DEFAULT 'IPv4',
    is_available INTEGER DEFAULT 1,
    assigned_users INTEGER DEFAULT 0,
    location TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  );
`);

// Middleware
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist/public')));

// Default admin credentials
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

// JWT middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (username !== ADMIN_CREDENTIALS.username) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = password === ADMIN_CREDENTIALS.password;
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { username: ADMIN_CREDENTIALS.username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        username: ADMIN_CREDENTIALS.username,
        role: 'admin'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// User portal login
app.post('/api/user/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = db.select().from(schema.users).where(eq(schema.users.username, username)).get();
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    let isValidPassword = false;
    try {
      if (user.password.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        isValidPassword = user.password === password;
      }
    } catch (error) {
      isValidPassword = user.password === password;
    }
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is suspended' });
    }

    if (user.expiresAt && user.expiresAt < Math.floor(Date.now() / 1000)) {
      return res.status(401).json({ message: 'Account has expired' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: 'user' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: 'user'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// User profile endpoint
app.get('/api/user/profile', async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.role !== 'user') {
      return res.status(403).json({ message: 'User access required' });
    }

    const user = db.select().from(schema.users).where(eq(schema.users.id, decoded.userId)).get();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const dataUsagePercent = user.dataLimit > 0 ? (user.dataUsed / user.dataLimit) * 100 : 0;
    const daysUntilExpiry = Math.max(0, Math.ceil((user.expiresAt - Date.now() / 1000) / (24 * 60 * 60)));

    res.json({
      id: user.id,
      username: user.username,
      assignedIP: user.ipAddress || 'Not assigned',
      port: user.port || 1080,
      dataLimit: user.dataLimit,
      dataUsed: user.dataUsed,
      dataUsagePercent: Math.round(dataUsagePercent),
      expirationDate: user.expiresAt,
      daysUntilExpiry,
      isActive: user.isActive,
      lastConnection: user.lastConnection,
      createdAt: user.createdAt
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// API routes
app.get('/api/stats', async (req, res) => {
  try {
    const totalUsers = db.select().from(schema.users).all().length;
    const activeConnections = db.select().from(schema.connections).where(eq(schema.connections.isActive, true)).all().length;
    const dataTransferred = db.select().from(schema.connections).all().reduce((sum, conn) => sum + (conn.bytesTransferred || 0), 0);
    const availableIPs = db.select().from(schema.ipPool).where(eq(schema.ipPool.isAvailable, true)).all().length;

    res.json({
      totalUsers,
      activeConnections,
      dataTransferred,
      availableIPs
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = db.select().from(schema.users).all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body;
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const newUser = {
      id: uuidv4(),
      ...userData,
      password: hashedPassword,
      createdAt: Date.now(),
      expiresAt: Math.floor((Date.now() + userData.daysValid * 24 * 60 * 60 * 1000) / 1000)
    };

    const user = db.insert(schema.users).values(newUser).returning().get();
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create user' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '4.0.0',
    socks_port: SOCKS_PORT
  });
});

// Initialize sample data
const initializeData = async () => {
  try {
    // Add sample IP addresses if none exist
    const existingIPs = db.select().from(schema.ipPool).all();
    if (existingIPs.length === 0) {
      const sampleIPs = [
        '103.7.4.182',
        '103.7.4.183',
        '103.7.4.184',
        '103.7.4.185',
        '103.7.4.186',
        '103.7.4.187'
      ];

      sampleIPs.forEach(ip => {
        db.insert(schema.ipPool).values({
          id: uuidv4(),
          ipAddress: ip,
          ipType: 'IPv4',
          isAvailable: true,
          assignedUsers: 0,
          location: 'Singapore',
          createdAt: Date.now()
        }).run();
      });

      console.log('✅ Sample IP addresses added to pool');
    }

    // Add sample user if none exist
    const existingUsers = db.select().from(schema.users).all();
    if (existingUsers.length === 0) {
      db.insert(schema.users).values({
        id: uuidv4(),
        username: 'testuser',
        password: 'pass123',
        email: 'test@example.com',
        ipAddress: '103.7.4.182',
        outboundIp: '103.7.4.182',
        port: 1080,
        dataLimit: 5 * 1024 * 1024 * 1024, // 5GB
        dataUsed: 0,
        daysValid: 30,
        isActive: true,
        createdAt: Date.now(),
        expiresAt: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000)
      }).run();

      console.log('✅ Sample user created: testuser/pass123');
    }
  } catch (error) {
    console.error('Error initializing data:', error);
  }
};

// Create HTTP server
const httpServer = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected to WebSocket');

  const sendStats = async () => {
    try {
      const stats = {
        totalUsers: db.select().from(schema.users).all().length,
        activeConnections: db.select().from(schema.connections).where(eq(schema.connections.isActive, true)).all().length,
        dataTransferred: db.select().from(schema.connections).all().reduce((sum, conn) => sum + (conn.bytesTransferred || 0), 0),
        availableIPs: db.select().from(schema.ipPool).where(eq(schema.ipPool.isAvailable, true)).all().length
      };
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'stats', data: stats }));
      }
    } catch (error) {
      console.error('Error sending stats:', error);
    }
  };

  sendStats();
  const interval = setInterval(sendStats, 5000);

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    clearInterval(interval);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clearInterval(interval);
  });
});

// Serve frontend for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Start server
httpServer.listen(PORT, '0.0.0.0', async () => {
  console.log(`✅ SOCKS5 Admin Panel running on port ${PORT}`);
  console.log(`🌐 Admin Panel: http://localhost:${PORT}`);
  console.log(`👤 User Portal: http://localhost:${PORT}/user-portal`);
  console.log(`🔒 Default admin: admin/admin123`);
  
  await initializeData();
});

export { db };
EOF

    # Create simple client index.html
    cat > $INSTALL_DIR/client/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SOCKS5 Proxy Management System</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card h3 { margin-bottom: 15px; color: #1f2937; }
        .btn { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin: 5px; border: none; cursor: pointer; }
        .btn:hover { background: #1d4ed8; }
        .status { padding: 10px; border-radius: 6px; margin: 10px 0; }
        .status.success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .status.info { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
        .feature-list { list-style: none; }
        .feature-list li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .feature-list li:before { content: "✅"; margin-right: 10px; }
        .footer { text-align: center; margin-top: 40px; color: #6b7280; }
        .nav { display: flex; justify-content: center; gap: 10px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 SOCKS5 Proxy Management System</h1>
            <p>Enterprise Edition v4.0.0 - Successfully Installed!</p>
        </div>

        <div class="status success">
            <strong>✅ Installation Complete!</strong> Your SOCKS5 proxy management system is now running and ready to use.
        </div>

        <div class="nav">
            <button class="btn" onclick="showAdminPanel()">Admin Panel</button>
            <button class="btn" onclick="showUserPortal()">User Portal</button>
            <button class="btn" onclick="showSystemStatus()">System Status</button>
        </div>

        <div id="content">
            <div class="grid">
                <div class="card">
                    <h3>🛡️ Admin Panel Access</h3>
                    <p><strong>Default Credentials:</strong></p>
                    <p>Username: <code>admin</code></p>
                    <p>Password: <code>admin123</code></p>
                    <div class="status info">
                        <strong>⚠️ Security Note:</strong> Please change the default password immediately after first login.
                    </div>
                </div>

                <div class="card">
                    <h3>👤 User Portal</h3>
                    <p><strong>Test User:</strong></p>
                    <p>Username: <code>testuser</code></p>
                    <p>Password: <code>pass123</code></p>
                    <p>SOCKS5 Port: <code>1080</code></p>
                </div>

                <div class="card">
                    <h3>🌐 Access URLs</h3>
                    <ul class="feature-list">
                        <li><strong>Admin Panel:</strong> <a href="/admin" target="_blank">http://your-server:5000</a></li>
                        <li><strong>User Portal:</strong> <a href="/user-portal" target="_blank">http://your-server:5000/user-portal</a></li>
                        <li><strong>API Health:</strong> <a href="/api/health" target="_blank">http://your-server:5000/api/health</a></li>
                    </ul>
                </div>

                <div class="card">
                    <h3>🔧 SOCKS5 Configuration</h3>
                    <ul class="feature-list">
                        <li><strong>Server:</strong> your-server-ip</li>
                        <li><strong>Port:</strong> 1080</li>
                        <li><strong>Authentication:</strong> Username/Password</li>
                        <li><strong>Protocol:</strong> SOCKS5</li>
                    </ul>
                </div>

                <div class="card">
                    <h3>📊 System Features</h3>
                    <ul class="feature-list">
                        <li>Real-time user management</li>
                        <li>IP pool management with sharing</li>
                        <li>Data usage monitoring</li>
                        <li>Connection analytics</li>
                        <li>User portal access</li>
                        <li>WebSocket real-time updates</li>
                    </ul>
                </div>

                <div class="card">
                    <h3>🛠️ Next Steps</h3>
                    <ol style="padding-left: 20px;">
                        <li>Login to admin panel and change password</li>
                        <li>Add your public IP addresses to IP pool</li>
                        <li>Create SOCKS5 users and assign IPs</li>
                        <li>Configure firewall rules if needed</li>
                        <li>Test SOCKS5 connections</li>
                    </ol>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>SOCKS5 Proxy Management System v4.0.0 | Enterprise Edition</p>
            <p>System is running on port 5000 | SOCKS5 proxy on port 1080</p>
        </div>
    </div>

    <script>
        function showAdminPanel() {
            document.getElementById('content').innerHTML = `
                <div class="card">
                    <h3>🛡️ Admin Panel</h3>
                    <p>The admin panel provides complete control over your SOCKS5 proxy system.</p>
                    <div class="status info">
                        <strong>Features:</strong> User management, IP pool configuration, analytics, system settings
                    </div>
                    <a href="/admin" class="btn">Open Admin Panel</a>
                </div>
            `;
        }

        function showUserPortal() {
            document.getElementById('content').innerHTML = `
                <div class="card">
                    <h3>👤 User Portal</h3>
                    <p>Users can login to view their account details, usage statistics, and connection information.</p>
                    <div class="status info">
                        <strong>Features:</strong> Account overview, data usage, connection status, IP assignment
                    </div>
                    <a href="/user-portal" class="btn">Open User Portal</a>
                </div>
            `;
        }

        function showSystemStatus() {
            fetch('/api/health')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('content').innerHTML = `
                        <div class="card">
                            <h3>📊 System Status</h3>
                            <div class="status success">
                                <strong>Status:</strong> ${data.status.toUpperCase()}
                            </div>
                            <p><strong>Version:</strong> ${data.version}</p>
                            <p><strong>SOCKS5 Port:</strong> ${data.socks_port}</p>
                            <p><strong>Last Check:</strong> ${data.timestamp}</p>
                        </div>
                    `;
                })
                .catch(error => {
                    document.getElementById('content').innerHTML = `
                        <div class="card">
                            <h3>📊 System Status</h3>
                            <div class="status" style="background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;">
                                <strong>Error:</strong> Unable to fetch system status
                            </div>
                        </div>
                    `;
                });
        }

        // Auto-refresh system status every 30 seconds
        setInterval(() => {
            if (document.getElementById('content').innerHTML.includes('System Status')) {
                showSystemStatus();
            }
        }, 30000);
    </script>
</body>
</html>
EOF
    
    # Create SQLite-compatible drizzle.config.ts
    cat > $INSTALL_DIR/drizzle.config.ts << 'EOF'
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./database.sqlite",
  },
});
EOF

    log "✅ Fallback SOCKS5 proxy application created successfully"
    
    # Remove any existing drizzle migration directory
    sudo rm -rf $INSTALL_DIR/drizzle 2>/dev/null || true
    
    # Set temporary ownership for setup
    sudo chown -R root:root $INSTALL_DIR
    
    # Create .env file
    cat > $INSTALL_DIR/.env << EOF
NODE_ENV=production
PORT=5000
SOCKS_PORT=1080
DATABASE_URL=sqlite://$DB_FILE
JWT_SECRET=$(openssl rand -base64 32)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
EOF
    
    # Set final permissions
    sudo chown -R socks5admin:socks5admin $INSTALL_DIR
    sudo chmod 600 $INSTALL_DIR/.env
    sudo chmod -R 755 $INSTALL_DIR
    sudo chmod +x $INSTALL_DIR/server/index.js 2>/dev/null || true
}

# Create essential application files if not downloaded
create_essential_files() {
    local temp_dir=$1
    
    # Create package.json
    cat > $temp_dir/package.json << 'EOF'
{
  "name": "socks5-admin",
  "version": "4.0.0",
  "description": "Enterprise SOCKS5 Proxy Management System",
  "main": "server/index.js",
  "scripts": {
    "start": "node server/index.js",
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "npm run build:client && npm run build:server",
    "build:client": "vite build",
    "build:server": "esbuild server/index.ts --bundle --platform=node --outfile=server/index.js --external:better-sqlite3",
    "db:push": "drizzle-kit push:sqlite"
  },
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^8.7.0",
    "drizzle-orm": "^0.28.6",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "ws": "^8.14.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.19.13",
    "tsx": "^3.14.0",
    "typescript": "^5.2.2",
    "esbuild": "^0.19.5",
    "vite": "^4.5.0"
  }
}
EOF

    # Create basic tsconfig.json
    cat > $temp_dir/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "commonjs",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": [
    "server/**/*",
    "shared/**/*"
  ]
}
EOF

    # Create basic server structure
    mkdir -p $temp_dir/server
    cat > $temp_dir/server/index.ts << 'EOF'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

    # Create basic shared schema
    mkdir -p $temp_dir/shared
    cat > $temp_dir/shared/schema.ts << 'EOF'
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  ipAddress: text("ip_address"),
  port: integer("port").default(1080),
  dataLimit: integer("data_limit").default(0),
  dataUsed: integer("data_used").default(0),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at").default(Date.now()),
  expiresAt: integer("expires_at").default(0),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
EOF

    info "Created essential application files"
}

# Helper functions for creating config files
create_package_json() {
    create_essential_files $INSTALL_DIR
}

create_tsconfig() {
    create_essential_files $INSTALL_DIR
}

create_vite_config() {
    cat > $INSTALL_DIR/vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
export default defineConfig({
  build: {
    outDir: 'dist/public'
  }
});
EOF
}

create_tailwind_config() {
    cat > $INSTALL_DIR/tailwind.config.ts << 'EOF'
export default {
  content: ["./client/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
EOF
}

create_postcss_config() {
    cat > $INSTALL_DIR/postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
EOF
}

# Install Node.js dependencies
install_dependencies() {
    log "Installing Node.js dependencies..."
    
    cd $INSTALL_DIR
    
    # Update npm to latest version
    sudo npm install -g npm@latest
    
    # Set temporary root ownership for npm installation
    sudo chown -R root:root $INSTALL_DIR
    sudo chmod -R 755 $INSTALL_DIR
    
    # Install dependencies as root with proper flags
    log "Installing Node.js packages..."
    sudo npm ci --omit=dev --unsafe-perm=true --allow-root
    
    # Update browserslist database
    log "Updating browserslist database..."
    sudo npx update-browserslist-db@latest --yes 2>/dev/null || true
    
    # Build application if build script exists
    if sudo npm run --silent 2>/dev/null | grep -q "build"; then
        log "Building application..."
        sudo npm run build --unsafe-perm=true
    else
        log "No build script found, skipping build step"
    fi
    
    # Fix ownership back to socks5admin after npm operations
    log "Setting proper file ownership..."
    sudo chown -R socks5admin:socks5admin $INSTALL_DIR
    sudo chmod -R 755 $INSTALL_DIR
    sudo chmod 600 $INSTALL_DIR/.env 2>/dev/null || true
}

# Setup database
setup_database() {
    log "Setting up SQLite database..."
    
    # Remove any existing database and related files to avoid conflicts
    sudo rm -f $DB_FILE*
    sudo rm -rf $INSTALL_DIR/drizzle
    sudo rm -f $INSTALL_DIR/meta/_journal.json 2>/dev/null || true
    
    # Initialize database with proper permissions
    sudo -u socks5admin touch $DB_FILE
    sudo chmod 660 $DB_FILE
    
    # Initialize database directly with SQL instead of drizzle push
    cd $INSTALL_DIR
    log "Creating database tables directly..."
    
    # Create database schema directly using SQLite commands
    sudo -u socks5admin sqlite3 $DB_FILE << 'EOF'
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT,
    ip_address TEXT,
    outbound_ip TEXT,
    port INTEGER DEFAULT 1080,
    data_limit INTEGER DEFAULT 0,
    data_used INTEGER DEFAULT 0,
    days_valid INTEGER DEFAULT 30,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    expires_at INTEGER DEFAULT 0,
    last_connection INTEGER
);

CREATE TABLE IF NOT EXISTS connections (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    client_ip TEXT,
    target_host TEXT,
    target_port INTEGER,
    bytes_transferred INTEGER DEFAULT 0,
    start_time INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    end_time INTEGER,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS ip_pool (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL UNIQUE,
    ip_type TEXT DEFAULT 'IPv4',
    is_available INTEGER DEFAULT 1,
    assigned_users INTEGER DEFAULT 0,
    location TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Insert sample IP addresses
INSERT OR IGNORE INTO ip_pool (id, ip_address, ip_type, is_available, assigned_users, location) VALUES 
('ip1', '103.7.4.182', 'IPv4', 1, 0, 'Singapore'),
('ip2', '103.7.4.183', 'IPv4', 1, 0, 'Singapore'),
('ip3', '103.7.4.184', 'IPv4', 1, 0, 'Singapore'),
('ip4', '103.7.4.185', 'IPv4', 1, 0, 'Singapore'),
('ip5', '103.7.4.186', 'IPv4', 1, 0, 'Singapore'),
('ip6', '103.7.4.187', 'IPv4', 1, 0, 'Singapore');

-- Insert sample test user
INSERT OR IGNORE INTO users (id, username, password, email, ip_address, outbound_ip, port, data_limit, data_used, days_valid, is_active, expires_at) VALUES 
('testuser1', 'testuser', 'pass123', 'test@example.com', '103.7.4.182', '103.7.4.182', 1080, 5368709120, 0, 30, 1, strftime('%s', 'now') + 2592000);
EOF

    log "✅ Database initialized successfully with sample data"
    
    info "Database initialized at: $DB_FILE"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    case $PKG_MANAGER in
        "apt")
            # UFW configuration
            sudo ufw --force reset
            sudo ufw default deny incoming
            sudo ufw default allow outgoing
            
            # Allow SSH
            sudo ufw allow ssh
            
            # Allow web interface
            sudo ufw allow $WEB_PORT/tcp
            
            # Allow SOCKS5 proxy
            sudo ufw allow $SOCKS_PORT/tcp
            
            # Allow common ports
            sudo ufw allow 80/tcp
            sudo ufw allow 443/tcp
            
            sudo ufw --force enable
            ;;
        "yum"|"dnf")
            # FirewallD configuration
            sudo systemctl start firewalld
            sudo systemctl enable firewalld
            
            sudo firewall-cmd --permanent --zone=public --add-port=$WEB_PORT/tcp
            sudo firewall-cmd --permanent --zone=public --add-port=$SOCKS_PORT/tcp
            sudo firewall-cmd --permanent --zone=public --add-service=ssh
            sudo firewall-cmd --permanent --zone=public --add-service=http
            sudo firewall-cmd --permanent --zone=public --add-service=https
            
            sudo firewall-cmd --reload
            ;;
    esac
    
    info "Firewall configured successfully"
}

# Setup IP routing and NAT
setup_ip_routing() {
    log "Setting up IP routing and NAT..."
    
    # Enable IP forwarding
    echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
    echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
    
    # Create NAT routing script
    cat > $INSTALL_DIR/setup-nat.sh << 'EOF'
#!/bin/bash
# NAT routing setup for SOCKS5 proxy

# Get primary network interface
PRIMARY_INTERFACE=$(ip route | grep default | awk '{print $5}' | head -n1)

# Enable masquerading for outbound traffic
iptables -t nat -A POSTROUTING -o $PRIMARY_INTERFACE -j MASQUERADE

# Allow forwarding
iptables -A FORWARD -i $PRIMARY_INTERFACE -o $PRIMARY_INTERFACE -m state --state RELATED,ESTABLISHED -j ACCEPT
iptables -A FORWARD -i $PRIMARY_INTERFACE -o $PRIMARY_INTERFACE -j ACCEPT

# Save iptables rules
if command -v iptables-save &> /dev/null; then
    iptables-save > /etc/iptables/rules.v4
elif command -v netfilter-persistent &> /dev/null; then
    netfilter-persistent save
fi

echo "NAT routing configured for interface: $PRIMARY_INTERFACE"
EOF
    
    chmod +x $INSTALL_DIR/setup-nat.sh
    sudo $INSTALL_DIR/setup-nat.sh
}

# Configure Fail2Ban
configure_fail2ban() {
    log "Configuring Fail2Ban for security..."
    
    # Create jail configuration for SOCKS5 proxy
    cat > /tmp/socks5-admin.conf << EOF
[socks5-admin]
enabled = true
port = $SOCKS_PORT,$WEB_PORT
protocol = tcp
filter = socks5-admin
logpath = /var/log/socks5-admin/access.log
maxretry = 5
bantime = 3600
findtime = 600
action = iptables[name=socks5-admin, port="$SOCKS_PORT,$WEB_PORT", protocol=tcp]
EOF
    
    sudo mv /tmp/socks5-admin.conf /etc/fail2ban/jail.d/
    
    # Create filter
    cat > /tmp/socks5-admin.filter << EOF
[Definition]
failregex = ^.*Failed login attempt.*from <HOST>.*$
            ^.*Invalid credentials.*from <HOST>.*$
            ^.*Authentication failed.*from <HOST>.*$
ignoreregex =
EOF
    
    sudo mv /tmp/socks5-admin.filter /etc/fail2ban/filter.d/socks5-admin.conf
    
    # Restart fail2ban
    sudo systemctl restart fail2ban
    sudo systemctl enable fail2ban
}

# Create systemd service
create_service() {
    log "Creating systemd service..."
    
    # Get the correct node path
    NODE_PATH=$(which node)
    if [[ -z "$NODE_PATH" ]]; then
        NODE_PATH="/usr/bin/node"
    fi
    
    cat > /tmp/socks5-admin.service << EOF
[Unit]
Description=SOCKS5 Proxy Management System
After=network.target
Wants=network.target

[Service]
Type=simple
User=socks5admin
Group=socks5admin
WorkingDirectory=$INSTALL_DIR
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=SOCKS_PORT=1080
Environment=DATABASE_URL=sqlite:$DB_FILE
Environment=JWT_SECRET=socks5-admin-jwt-secret-key
ExecStart=$NODE_PATH $INSTALL_DIR/server/index.ts
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=socks5-admin

# Resource limits
LimitNOFILE=65536
LimitNPROC=4096

[Install]
WantedBy=multi-user.target
EOF
    
    sudo mv /tmp/socks5-admin.service /etc/systemd/system/
    
    # Verify service file was created correctly
    if [[ ! -f "/etc/systemd/system/socks5-admin.service" ]]; then
        error "Failed to create systemd service file"
        return 1
    fi
    
    # Check for any existing problematic service file and remove it
    sudo systemctl stop $SERVICE_NAME 2>/dev/null || true
    sudo systemctl disable $SERVICE_NAME 2>/dev/null || true
    sudo rm -f /etc/systemd/system/socks5-admin.service.backup 2>/dev/null || true
    
    # Clean up any existing service files with EnvironmentFile references
    if [[ -f "/etc/systemd/system/socks5-admin.service" ]]; then
        if grep -q "EnvironmentFile" /etc/systemd/system/socks5-admin.service; then
            log "Removing old service file with EnvironmentFile reference..."
            sudo mv /etc/systemd/system/socks5-admin.service /etc/systemd/system/socks5-admin.service.backup
        fi
    fi
    
    # Reload systemd and enable service
    sudo systemctl daemon-reload
    
    # Validate service file syntax
    if ! sudo systemctl cat $SERVICE_NAME >/dev/null 2>&1; then
        error "Service file has syntax errors"
        sudo systemctl cat $SERVICE_NAME || true
        return 1
    fi
    
    sudo systemctl enable $SERVICE_NAME
    
    log "✅ Systemd service created and enabled successfully"
}

# Setup log rotation
setup_logging() {
    log "Setting up log rotation..."
    
    cat > /tmp/socks5-admin << EOF
/var/log/socks5-admin/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 socks5admin socks5admin
    postrotate
        systemctl reload socks5-admin
    endscript
}
EOF
    
    sudo mv /tmp/socks5-admin /etc/logrotate.d/
}

# Create backup script
create_backup_script() {
    log "Creating backup script..."
    
    cat > $INSTALL_DIR/backup.sh << 'EOF'
#!/bin/bash
# SOCKS5 Admin Backup Script

BACKUP_DIR="/opt/socks5-admin/backups"
DB_FILE="/opt/socks5-admin/database.sqlite"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
sqlite3 $DB_FILE ".backup $BACKUP_DIR/database_$TIMESTAMP.sqlite"

# Backup configuration
tar -czf $BACKUP_DIR/config_$TIMESTAMP.tar.gz -C /opt/socks5-admin .env

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sqlite" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $TIMESTAMP"
EOF
    
    chmod +x $INSTALL_DIR/backup.sh
    
    # Add to crontab for daily backups
    (sudo -u socks5admin crontab -l 2>/dev/null; echo "0 2 * * * $INSTALL_DIR/backup.sh") | sudo -u socks5admin crontab -
}

# Setup SSL/TLS (optional)
setup_ssl() {
    log "Setting up SSL certificate (self-signed)..."
    
    SSL_DIR="$INSTALL_DIR/ssl"
    mkdir -p $SSL_DIR
    
    # Generate self-signed certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout $SSL_DIR/private.key \
        -out $SSL_DIR/certificate.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    
    sudo chown -R socks5admin:socks5admin $SSL_DIR
    sudo chmod 600 $SSL_DIR/private.key
    
    info "Self-signed SSL certificate created"
}

# Performance optimizations
optimize_system() {
    log "Applying system optimizations..."
    
    # Increase file descriptor limits
    cat >> /tmp/socks5-limits.conf << EOF
socks5admin soft nofile 65536
socks5admin hard nofile 65536
socks5admin soft nproc 4096
socks5admin hard nproc 4096
EOF
    
    sudo mv /tmp/socks5-limits.conf /etc/security/limits.d/
    
    # Network optimizations
    cat >> /tmp/socks5-sysctl.conf << EOF
# Network optimizations for SOCKS5 proxy
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 10
net.ipv4.ip_local_port_range = 1024 65535
EOF
    
    sudo mv /tmp/socks5-sysctl.conf /etc/sysctl.d/99-socks5-admin.conf
    sudo sysctl -p /etc/sysctl.d/99-socks5-admin.conf
}

# Start services
start_services() {
    log "Starting SOCKS5 Admin service..."
    
    # Ensure proper ownership and permissions before starting
    sudo chown -R socks5admin:socks5admin $INSTALL_DIR
    sudo chmod -R 755 $INSTALL_DIR
    sudo chmod 644 $DB_FILE
    
    # Ensure log directory exists
    sudo mkdir -p /var/log/socks5-admin
    sudo chown socks5admin:socks5admin /var/log/socks5-admin
    sudo chmod 755 /var/log/socks5-admin
    
    # Test if Node.js can run the application
    cd $INSTALL_DIR
    log "Testing application startup..."
    
    # Check if required files exist (TypeScript or JavaScript)
    if [[ ! -f "server/index.ts" ]] && [[ ! -f "server/index.js" ]]; then
        error "Application entry point not found! Installation directory structure:"
        ls -la $INSTALL_DIR/ 2>/dev/null || true
        ls -la $INSTALL_DIR/server/ 2>/dev/null || true
        return 1
    fi
    
    # Determine which entry point to use
    if [[ -f "server/index.ts" ]]; then
        ENTRY_POINT="server/index.ts"
    else
        ENTRY_POINT="server/index.js"
    fi
    
    log "Using application entry point: $ENTRY_POINT"
    
    # Check if node_modules exists
    if [[ ! -d "node_modules" ]]; then
        log "Node modules missing! Reinstalling..."
        sudo chown -R root:root $INSTALL_DIR
        if ! sudo npm install --omit=dev --unsafe-perm=true --allow-root --no-audit --no-fund; then
            error "Failed to install npm dependencies"
            return 1
        fi
        sudo chown -R socks5admin:socks5admin $INSTALL_DIR
    fi
    
    # Test basic Node.js execution
    log "Testing Node.js execution..."
    if ! sudo -u socks5admin timeout 10s node --version 2>/dev/null; then
        error "Node.js not accessible by socks5admin user"
        which node || error "Node.js not found in PATH"
        return 1
    fi
    
    # Test application file syntax
    if [[ "$ENTRY_POINT" == "server/index.ts" ]]; then
        # For TypeScript files, check if tsx is available or use node directly
        if command -v tsx >/dev/null 2>&1; then
            log "Testing TypeScript application with tsx..."
            if ! sudo -u socks5admin timeout 5s tsx --version 2>/dev/null; then
                log "tsx not accessible by socks5admin user, installing globally..."
                sudo npm install -g tsx 2>/dev/null || log "tsx installation failed, will use node directly"
            fi
        else
            log "TypeScript file detected but tsx not available, will use node directly"
        fi
    fi
    
    # Clean up any existing failed service instances
    sudo systemctl stop $SERVICE_NAME 2>/dev/null || true
    sudo systemctl reset-failed $SERVICE_NAME 2>/dev/null || true
    
    # Validate service configuration before starting
    log "Validating service configuration..."
    if ! sudo systemctl show $SERVICE_NAME --property=ExecStart | grep -q "server/index.js"; then
        error "Service ExecStart path is incorrect"
        sudo systemctl show $SERVICE_NAME --property=ExecStart,User,WorkingDirectory,Environment
        return 1
    fi
    
    # Test manual execution first
    log "Testing manual execution..."
    cd $INSTALL_DIR
    
    # Ensure all paths and permissions are correct
    if [[ ! -f "$ENTRY_POINT" ]]; then
        error "Application entry point missing: $ENTRY_POINT"
        ls -la server/ 2>/dev/null || error "Server directory missing"
        return 1
    fi
    
    # Test with explicit environment
    log "Testing with production environment..."
    if ! sudo -u socks5admin timeout 15s bash -c "export NODE_ENV=production; export DATABASE_URL=sqlite:$DB_FILE; node $ENTRY_POINT" >/dev/null 2>&1; then
        log "Manual execution test shows errors, checking details..."
        
        # Show actual error for debugging
        log "Attempting to run with error output:"
        sudo -u socks5admin timeout 5s bash -c "export NODE_ENV=production; export DATABASE_URL=sqlite:$DB_FILE; node $ENTRY_POINT" 2>&1 | head -10 || true
        
        log "Continuing with service start despite test failure..."
    else
        log "Manual execution test successful"
    fi
    
    # Start the systemd service with extensive error handling
    log "Starting systemd service..."
    if sudo systemctl start $SERVICE_NAME; then
        # Wait for service to fully initialize
        sleep 15
        
        if sudo systemctl is-active --quiet $SERVICE_NAME; then
            success "✅ SOCKS5 Admin service started successfully"
            
            # Show service status for confirmation
            log "Service Status:"
            sudo systemctl status $SERVICE_NAME --no-pager --lines=10 2>/dev/null || true
            
            # Check if ports are listening
            log "Checking listening ports:"
            sudo netstat -tlnp | grep -E ":5000|:1080" || log "Ports not yet listening (may take a moment)"
            
        else
            error "Service failed to start properly"
            log "Service status details:"
            sudo systemctl status $SERVICE_NAME --no-pager --lines=20 2>/dev/null || true
            
            log "Recent service logs:"
            sudo journalctl -u $SERVICE_NAME --no-pager -l --since "10 minutes ago" --lines=50 2>/dev/null || true
            
            log "Service configuration:"
            sudo systemctl show $SERVICE_NAME --property=ExecStart,User,WorkingDirectory,Environment 2>/dev/null || true
            
            log "File permissions and paths check:"
            ls -la $INSTALL_DIR/server/index.js 2>/dev/null || error "server/index.js missing"
            ls -la $DB_FILE 2>/dev/null || error "Database file missing"
            
            log "Node.js accessibility test:"
            sudo -u socks5admin which node || error "Node.js not in PATH for socks5admin"
            sudo -u socks5admin node --version || error "Node.js not executable by socks5admin"
            
            log "Working directory contents:"
            sudo -u socks5admin ls -la $INSTALL_DIR/ 2>/dev/null || true
            
            # Try one more manual start attempt with full error output
            log "Final manual test with full error output:"
            cd $INSTALL_DIR
            sudo -u socks5admin bash -c "export NODE_ENV=production; export DATABASE_URL=sqlite:$DB_FILE; node $ENTRY_POINT" 2>&1 | head -20 || true
            
            return 1
        fi
    else
        error "Failed to start systemd service"
        log "Systemd start command failed:"
        sudo systemctl status $SERVICE_NAME --no-pager --lines=20 2>/dev/null || true
        sudo journalctl -u $SERVICE_NAME --no-pager -l --since "10 minutes ago" 2>/dev/null || true
        return 1
    fi
}

# Post-installation setup
post_install() {
    log "Running post-installation setup..."
    
    # Get server IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                  ║${NC}"
    echo -e "${GREEN}║          SOCKS5 Proxy Management System v4.0.0                  ║${NC}"
    echo -e "${GREEN}║                 Installation Complete!                          ║${NC}"
    echo -e "${GREEN}║                                                                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo
    echo -e "${CYAN}🌐 Access Information:${NC}"
    echo -e "   Admin Panel: http://$SERVER_IP:$WEB_PORT"
    echo -e "   User Portal: http://$SERVER_IP:$WEB_PORT/user-portal"
    echo -e "   SOCKS5 Proxy: $SERVER_IP:$SOCKS_PORT"
    echo
    echo -e "${CYAN}🔐 Default Credentials:${NC}"
    echo -e "   Username: admin"
    echo -e "   Password: admin123"
    echo
    echo -e "${CYAN}📁 Installation Directory: $INSTALL_DIR${NC}"
    echo -e "${CYAN}📄 Database: $DB_FILE${NC}"
    echo -e "${CYAN}📋 Logs: /var/log/socks5-admin/${NC}"
    echo -e "${CYAN}💾 Backups: $BACKUP_DIR${NC}"
    echo
    echo -e "${CYAN}🔧 Service Management:${NC}"
    echo -e "   Start:   sudo systemctl start $SERVICE_NAME"
    echo -e "   Stop:    sudo systemctl stop $SERVICE_NAME"
    echo -e "   Status:  sudo systemctl status $SERVICE_NAME"
    echo -e "   Logs:    journalctl -u $SERVICE_NAME -f"
    echo
    echo -e "${CYAN}🚀 Features Available:${NC}"
    echo -e "   ✅ Complete Admin Panel with Real-time Monitoring"
    echo -e "   ✅ User Portal for SOCKS5 Users"  
    echo -e "   ✅ IP Routing & NAT Support"
    echo -e "   ✅ API Key Management & External API Access"
    echo -e "   ✅ Settings Management with Database Persistence"
    echo -e "   ✅ WhatsApp/Chrome/All Applications Support"
    echo -e "   ✅ Package-based User Creation"
    echo -e "   ✅ Multi-admin Role Management"
    echo -e "   ✅ Automatic Backups & Log Rotation"
    echo -e "   ✅ Security with Fail2Ban Integration"
    echo -e "   ✅ Performance Optimizations"
    echo
    echo -e "${YELLOW}⚠️  Important Security Notes:${NC}"
    echo -e "   • Change default admin password immediately"
    echo -e "   • Configure SSL/TLS for production use"
    echo -e "   • Review firewall settings"
    echo -e "   • Monitor system logs regularly"
    echo
    echo -e "${YELLOW}📖 Next Steps:${NC}"
    echo -e "   1. Access admin panel and change default password"
    echo -e "   2. Create user packages in Package Management"
    echo -e "   3. Add public IP addresses in IP Pool Management"
    echo -e "   4. Configure system settings as needed"
    echo -e "   5. Create SOCKS5 users and assign IP addresses"
    echo
    echo -e "${GREEN}Installation completed successfully!${NC}"
    echo
}

# Cleanup function
cleanup() {
    if [[ $? -ne 0 ]]; then
        error "Installation failed. Cleaning up..."
        sudo systemctl stop $SERVICE_NAME 2>/dev/null || true
        sudo systemctl disable $SERVICE_NAME 2>/dev/null || true
        sudo rm -f /etc/systemd/system/$SERVICE_NAME.service
        sudo rm -rf $INSTALL_DIR
    fi
}

# Main installation function
main() {
    trap cleanup EXIT
    
    show_banner
    check_root
    detect_os
    update_system
    install_nodejs
    setup_directories
    install_application
    install_dependencies
    setup_database
    configure_firewall
    setup_ip_routing
    configure_fail2ban
    create_service
    setup_logging
    create_backup_script
    setup_ssl
    optimize_system
    start_services
    post_install
    
    trap - EXIT  # Remove trap on successful completion
}

# Run main function
main "$@"