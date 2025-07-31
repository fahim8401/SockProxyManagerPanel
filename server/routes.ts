import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import { SocksProxyServer } from "./services/socksProxy";

let socksProxy: SocksProxyServer;

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize SOCKS proxy server
  socksProxy = new SocksProxyServer(1080);
  socksProxy.start().catch(console.error);

  // API Routes
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

  app.get("/api/connections", async (req, res) => {
    try {
      const connections = await storage.getActiveConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });

  app.get("/api/ip-pool", async (req, res) => {
    try {
      const availableOnly = req.query.available === 'true';
      const ips = availableOnly ? await storage.getAvailableIPs() : await storage.getAllIPs();
      res.json(ips);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IP pool" });
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
