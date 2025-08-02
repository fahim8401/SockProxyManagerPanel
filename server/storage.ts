import { 
  type User, type InsertUser, type Connection, type InsertConnection, 
  type IpPool, type InsertIpPool, type Admin, type InsertAdmin,
  type Package, type InsertPackage, type ApiKey, type InsertApiKey,
  users, connections, ipPool, admins, packages, apiKeys, settings 
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: Omit<InsertUser, 'confirmPassword'>): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  
  // Connection management
  createConnection(connection: InsertConnection): Promise<Connection>;
  getActiveConnections(): Promise<Connection[]>;
  getUserConnections(userId: string): Promise<Connection[]>;
  endConnection(id: string, bytesTransferred: number): Promise<void>;
  
  // IP Pool management (shared IPs, no restrictions)
  getAvailableIPs(): Promise<IpPool[]>;
  getAllIPs(): Promise<IpPool[]>;
  addIP(ip: InsertIpPool): Promise<IpPool>;
  // Removed assignIP and releaseIP - IPs can be shared by multiple users
  
  // Statistics
  getTotalUsers(): Promise<number>;
  getActiveConnectionsCount(): Promise<number>;
  getTotalDataTransferred(): Promise<number>;
  getAvailableIPsCount(): Promise<number>;
  
  // User portal specific methods
  getUserAssignedIP(userId: string): Promise<string | null>;
  
  // Admin management
  getAdmin(id: string): Promise<Admin | undefined>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAllAdmins(): Promise<Admin[]>;
  createAdmin(admin: Omit<InsertAdmin, 'confirmPassword'>, createdBy: string): Promise<Admin>;
  updateAdmin(id: string, updates: Partial<Admin>): Promise<Admin | undefined>;
  deleteAdmin(id: string): Promise<boolean>;
  updateAdminLastLogin(id: string): Promise<void>;
  
  // API Key management
  getAllApiKeys(): Promise<ApiKey[]>;
  createApiKey(name: string, createdBy: string): Promise<{ id: string; name: string; key: string }>;
  deleteApiKey(id: string): Promise<boolean>;
  updateApiKeyUsage(keyHash: string): Promise<void>;
  
  // Package management
  getAllPackages(): Promise<Package[]>;
  getPackage(id: string): Promise<Package | undefined>;
  createPackage(pkg: InsertPackage): Promise<Package>;
  updatePackage(id: string, updates: Partial<Package>): Promise<Package | undefined>;
  deletePackage(id: string): Promise<boolean>;
  createUserFromPackage(packageId: string, username: string, password: string, ipAddress: string, port: number): Promise<User>;
  
  // Online status management
  updateUserOnlineStatus?(userId: string, isOnline: boolean): Promise<void>;
  getOnlineUsers?(): Promise<User[]>;
  
  // Settings management
  saveSettings(settingsData: any): Promise<void>;
  getSettings(category?: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize with default IP addresses if none exist
    this.initializeDefaultIPs();
  }

  private async initializeDefaultIPs(): Promise<void> {
    try {
      const existingIPs = await db.select().from(ipPool).limit(1);
      if (existingIPs.length === 0) {
        const defaultIPs = [
          { ipAddress: "103.7.4.182", ipType: "IPv4" as const, isAvailable: true, isPublic: true },
          { ipAddress: "103.7.4.183", ipType: "IPv4" as const, isAvailable: true, isPublic: true },
          { ipAddress: "103.7.4.184", ipType: "IPv4" as const, isAvailable: true, isPublic: true },
          { ipAddress: "103.7.4.185", ipType: "IPv4" as const, isAvailable: true, isPublic: true },
          { ipAddress: "2001:db8::1", ipType: "IPv6" as const, isAvailable: true, isPublic: false },
          { ipAddress: "2001:db8::2", ipType: "IPv6" as const, isAvailable: true, isPublic: false },
        ];

        for (const ip of defaultIPs) {
          await db.insert(ipPool).values({
            id: randomUUID(),
            ...ip
          }).onConflictDoNothing();
        }
      }
    } catch (error) {
      console.error('Error initializing default IPs:', error);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async createUser(insertUser: Omit<InsertUser, 'confirmPassword'>): Promise<User> {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    
    // Calculate expiration date from daysValid if expiresAt not provided
    let expiresAt = insertUser.expiresAt;
    if (!expiresAt && insertUser.daysValid) {
      expiresAt = now + (insertUser.daysValid * 24 * 60 * 60); // Convert days to seconds
    } else if (!expiresAt) {
      // Default to 30 days if neither provided
      expiresAt = now + (30 * 24 * 60 * 60);
    }
    
    // Auto-assign IP from pool if not provided
    let assignedIP = insertUser.ipAddress;
    let outboundIP = insertUser.outboundIp;
    
    if (!assignedIP) {
      const availableIPs = await this.getAllIPs();
      if (availableIPs.length > 0) {
        // Use round-robin or random assignment - IPs can be shared
        const randomIP = availableIPs[Math.floor(Math.random() * availableIPs.length)];
        assignedIP = randomIP.ipAddress;
        outboundIP = randomIP.ipAddress;
      }
    }
    
    // Auto-assign port if not provided
    let port = insertUser.port;
    if (!port) {
      // Find an available port starting from 1081
      const existingUsers = await this.getAllUsers();
      const usedPorts = new Set(existingUsers.map(u => u.port));
      port = 1081;
      while (usedPorts.has(port)) {
        port++;
      }
    }
    
    const [user] = await db.insert(users).values({
      ...insertUser,
      id,
      ipAddress: assignedIP,
      outboundIp: outboundIP || assignedIP,
      port,
      expiresAt,
      daysValid: insertUser.daysValid || 30,
      createdAt: now,
      dataUsed: 0,
      isActive: true,
      lastConnection: null,
      email: insertUser.email || null,
    }).returning();
    
    console.log(`✅ Created user ${user.username} with shared IP: ${user.ipAddress}`);
    
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    
    return user || undefined;
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      // Get user first to verify existence
      const user = await this.getUser(id);
      if (!user) {
        return false;
      }
      
      // Delete user connections first (foreign key constraint)
      await db.delete(connections).where(eq(connections.userId, id));
      
      // Delete the user
      const result = await db.delete(users).where(eq(users.id, id));
      
      if (result.changes > 0) {
        console.log(`✅ Deleted user ${user.username}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }

  async createConnection(connection: InsertConnection): Promise<Connection> {
    const id = randomUUID();
    const now = Math.floor(Date.now() / 1000);
    const [conn] = await db.insert(connections).values({
      ...connection,
      id,
      startTime: now,
      endTime: null,
      bytesTransferred: 0,
    }).returning();
    
    // Update user's last connection
    await db.update(users)
      .set({ lastConnection: now })
      .where(eq(users.id, connection.userId));
    
    return conn;
  }

  async getActiveConnections(): Promise<Connection[]> {
    return await db.select().from(connections).where(isNull(connections.endTime));
  }

  async getTotalConnectionsCount(): Promise<number> {
    const result = await db.select().from(connections);
    return result.length;
  }

  async getUserConnections(userId: string): Promise<Connection[]> {
    return await db.select().from(connections).where(eq(connections.userId, userId));
  }

  async endConnection(id: string, bytesTransferred: number): Promise<void> {
    const [connection] = await db.update(connections)
      .set({ 
        endTime: Math.floor(Date.now() / 1000), 
        bytesTransferred 
      })
      .where(eq(connections.id, id))
      .returning();
    
    if (connection) {
      // Update user's data usage
      const [user] = await db.select().from(users).where(eq(users.id, connection.userId));
      if (user) {
        await db.update(users)
          .set({ dataUsed: (user.dataUsed || 0) + bytesTransferred })
          .where(eq(users.id, connection.userId));
      }
    }
  }

  async getAvailableIPs(): Promise<IpPool[]> {
    // All IPs are always available since multiple users can share them
    return await db.select().from(ipPool).where(eq(ipPool.isAvailable, true));
  }

  async getAllIPs(): Promise<IpPool[]> {
    return await db.select().from(ipPool);
  }

  async addIP(ip: InsertIpPool): Promise<IpPool> {
    const [newIP] = await db.insert(ipPool).values({
      ...ip,
      id: randomUUID(),
      isAvailable: ip.isAvailable ?? true
    }).returning();
    
    return newIP;
  }

  // IP sharing methods removed - multiple users can use the same IP automatically

  async getIPUsageCount(ipAddress: string): Promise<number> {
    const result = await db.select().from(users).where(eq(users.ipAddress, ipAddress));
    return result.length;
  }



  async updateIPAvailability(ipId: string, isAvailable: boolean): Promise<void> {
    // IPs are always available for sharing between multiple users
    await db.update(ipPool)
      .set({ isAvailable })
      .where(eq(ipPool.id, ipId));
  }

  async getTotalUsers(): Promise<number> {
    const result = await db.select().from(users);
    return result.length;
  }

  async getActiveConnectionsCount(): Promise<number> {
    const result = await db.select().from(connections).where(isNull(connections.endTime));
    return result.length;
  }

  async getTotalDataTransferred(): Promise<number> {
    const result = await db.select().from(connections);
    return result.reduce((total, conn) => total + (conn.bytesTransferred || 0), 0);
  }

  async getAvailableIPsCount(): Promise<number> {
    const result = await db.select().from(ipPool).where(eq(ipPool.isAvailable, true));
    return result.length;
  }

  async getUserAssignedIP(userId: string): Promise<string | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user ? user.ipAddress : null;
  }

  // Admin management methods
  async getAdmin(id: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async getAllAdmins(): Promise<Admin[]> {
    return await db.select().from(admins);
  }

  async createAdmin(admin: Omit<InsertAdmin, 'confirmPassword'>, createdBy: string): Promise<Admin> {
    const [newAdmin] = await db.insert(admins).values({
      ...admin,
      id: randomUUID(),
      createdBy,
      createdAt: Math.floor(Date.now() / 1000),
      updatedAt: Math.floor(Date.now() / 1000),
    }).returning();
    
    return newAdmin;
  }

  async updateAdmin(id: string, updates: Partial<Admin>): Promise<Admin | undefined> {
    const [updatedAdmin] = await db.update(admins)
      .set({ ...updates, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(admins.id, id))
      .returning();
    
    return updatedAdmin;
  }

  async deleteAdmin(id: string): Promise<boolean> {
    const result = await db.delete(admins).where(eq(admins.id, id));
    return result.changes > 0;
  }

  async deleteIP(id: string): Promise<boolean> {
    try {
      const result = await db.delete(ipPool).where(eq(ipPool.id, id));
      return result.changes > 0;
    } catch (error) {
      console.error("Error deleting IP:", error);
      return false;
    }
  }

  async updateAdminLastLogin(id: string): Promise<void> {
    await db.update(admins)
      .set({ lastLogin: Math.floor(Date.now() / 1000) })
      .where(eq(admins.id, id));
  }

  // API Key management methods
  async getAllApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys);
  }

  async createApiKey(name: string, createdBy: string = "system"): Promise<{ id: string; name: string; key: string }> {
    const keyId = randomUUID();
    const apiKey = `sk-${keyId.replace(/-/g, '')}`;
    
    // Hash the API key for storage
    const keyHash = await bcrypt.hash(apiKey, 10);
    
    const [newKey] = await db.insert(apiKeys).values({
      id: keyId,
      name,
      keyHash,
      isActive: true,
      usageCount: 0,
      createdBy
    }).returning();

    return {
      id: newKey.id,
      name: newKey.name,
      key: apiKey
    };
  }

  async deleteApiKey(id: string): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return result.changes > 0;
  }

  async updateApiKeyUsage(keyHash: string): Promise<void> {
    await db.update(apiKeys)
      .set({ 
        usageCount: sql`${apiKeys.usageCount} + 1`,
        lastUsed: Math.floor(Date.now() / 1000)
      })
      .where(eq(apiKeys.keyHash, keyHash));
  }

  // Package management methods
  async getAllPackages(): Promise<Package[]> {
    try {
      return await db.select().from(packages);
    } catch (error) {
      console.error("Error getting packages:", error);
      return [];
    }
  }

  async getPackage(id: string): Promise<Package | undefined> {
    try {
      const [pkg] = await db.select().from(packages).where(eq(packages.id, id));
      return pkg;
    } catch (error) {
      console.error("Error getting package:", error);
      return undefined;
    }
  }

  async createPackage(pkg: InsertPackage): Promise<Package> {
    const [newPackage] = await db.insert(packages).values({
      ...pkg,
      id: randomUUID(),
    }).returning();
    return newPackage;
  }

  async updatePackage(id: string, updates: Partial<Package>): Promise<Package | undefined> {
    try {
      const [updated] = await db.update(packages)
        .set({
          ...updates,
          updatedAt: Math.floor(Date.now() / 1000)
        })
        .where(eq(packages.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating package:", error);
      return undefined;
    }
  }

  async deletePackage(id: string): Promise<boolean> {
    try {
      await db.delete(packages).where(eq(packages.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting package:", error);
      return false;
    }
  }

  async createUserFromPackage(packageId: string, username: string, password: string, ipAddress: string, port: number, outboundIp?: string): Promise<User> {
    const pkg = await this.getPackage(packageId);
    if (!pkg) {
      throw new Error("Package not found");
    }

    // Calculate expiration date based on package time limit
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (pkg.timeLimit * 24 * 60 * 60); // Convert days to seconds

    const userData: Omit<InsertUser, 'confirmPassword'> = {
      username,
      password,
      ipAddress,
      outboundIp,
      port,
      dataLimit: pkg.dataLimitGB * 1024 * 1024 * 1024, // Convert GB to bytes
      daysValid: pkg.timeLimit,
      expiresAt,
      packageId: packageId,
    };

    return await this.createUser(userData);
  }

  // In-memory online status tracking
  private onlineUsers: Set<string> = new Set();

  async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      if (isOnline) {
        this.onlineUsers.add(userId);
      } else {
        this.onlineUsers.delete(userId);
      }
      
      // Update last connection time if user comes online
      if (isOnline) {
        await db.update(users)
          .set({ 
            lastConnection: Math.floor(Date.now() / 1000)
          })
          .where(eq(users.id, userId));
      }
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  }

  async getOnlineUsers(): Promise<User[]> {
    try {
      if (this.onlineUsers.size === 0) return [];
      
      const onlineUserIds = Array.from(this.onlineUsers);
      const onlineUserData = await Promise.all(
        onlineUserIds.map(userId => this.getUser(userId))
      );
      return onlineUserData.filter(Boolean) as User[];
    } catch (error) {
      console.error('Error getting online users:', error);
      return [];
    }
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.onlineUsers);
  }

  // Enhanced getAllUsers to include online status from memory  
  async getAllUsersWithOnlineStatus(): Promise<User[]> {
    try {
      const allUsers = await db.select().from(users);
      // Add online status from in-memory tracking
      return allUsers.map(user => ({
        ...user,
        isOnline: this.onlineUsers.has(user.id)
      })) as (User & { isOnline: boolean })[];
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }

  // Get public IPs for routing
  async getPublicIPs(): Promise<Array<{ id: string; ipAddress: string; isAvailable: boolean; assignedUserId?: string }>> {
    try {
      const publicIPs = await db.select().from(ipPool).where(eq(ipPool.isPublic, true));
      return publicIPs.map(ip => ({
        id: ip.id,
        ipAddress: ip.ipAddress,
        isAvailable: ip.isAvailable || true
        // Removed assignedUserId - IPs can be shared
      }));
    } catch (error) {
      console.error('Error fetching public IPs:', error);
      return [];
    }
  }

  // Settings management
  async saveSettings(settingsData: any): Promise<void> {
    try {
      console.log('Saving settings data:', settingsData);
      
      // Save each category of settings
      for (const [category, data] of Object.entries(settingsData)) {
        for (const [key, value] of Object.entries(data as any)) {
          await db.insert(settings)
            .values({
              category,
              key,
              value: JSON.stringify(value)
            })
            .onConflictDoUpdate({
              target: [settings.category, settings.key],
              set: {
                value: JSON.stringify(value),
                updatedAt: Math.floor(Date.now() / 1000)
              }
            });
        }
      }
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  async getSettings(category?: string): Promise<any> {
    try {
      const results = category 
        ? await db.select().from(settings).where(eq(settings.category, category))
        : await db.select().from(settings);
      const settingsObject: any = {};
      
      for (const setting of results) {
        if (!settingsObject[setting.category]) {
          settingsObject[setting.category] = {};
        }
        try {
          settingsObject[setting.category][setting.key] = JSON.parse(setting.value);
        } catch {
          settingsObject[setting.category][setting.key] = setting.value;
        }
      }
      
      return settingsObject;
    } catch (error) {
      console.error('Error getting settings:', error);
      return {};
    }
  }


}

export const storage = new DatabaseStorage();