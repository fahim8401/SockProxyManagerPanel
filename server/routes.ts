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

// Middleware to verify API key for external API access
const authenticateApiKey = async (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const apiKey = authHeader && authHeader.split(' ')[1]; // Bearer API_KEY

  if (!apiKey) {
    return res.status(401).json({ success: false, message: "API key required" });
  }

  try {
    // Check if API key exists and is active
    const apiKeys = await storage.getAllApiKeys();
    let validKey = null;
    
    for (const key of apiKeys) {
      if (key.isActive) {
        const isValid = await bcrypt.compare(apiKey, key.keyHash);
        if (isValid) {
          validKey = key;
          break;
        }
      }
    }
    
    if (!validKey) {
      return res.status(401).json({ success: false, message: "Invalid API key" });
    }

    // Update API key usage
    await storage.updateApiKeyUsage(validKey.keyHash);
    
    req.apiKey = validKey;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Authentication error" });
  }
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

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({ message: "Account is suspended" });
      }

      // Check if user is expired
      if (user.expiresAt < Math.floor(Date.now() / 1000)) {
        return res.status(401).json({ message: "Account has expired" });
      }

      // Generate JWT token for user
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: "user" },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          assignedIP: user.ipAddress,
          port: user.port
        }
      });
    } catch (error) {
      console.error("User login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // User profile route
  app.get("/api/user/profile", async (req, res) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: "Access token required" });
      }

      jwt.verify(token, JWT_SECRET, async (err: any, decoded: any) => {
        if (err) {
          return res.status(403).json({ message: "Invalid or expired token" });
        }

        if (decoded.role !== "user") {
          return res.status(403).json({ message: "Access denied" });
        }

        try {
          const user = await storage.getUser(decoded.userId);
          if (!user) {
            return res.status(404).json({ message: "User not found" });
          }

          // Calculate data usage percentage
          const dataUsagePercent = ((user.dataUsed || 0) / user.dataLimit) * 100;
          const daysUntilExpiry = Math.ceil((user.expiresAt * 1000 - Date.now()) / (1000 * 60 * 60 * 24));

          res.json({
            id: user.id,
            username: user.username,
            assignedIP: user.ipAddress,
            port: user.port,
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
          console.error("Profile fetch error:", error);
          res.status(500).json({ message: "Failed to fetch profile" });
        }
      });
    } catch (error) {
      console.error("Profile route error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User Portal Authentication Routes for SOCKS5 users
  app.post("/api/user/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      console.log(`User portal login attempt - Username: '${username}', Password: '${password}'`);
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      // Get SOCKS5 user by username
      const user = await storage.getUserByUsername(username);
      console.log(`User found in database:`, !!user);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log(`Stored password: '${user.password}', Input password: '${password}'`);
      
      // For SOCKS users, check if password is hashed or plain text
      let isValidPassword = false;
      try {
        // Try bcrypt first (for hashed passwords)
        if (user.password.startsWith('$2')) { // bcrypt hash starts with $2
          isValidPassword = await bcrypt.compare(password, user.password);
          console.log('Used bcrypt comparison:', isValidPassword);
        } else {
          // Plain text comparison
          isValidPassword = user.password === password;
          console.log('Used plain text comparison:', isValidPassword);
        }
      } catch (error) {
        console.log('Password comparison error:', error);
        // If bcrypt fails, try plain text comparison
        isValidPassword = user.password === password;
        console.log('Fallback plain text comparison:', isValidPassword);
      }
      
      if (!isValidPassword) {
        console.log('Authentication failed - invalid password');
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token for user
      const token = jwt.sign(
        { userId: user.id, username: user.username, role: "user" },
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
  app.get("/api/stats", async (req, res) => {
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

  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      console.log("Received user data:", req.body);
      const validatedData = insertUserSchema.parse(req.body);
      console.log("Validated data:", validatedData);
      const { confirmPassword, ...userData } = validatedData;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      console.log("Creating user with data:", userData);
      const user = await storage.createUser(userData);
      console.log("User created successfully:", user);
      
      // Reload SOCKS proxy users
      try {
        await socksProxy.loadUsers();
        console.log("SOCKS proxy users reloaded successfully");
      } catch (socksError) {
        console.error("Error reloading SOCKS proxy users:", socksError);
      }
      
      res.status(201).json(user);
    } catch (error: any) {
      console.error("User creation error:", error);
      res.status(400).json({ message: error.message || "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
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

  app.delete("/api/users/:id", async (req, res) => {
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

  app.get("/api/connections", async (req, res) => {
    try {
      const connections = await storage.getActiveConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });

  // Get online users
  app.get("/api/users/online", async (req, res) => {
    try {
      const onlineUsers = socksProxy.getOnlineUsers();
      const onlineUserData = await Promise.all(
        onlineUsers.map(async (userId) => {
          const user = await storage.getUser(userId);
          return user;
        })
      );
      res.json(onlineUserData.filter(Boolean));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch online users" });
    }
  });



  // Admin management routes
  app.get("/api/admins", async (req, res) => {
    try {
      const admins = await storage.getAllAdmins();
      res.json(admins);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admins" });
    }
  });

  app.post("/api/admins", async (req, res) => {
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

  app.patch("/api/admins/:id", async (req, res) => {
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

  app.delete("/api/admins/:id", async (req, res) => {
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

  // API Keys management routes
  app.get("/api/api-keys", async (req, res) => {
    try {
      const apiKeys = await storage.getAllApiKeys();
      // Transform to match frontend expectations
      const formattedKeys = apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        keyHash: key.keyHash, // This will be shown partially
        isActive: key.isActive,
        usageCount: key.usageCount || 0,
        createdAt: key.createdAt || Math.floor(Date.now() / 1000),
        lastUsed: key.lastUsed || null,
      }));
      res.json(formattedKeys);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post("/api/api-keys", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "API key name is required" });
      }

      const result = await storage.createApiKey(name, "admin");
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to create API key" });
    }
  });

  app.delete("/api/api-keys/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteApiKey(id);
      
      if (!success) {
        return res.status(404).json({ message: "API key not found" });
      }
      
      res.json({ message: "API key deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  // Public API v1 endpoints (for external access)
  app.get("/api/v1/users", authenticateApiKey, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json({ success: true, data: users });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch users" });
    }
  });

  app.post("/api/v1/users", authenticateApiKey, async (req, res) => {
    try {
      const { insertUserSchema } = await import("@shared/schema");
      const validatedData = insertUserSchema.parse(req.body);
      const { confirmPassword, ...userData } = validatedData;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ success: false, message: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      res.status(201).json({ success: true, data: user });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message || "Failed to create user" });
    }
  });

  app.delete("/api/v1/users/:id", authenticateApiKey, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to delete user" });
    }
  });

  app.patch("/api/v1/users/:id", authenticateApiKey, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to update user" });
    }
  });

  app.get("/api/ip-pool", async (req, res) => {
    try {
      const availableOnly = req.query.available === 'true';
      const ips = availableOnly ? await storage.getAvailableIPs() : await storage.getAllIPs();
      // Add usage count for each IP
      const ipsWithUsage = await Promise.all(
        ips.map(async (ip) => ({
          ...ip,
          userCount: await storage.getIPUsageCount(ip.ipAddress)
        }))
      );
      res.json(ipsWithUsage);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IP pool" });
    }
  });

  app.post("/api/ip-pool", async (req, res) => {
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

  app.delete("/api/ip-pool/:id", async (req, res) => {
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
      let systemIPs: any[] = [];
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
        
        const expiresAt = Math.floor((Date.now() + daysValid * 24 * 60 * 60 * 1000) / 1000);

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
        // Assign IP to user (multiple users can share same IP)
        await storage.updateIPAvailability(assignedIP.id, true, user.id.toString());
        
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
  app.get("/api/health", async (req, res) => {
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
              Math.floor(Date.now() / 1000) - conn.startTime : 0,
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

  // Server time endpoint
  app.get("/api/server-time", (req, res) => {
    const now = new Date();
    res.json({
      timestamp: now.toISOString(),
      unix: Math.floor(Date.now() / 1000),
      formatted: now.toLocaleString('en-US', { 
        timeZone: 'UTC',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      }),
      local: now.toLocaleString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
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

  // Get Connected IPs (real OS network interfaces)
  app.get("/api/system/connected-ips", authenticateToken, async (req, res) => {
    try {
      const os = require('os');
      const networkInterfaces = os.networkInterfaces();
      
      const interfaceData = [];
      
      for (const [interfaceName, addresses] of Object.entries(networkInterfaces)) {
        if (addresses && Array.isArray(addresses)) {
          for (const addr of addresses) {
            // Skip loopback and internal addresses
            if (!addr.internal) {
              interfaceData.push({
                interface: interfaceName,
                ip_address: addr.address,
                family: addr.family,
                mac: addr.mac,
                netmask: addr.netmask,
                cidr: addr.cidr || `${addr.address}/${addr.family === 'IPv4' ? '24' : '64'}`,
                status: "active"
              });
            }
          }
        }
      }

      res.json({
        total_interfaces: interfaceData.length,
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        interfaces: interfaceData
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get network interfaces" });
    }
  });

  // Package management routes
  app.get("/api/packages", async (req, res) => {
    try {
      const packages = await storage.getAllPackages();
      res.json(packages);
    } catch (error) {
      console.error("Error fetching packages:", error);
      res.status(500).json({ message: "Failed to fetch packages" });
    }
  });

  app.post("/api/packages", async (req, res) => {
    try {
      const packageData = req.body;
      const newPackage = await storage.createPackage(packageData);
      res.status(201).json(newPackage);
    } catch (error) {
      console.error("Error creating package:", error);
      res.status(500).json({ message: "Failed to create package" });
    }
  });

  app.put("/api/packages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedPackage = await storage.updatePackage(id, updates);
      if (!updatedPackage) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json(updatedPackage);
    } catch (error) {
      console.error("Error updating package:", error);
      res.status(500).json({ message: "Failed to update package" });
    }
  });

  app.delete("/api/packages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePackage(id);
      if (!success) {
        return res.status(404).json({ message: "Package not found" });
      }
      res.json({ message: "Package deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting package:", error);
      res.status(500).json({ message: "Failed to delete package" });
    }
  });

  // Create user from package API
  app.post("/api/packages/:id/create-user", async (req, res) => {
    try {
      const { id } = req.params;
      const { username, password, ipAddress, port } = req.body;
      
      const user = await storage.createUserFromPackage(id, username, password, ipAddress, port);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user from package:", error);
      res.status(500).json({ message: error.message || "Failed to create user from package" });
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
