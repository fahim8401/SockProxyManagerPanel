import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import { SocksProxyServer } from "./services/socksProxy";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

let socksProxy: SocksProxyServer;

// Admin credentials (in production, store these securely)
const ADMIN_CREDENTIALS = {
  username: "admin",
  password: bcrypt.hashSync("admin123", 10)
};

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

// Middleware to verify JWT token
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize SOCKS proxy server
  socksProxy = new SocksProxyServer(1080);
  socksProxy.start().catch(console.error);

  // Authentication Routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      // Validate credentials
      if (username !== ADMIN_CREDENTIALS.username) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, ADMIN_CREDENTIALS.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { username: ADMIN_CREDENTIALS.username, role: "admin" },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        token,
        user: {
          username: ADMIN_CREDENTIALS.username,
          role: "admin"
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/verify", authenticateToken, (req: any, res) => {
    res.json({ valid: true, user: req.user });
  });

  // User Portal Routes
  app.post("/api/user/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Find user in database
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // For SOCKS users, we'll use bcrypt to verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token for user
      const token = jwt.sign(
        { id: user.id, username: user.username, role: "user" },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          role: "user"
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // User profile endpoint
  app.get("/api/user/profile", async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ message: "Access token required" });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role !== "user") {
        return res.status(403).json({ message: "User access required" });
      }

      const user = await storage.getUser(decoded.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get assigned IP
      const assignedIP = await storage.getUserAssignedIP(user.id);
      
      res.json({
        id: user.id,
        username: user.username,
        assignedIP: assignedIP || "Not assigned",
        port: 1080, // Default SOCKS5 port
        dataLimit: user.dataLimit,
        dataUsed: user.dataUsed,
        expiresAt: user.expiresAt,
        isActive: user.isActive,
        lastConnection: user.lastConnection
      });
    } catch (error) {
      res.status(401).json({ message: "Invalid token" });
    }
  });

  // Protected API Routes
  app.get("/api/stats", authenticateToken, async (req, res) => {
    try {
      const totalUsers = await storage.getTotalUsers();
      const activeConnections = await storage.getActiveConnectionsCount();
      const dataTransferred = await storage.getTotalDataTransferred();
      const availableIPs = await storage.getAvailableIPsCount();

      res.json({
        totalUsers,
        activeConnections,
        dataTransferred,
        availableIPs
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/users", authenticateToken, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", authenticateToken, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);
      const { confirmPassword, ...userData } = validatedData;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      
      // Reload SOCKS proxy users
      await socksProxy.loadUsers();
      
      res.status(201).json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Reload SOCKS proxy users
      await socksProxy.loadUsers();
      
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get user info before deletion for cleanup
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Release IP if assigned
      if (user.ipAddress) {
        const allIPs = await storage.getAllIPs();
        const assignedIP = allIPs.find(ip => ip.ipAddress === user.ipAddress);
        if (assignedIP) {
          await storage.releaseIP(assignedIP.id);
        }
      }
      
      // Reload SOCKS proxy users to remove deleted user
      await socksProxy.loadUsers();
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/connections", authenticateToken, async (req, res) => {
    try {
      const connections = await storage.getActiveConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });



  // Admin management routes
  app.get("/api/admins", authenticateToken, async (req, res) => {
    try {
      const admins = await storage.getAllAdmins();
      res.json(admins);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admins" });
    }
  });

  app.post("/api/admins", authenticateToken, async (req, res) => {
    try {
      const { insertAdminSchema } = await import("@shared/schema");
      const validatedData = insertAdminSchema.parse(req.body);
      const { confirmPassword, ...adminData } = validatedData;
      
      // Check if username already exists
      const existingAdmin = await storage.getAdminByUsername(adminData.username);
      if (existingAdmin) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password before storing
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(adminData.password, 10);
      
      const currentAdminId = (req as any).user?.id || "system";
      const admin = await storage.createAdmin({
        ...adminData,
        password: hashedPassword
      }, currentAdminId);
      
      // Remove password from response
      const { password, ...adminResponse } = admin;
      res.status(201).json(adminResponse);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create admin" });
    }
  });

  app.patch("/api/admins/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Hash password if provided
      if (updates.password) {
        const bcrypt = await import('bcryptjs');
        updates.password = await bcrypt.hash(updates.password, 10);
      }
      
      const admin = await storage.updateAdmin(id, updates);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }
      
      // Remove password from response
      const { password, ...adminResponse } = admin;
      res.json(adminResponse);
    } catch (error) {
      res.status(500).json({ message: "Failed to update admin" });
    }
  });

  app.delete("/api/admins/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const currentAdminId = (req as any).user?.id;
      
      // Prevent admin from deleting themselves
      if (id === currentAdminId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteAdmin(id);
      if (!success) {
        return res.status(404).json({ message: "Admin not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete admin" });
    }
  });

  app.get("/api/ip-pool", authenticateToken, async (req, res) => {
    try {
      const availableOnly = req.query.available === 'true';
      const ips = availableOnly ? await storage.getAvailableIPs() : await storage.getAllIPs();
      res.json(ips);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IP pool" });
    }
  });

  app.post("/api/ip-pool", authenticateToken, async (req, res) => {
    try {
      const { ipAddress, ipType } = req.body;
      
      if (!ipAddress || !ipType) {
        return res.status(400).json({ message: "IP address and type are required" });
      }

      // Check if IP already exists
      const existingIPs = await storage.getAllIPs();
      const exists = existingIPs.some(ip => ip.ipAddress === ipAddress);
      if (exists) {
        return res.status(400).json({ message: "IP address already exists" });
      }

      const newIP = await storage.addIP({
        ipAddress,
        ipType,
        isAvailable: true,
        assignedUserId: null
      });
      
      res.status(201).json(newIP);
    } catch (error) {
      res.status(500).json({ message: "Failed to add IP address" });
    }
  });

  app.delete("/api/ip-pool/:id", authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteIP(id);
      
      if (!success) {
        return res.status(404).json({ message: "IP address not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting IP:", error);
      res.status(500).json({ message: "Failed to delete IP address" });
    }
  });



  // Network scanning API - uses real system interfaces
  app.post("/api/ip-pool/scan", authenticateToken, async (req, res) => {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      // Get actual system network interfaces
      let systemIPs = [];
      try {
        const { stdout } = await execAsync('hostname -I');
        const hostIPs = stdout.trim().split(/\s+/).filter(ip => ip && ip !== '127.0.0.1');
        
        systemIPs = hostIPs.map((ip, index) => ({
          ip: ip,
          hostname: `system-${index + 1}.local`,
          status: "connected",
          type: "IPv4",
          responseTime: Math.floor(Math.random() * 20) + 1,
          isConnected: true,
          source: "system_interface"
        }));
      } catch (error) {
        console.log("Could not get system IPs, using fallback");
      }
      
      // Add some common local network ranges as examples
      const commonRangeIPs = [
        { ip: "192.168.1.1", hostname: "gateway", status: "connected", type: "IPv4" },
        { ip: "192.168.1.100", hostname: "device-100", status: "connected", type: "IPv4" },
        { ip: "192.168.1.101", hostname: "device-101", status: "connected", type: "IPv4" },
        { ip: "10.0.0.1", hostname: "local-gateway", status: "connected", type: "IPv4" },
        { ip: "10.0.0.100", hostname: "local-device", status: "connected", type: "IPv4" },
      ].map(item => ({ 
        ...item, 
        responseTime: Math.floor(Math.random() * 30) + 1,
        isConnected: true,
        source: "network_scan"
      }));
      
      const allResults = [...systemIPs, ...commonRangeIPs];
      
      // Filter out IPs that are already in the pool
      const existingIPs = await storage.getAllIPs();
      const existingIPAddresses = new Set(existingIPs.map(ip => ip.ipAddress));
      const newResults = allResults.filter(result => !existingIPAddresses.has(result.ip));
      
      res.json({
        success: true,
        results: newResults,
        total_scanned: allResults.length,
        active_hosts: newResults.length,
        scan_range: "auto-detected",
        system_ips: systemIPs.length,
        common_ips: commonRangeIPs.length
      });
    } catch (error) {
      console.error("Network scan error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to scan network",
        results: []
      });
    }
  });

  // Automated User Provisioning API
  app.post("/api/provision-user", authenticateToken, async (req, res) => {
    try {
      const { count = 1, dataLimitGB = 10, daysValid = 30, prefix = "user" } = req.body;
      
      if (count < 1 || count > 100) {
        return res.status(400).json({ message: "Count must be between 1 and 100" });
      }

      const results = [];
      const availableIPs = await storage.getAvailableIPs();
      
      if (availableIPs.length < count) {
        return res.status(400).json({ 
          message: `Not enough available IPs. Available: ${availableIPs.length}, Requested: ${count}` 
        });
      }

      // Generate secure random passwords
      const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };

      for (let i = 0; i < count; i++) {
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substr(2, 5);
        const username = `${prefix}_${timestamp}_${randomSuffix}`;
        const password = generatePassword();
        const assignedIP = availableIPs[i];
        const port = 1080;
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + daysValid);

        const userData = {
          username,
          password: await bcrypt.hash(password, 10), // Hash the password
          email: `${username}@generated.local`,
          ipAddress: assignedIP.ipAddress,
          port,
          dataLimit: dataLimitGB * 1024 * 1024 * 1024, // Convert GB to bytes
          daysValid,
          expiresAt,
          isActive: true,
        };

        const user = await storage.createUser(userData);
        // Mark IP as assigned by updating its availability
        await storage.updateIPAvailability(assignedIP.id, false, user.id.toString());
        
        results.push({
          id: user.id,
          username: user.username,
          password: password, // Return plaintext password for provisioning
          ipAddress: user.ipAddress,
          port: user.port,
          dataLimitGB: dataLimitGB,
          expiresAt: user.expiresAt,
        });
      }

      // Reload SOCKS proxy users
      await socksProxy.loadUsers();

      res.status(201).json({
        message: `Successfully provisioned ${count} user(s)`,
        users: results,
        totalProvisioned: results.length,
      });
    } catch (error: any) {
      console.error("Error provisioning users:", error);
      res.status(500).json({ message: error.message || "Failed to provision users" });
    }
  });

  // Real-time Connection Health API
  app.get("/api/health", authenticateToken, async (req, res) => {
    try {
      const connections = await storage.getActiveConnections();
      const users = await storage.getAllUsers();
      const ipPool = await storage.getAllIPs();
      
      const healthData = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        connections: {
          active: connections.length,
          details: connections.map(conn => ({
            id: conn.id,
            userId: conn.userId,
            ipAddress: conn.ipAddress,
            duration: conn.startTime ? 
              Math.floor((Date.now() - new Date(conn.startTime).getTime()) / 1000) : 0,
            bytesTransferred: conn.bytesTransferred || 0,
          }))
        },
        users: {
          total: users.length,
          active: users.filter(u => u.isActive).length,
          expiringSoon: users.filter(u => {
            const expiresAt = new Date(u.expiresAt);
            const inThreeDays = new Date();
            inThreeDays.setDate(inThreeDays.getDate() + 3);
            return expiresAt <= inThreeDays && u.isActive;
          }).length
        },
        ipPool: {
          total: ipPool.length,
          available: ipPool.filter(ip => ip.isAvailable).length,
          assigned: ipPool.filter(ip => !ip.isAvailable).length,
        },
        server: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          nodeVersion: process.version,
        }
      };

      res.json(healthData);
    } catch (error) {
      res.status(500).json({ 
        status: "unhealthy",
        message: "Failed to fetch health data",
        timestamp: new Date().toISOString()
      });
    }
  });

  // IP Scanning Routes
  app.post("/api/ip-pool/scan", authenticateToken, async (req, res) => {
    try {
      const { range } = req.body;
      
      // Simulate network scanning
      const results = [];
      const startIP = range || "192.168.1.1";
      const baseIP = startIP.split('.').slice(0, 3).join('.');
      
      for (let i = 1; i <= 254; i++) {
        const ip = `${baseIP}.${i}`;
        const isActive = Math.random() > 0.7; // Simulate 30% active IPs
        
        if (isActive) {
          results.push({
            ip,
            hostname: `device-${i}.local`,
            mac: `00:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}:${Math.floor(Math.random() * 256).toString(16).padStart(2, '0')}`,
            vendor: ["Apple", "Samsung", "Dell", "HP", "Cisco", "Netgear"][Math.floor(Math.random() * 6)],
            responseTime: Math.floor(Math.random() * 100) + 1,
            status: "active"
          });
        }
      }
      
      res.json({
        range: `${baseIP}.1-254`,
        total_scanned: 254,
        active_hosts: results.length,
        results
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to scan network" });
    }
  });

  // Get Connected IPs (simulate system network connections)
  app.get("/api/system/connected-ips", authenticateToken, async (req, res) => {
    try {
      // Simulate system network connections
      const connections = [
        {
          local_ip: "192.168.1.100",
          remote_ip: "8.8.8.8",
          protocol: "TCP",
          local_port: 53421,
          remote_port: 443,
          state: "ESTABLISHED",
          process: "chrome.exe",
          pid: 1234
        },
        {
          local_ip: "192.168.1.100", 
          remote_ip: "1.1.1.1",
          protocol: "UDP",
          local_port: 53,
          remote_port: 53,
          state: "OPEN",
          process: "dns.exe",
          pid: 5678
        },
        {
          local_ip: "192.168.1.100",
          remote_ip: "74.125.224.72", 
          protocol: "TCP",
          local_port: 80,
          remote_port: 80,
          state: "TIME_WAIT",
          process: "firefox.exe", 
          pid: 9012
        }
      ];

      res.json({
        total_connections: connections.length,
        local_ip: "192.168.1.100",
        connections
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get system connections" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to WebSocket');

    // Send initial data
    const sendStats = async () => {
      try {
        const stats = {
          totalUsers: await storage.getTotalUsers(),
          activeConnections: await storage.getActiveConnectionsCount(),
          dataTransferred: await storage.getTotalDataTransferred(),
          availableIPs: await storage.getAvailableIPsCount()
        };
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'stats', data: stats }));
        }
      } catch (error) {
        console.error('Error sending stats:', error);
      }
    };

    // Send stats immediately
    sendStats();

    // Send updated stats every 5 seconds
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

  return httpServer;
}
