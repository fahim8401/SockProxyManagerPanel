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

  app.post("/api/auth/verify", authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
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
      const success = await storage.deleteUser(id);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Reload SOCKS proxy users
      await socksProxy.loadUsers();
      
      res.status(204).send();
    } catch (error) {
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
      const ips = await storage.getAllIPs();
      const ip = ips.find(ip => ip.id === id);
      
      if (!ip) {
        return res.status(404).json({ message: "IP address not found" });
      }

      if (!ip.isAvailable) {
        return res.status(400).json({ message: "Cannot delete assigned IP address" });
      }

      // In a real implementation, you'd have a deleteIP method
      // For now, we'll simulate success
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete IP address" });
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
