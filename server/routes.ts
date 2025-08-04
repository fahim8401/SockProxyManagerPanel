import express, { type Request, Response } from 'express';

// Extend Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}
import { createServer, type Server } from 'http';
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { storage } from './storage';
import { xrayManager } from './xray';
import { 
  insertAdminSchema, 
  insertPackageSchema,
  insertProxyUserSchema, 
  insertIpPoolSchema, 
  insertSettingSchema,
  insertApiKeySchema 
} from '../shared/schema';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'xray-socks5-management-secret';

// API key authentication middleware
export const authenticateApiKey = async (req: Request, res: Response, next: any) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ message: 'API key required' });
  }

  try {
    const keyRecord = await storage.getApiKey(apiKey);
    if (!keyRecord || !keyRecord.isActive) {
      return res.status(401).json({ message: 'Invalid or inactive API key' });
    }

    // Check expiry
    if (keyRecord.expiresAt && new Date() > new Date(keyRecord.expiresAt)) {
      return res.status(401).json({ message: 'API key expired' });
    }

    // Update last used (handled separately)
    // await storage.updateApiKey(keyRecord.id, { lastUsed: new Date() });
    
    req.user = { apiKey: keyRecord, role: 'api' };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid API key' });
  }
};

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export async function registerRoutes(app: express.Application): Promise<Server> {
  
  // Health check
  app.get('/api/health', async (req, res) => {
    const xrayStatus = xrayManager.isRunning();
    const xrayStats = await xrayManager.getStats();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      xray: {
        running: xrayStatus,
        stats: xrayStats
      }
    });
  });

  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }

      const admin = await storage.getAdmin(username);
      if (!admin || !bcrypt.compareSync(password, admin.password)) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { username: admin.username, role: admin.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          username: admin.username,
          role: admin.role
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.get('/api/auth/verify', authenticate, (req, res) => {
    res.json({ valid: true, user: req.user });
  });

  // Dashboard stats
  app.get('/api/stats', authenticate, async (req, res) => {
    try {
      const users = await storage.getAllProxyUsers();
      const activeUsers = await storage.getActiveProxyUsers();
      const connections = await storage.getConnections();
      const activeConnections = connections.filter(c => c.isActive);
      const xrayStats = await xrayManager.getStats();

      const totalDataUsed = users.reduce((sum, user) => sum + (user.dataUsed || 0), 0);

      res.json({
        totalUsers: users.length,
        activeUsers: activeUsers.length,
        totalConnections: connections.length,
        activeConnections: activeConnections.length,
        totalDataTransfer: totalDataUsed,
        xrayRunning: xrayManager.isRunning(),
        xrayStats,
        uptime: process.uptime()
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Packages management
  app.get('/api/packages', authenticate, async (req, res) => {
    try {
      const packages = await storage.getAllPackages();
      res.json(packages);
    } catch (error) {
      console.error('Get packages error:', error);
      res.status(500).json({ message: 'Failed to fetch packages' });
    }
  });

  app.post('/api/packages', authenticate, async (req, res) => {
    try {
      const packageData = insertPackageSchema.parse(req.body);
      const newPackage = await storage.createPackage(packageData);
      res.json(newPackage);
    } catch (error) {
      console.error('Create package error:', error);
      res.status(500).json({ message: 'Failed to create package' });
    }
  });

  app.put('/api/packages/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const packageData = req.body;
      const updatedPackage = await storage.updatePackage(id, packageData);
      res.json(updatedPackage);
    } catch (error) {
      console.error('Update package error:', error);
      res.status(500).json({ message: 'Failed to update package' });
    }
  });

  app.delete('/api/packages/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deletePackage(id);
      res.json({ message: 'Package deleted successfully' });
    } catch (error) {
      console.error('Delete package error:', error);
      res.status(500).json({ message: 'Failed to delete package' });
    }
  });

  // Proxy users management
  app.get('/api/users', authenticate, async (req, res) => {
    try {
      const users = await storage.getAllProxyUsers();
      // Don't send passwords in response
      const safeUsers = users.map(user => ({ ...user, password: undefined }));
      res.json(safeUsers);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get('/api/users/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getProxyUser(id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Get user's package information if exists
      let packageInfo: any = null;
      if (user.packageId) {
        try {
          packageInfo = await storage.getPackage(user.packageId);
        } catch (error) {
          // Package might not exist, continue without it
        }
      }

      // Don't send password in response
      const safeUser = {
        ...user,
        password: undefined,
        packageName: packageInfo?.name || null
      };
      
      res.json(safeUser);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  app.post('/api/users', authenticate, async (req, res) => {
    try {
      const userData = insertProxyUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getProxyUserByUsername(userData.username as string);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      // Set expiry date based on validity days
      if (userData.validityDays && typeof userData.validityDays === 'number') {
        const expiryDate = new Date(Date.now() + userData.validityDays * 24 * 60 * 60 * 1000);
        (userData as any).expiresAt = Math.floor(expiryDate.getTime() / 1000);
      }

      // If IP is selected, get the IP address
      if (userData.selectedIpId && typeof userData.selectedIpId === 'number') {
        const selectedIps = await storage.getAvailableIps();
        const ip = selectedIps.find(ip => ip.id === userData.selectedIpId);
        if (ip) {
          userData.ipAddress = ip.ipAddress;
        }
      }

      const newUser = await storage.createProxyUser(userData);
      
      // Update IP assignment with actual user ID
      if (userData.selectedIpId && typeof userData.selectedIpId === 'number') {
        await storage.assignIpToUser(userData.selectedIpId, newUser.id);
      }
      
      // Update Xray configuration
      await xrayManager.addUser(newUser.username, newUser.password || 'defaultpass');

      res.json({ ...newUser, password: undefined });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  app.put('/api/users/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;

      const updatedUser = await storage.updateProxyUser(id, userData);
      
      // Regenerate Xray config
      await xrayManager.generateConfig();
      await xrayManager.restart();

      res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  app.delete('/api/users/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const user = await storage.getProxyUser(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await storage.deleteProxyUser(id);
      
      // Update Xray configuration
      await xrayManager.removeUser(user.username);

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Connections management
  app.get('/api/connections', authenticate, async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const connections = await storage.getConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error('Get connections error:', error);
      res.status(500).json({ message: 'Failed to fetch connections' });
    }
  });

  // IP pool management
  app.get('/api/ip-pool', authenticate, async (req, res) => {
    try {
      const ipPool = await storage.getIpPool();
      res.json(ipPool);
    } catch (error) {
      console.error('Get IP pool error:', error);
      res.status(500).json({ message: 'Failed to fetch IP pool' });
    }
  });

  app.post('/api/ip-pool', authenticate, async (req, res) => {
    try {
      const ipData = insertIpPoolSchema.parse(req.body);
      const newIp = await storage.createIp(ipData);
      res.json(newIp);
    } catch (error) {
      console.error('Create IP error:', error);
      res.status(500).json({ message: 'Failed to create IP' });
    }
  });

  app.delete('/api/ip-pool/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteIp(id);
      res.json({ message: 'IP deleted successfully' });
    } catch (error) {
      console.error('Delete IP error:', error);
      res.status(500).json({ message: 'Failed to delete IP' });
    }
  });

  // Xray management
  app.post('/api/xray/start', authenticate, async (req, res) => {
    try {
      await xrayManager.start();
      res.json({ message: 'Xray started successfully' });
    } catch (error) {
      console.error('Start Xray error:', error);
      res.status(500).json({ message: 'Failed to start Xray' });
    }
  });

  app.post('/api/xray/stop', authenticate, async (req, res) => {
    try {
      await xrayManager.stop();
      res.json({ message: 'Xray stopped successfully' });
    } catch (error) {
      console.error('Stop Xray error:', error);
      res.status(500).json({ message: 'Failed to stop Xray' });
    }
  });

  app.post('/api/xray/restart', authenticate, async (req, res) => {
    try {
      await xrayManager.restart();
      res.json({ message: 'Xray restarted successfully' });
    } catch (error) {
      console.error('Restart Xray error:', error);
      res.status(500).json({ message: 'Failed to restart Xray' });
    }
  });

  app.get('/api/xray/config', authenticate, async (req, res) => {
    try {
      const config = await storage.getXrayConfig('main');
      res.json(config);
    } catch (error) {
      console.error('Get Xray config error:', error);
      res.status(500).json({ message: 'Failed to fetch Xray config' });
    }
  });

  // Settings management
  app.get('/api/settings', authenticate, async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error) {
      console.error('Get settings error:', error);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  });

  app.post('/api/settings', authenticate, async (req, res) => {
    try {
      const settingData = insertSettingSchema.parse(req.body);
      const setting = await storage.setSetting(settingData);
      res.json(setting);
    } catch (error) {
      console.error('Set setting error:', error);
      res.status(500).json({ message: 'Failed to set setting' });
    }
  });

  // API keys management
  app.get('/api/api-keys', authenticate, async (req, res) => {
    try {
      const apiKeys = await storage.getAllApiKeys();
      // Don't send the actual API keys in response for security
      const safeApiKeys = apiKeys.map(key => ({
        ...key,
        apiKey: key.apiKey.substring(0, 8) + '...' + key.apiKey.substring(key.apiKey.length - 4)
      }));
      res.json(safeApiKeys);
    } catch (error) {
      console.error('Get API keys error:', error);
      res.status(500).json({ message: 'Failed to fetch API keys' });
    }
  });

  app.post('/api/api-keys', authenticate, async (req, res) => {
    try {
      const { keyName, permissions, expiryDays } = req.body;
      
      // Generate secure API key
      const apiKey = 'xray_' + crypto.randomBytes(32).toString('hex');
      
      const apiKeyData = {
        keyName,
        apiKey,
        permissions: permissions || 'read',
        isActive: true,
        expiresAt: expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : undefined
      };

      const newApiKey = await storage.createApiKey(apiKeyData);
      res.json(newApiKey); // Return full key only on creation
    } catch (error) {
      console.error('Create API key error:', error);
      res.status(500).json({ message: 'Failed to create API key' });
    }
  });

  app.delete('/api/api-keys/:id', authenticate, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteApiKey(id);
      res.json({ message: 'API key deleted successfully' });
    } catch (error) {
      console.error('Delete API key error:', error);
      res.status(500).json({ message: 'Failed to delete API key' });
    }
  });

  // Admin-only database cleaning endpoint
  app.post('/api/admin/clean-database', authenticate, async (req, res) => {
    try {
      // Only allow admin users to clean database
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      await storage.cleanDatabase();
      
      res.json({ message: 'Database cleaned successfully. All user data removed except admin credentials.' });
    } catch (error) {
      console.error('Clean database error:', error);
      res.status(500).json({ message: 'Failed to clean database' });
    }
  });

  // External API endpoints (for API key access)
  app.get('/api/external/users', authenticateApiKey, async (req, res) => {
    try {
      const users = await storage.getAllProxyUsers();
      const safeUsers = users.map(user => ({ ...user, password: undefined }));
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.post('/api/external/users', authenticateApiKey, async (req, res) => {
    try {
      const userData = insertProxyUserSchema.parse(req.body);
      
      if (userData.validityDays && typeof userData.validityDays === 'number') {
        const expiryDate = new Date(Date.now() + userData.validityDays * 24 * 60 * 60 * 1000);
        (userData as any).expiresAt = Math.floor(expiryDate.getTime() / 1000);
      }

      const newUser = await storage.createProxyUser(userData);
      await xrayManager.addUser(newUser.username, newUser.password || 'defaultpass');
      
      res.json({ ...newUser, password: undefined });
    } catch (error) {
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  // Get specific user by ID
  app.get('/api/external/users/:id', authenticateApiKey, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getProxyUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Update user by ID
  app.put('/api/external/users/:id', authenticateApiKey, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const updateData = req.body;
      
      // Handle validity days update
      if (updateData.validityDays && typeof updateData.validityDays === 'number') {
        const expiryDate = new Date(Date.now() + updateData.validityDays * 24 * 60 * 60 * 1000);
        updateData.expiresAt = Math.floor(expiryDate.getTime() / 1000);
      }
      
      const updatedUser = await storage.updateProxyUser(userId, updateData);
      res.json({ ...updatedUser, password: undefined });
    } catch (error) {
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  // Delete user by ID
  app.delete('/api/external/users/:id', authenticateApiKey, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getProxyUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      await storage.deleteProxyUser(userId);
      await xrayManager.removeUser(user.username);
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Get all packages
  app.get('/api/external/packages', authenticateApiKey, async (req, res) => {
    try {
      const packages = await storage.getAllPackages();
      res.json(packages);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch packages' });
    }
  });

  // Get available IPs
  app.get('/api/external/ip-pool', authenticateApiKey, async (req, res) => {
    try {
      const ips = await storage.getAvailableIps();
      res.json(ips);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch IP pool' });
    }
  });

  app.get('/api/external/stats', authenticateApiKey, async (req, res) => {
    try {
      const users = await storage.getAllProxyUsers();
      const activeUsers = await storage.getActiveProxyUsers();
      const connections = await storage.getConnections();
      
      res.json({
        totalUsers: users.length,
        activeUsers: activeUsers.length,
        totalConnections: connections.length,
        xrayRunning: xrayManager.isRunning(),
        systemInfo: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('📱 WebSocket client connected');
    
    ws.on('close', () => {
      console.log('📱 WebSocket client disconnected');
    });

    // Send initial status
    ws.send(JSON.stringify({
      type: 'status',
      data: {
        xrayRunning: xrayManager.isRunning(),
        timestamp: new Date().toISOString()
      }
    }));
  });

  // Broadcast function for real-time updates
  const broadcast = (message: any) => {
    wss.clients.forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify(message));
      }
    });
  };

  // Send periodic updates
  setInterval(async () => {
    const stats = await xrayManager.getStats();
    broadcast({
      type: 'stats',
      data: {
        xrayRunning: xrayManager.isRunning(),
        stats,
        timestamp: new Date().toISOString()
      }
    });
  }, 5000);

  return httpServer;
}