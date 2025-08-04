import { db } from './db';
import { 
  admins, 
  packages,
  proxyUsers, 
  connections, 
  ipPool, 
  xrayConfigs, 
  settings,
  apiKeys,
  type Admin,
  type Package,
  type ProxyUser,
  type Connection,
  type IpPool,
  type XrayConfig,
  type Setting,
  type ApiKey,
  type InsertAdmin,
  type InsertPackage,
  type InsertProxyUser,
  type InsertConnection,
  type InsertIpPool,
  type InsertXrayConfig,
  type InsertSetting,
  type InsertApiKey
} from '../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export interface IStorage {
  // Admin operations
  getAdmin(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdmin(username: string, admin: Partial<InsertAdmin>): Promise<Admin>;
  deleteAdmin(username: string): Promise<boolean>;

  // Package operations
  getAllPackages(): Promise<Package[]>;
  getPackage(id: number): Promise<Package | undefined>;
  createPackage(packageData: InsertPackage): Promise<Package>;
  updatePackage(id: number, packageData: Partial<InsertPackage>): Promise<Package>;
  deletePackage(id: number): Promise<boolean>;

  // Proxy user operations
  getProxyUser(id: number): Promise<ProxyUser | undefined>;
  getProxyUserByUsername(username: string): Promise<ProxyUser | undefined>;
  getAllProxyUsers(): Promise<ProxyUser[]>;
  getActiveProxyUsers(): Promise<ProxyUser[]>;
  createProxyUser(user: InsertProxyUser): Promise<ProxyUser>;
  updateProxyUser(id: number, user: Partial<InsertProxyUser>): Promise<ProxyUser>;
  deleteProxyUser(id: number): Promise<boolean>;

  // Connection operations
  getConnections(userId?: number): Promise<Connection[]>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnection(id: number, connection: Partial<InsertConnection>): Promise<Connection>;
  closeConnection(id: number): Promise<boolean>;

  // IP pool operations
  getIpPool(): Promise<IpPool[]>;
  getAvailableIps(): Promise<IpPool[]>;
  createIp(ip: InsertIpPool): Promise<IpPool>;
  updateIp(id: number, ip: Partial<InsertIpPool>): Promise<IpPool>;
  deleteIp(id: number): Promise<boolean>;
  assignIpToUser(ipId: number, userId: number): Promise<boolean>;

  // Xray config operations
  getXrayConfig(name: string): Promise<XrayConfig | undefined>;
  getAllXrayConfigs(): Promise<XrayConfig[]>;
  saveXrayConfig(config: InsertXrayConfig): Promise<XrayConfig>;
  deleteXrayConfig(name: string): Promise<boolean>;

  // Settings operations
  getSetting(key: string): Promise<Setting | undefined>;
  getAllSettings(): Promise<Setting[]>;
  setSetting(setting: InsertSetting): Promise<Setting>;
  deleteSetting(key: string): Promise<boolean>;

  // API key operations
  getAllApiKeys(): Promise<ApiKey[]>;
  getApiKey(apiKey: string): Promise<ApiKey | undefined>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  updateApiKey(id: number, apiKey: Partial<InsertApiKey>): Promise<ApiKey>;
  deleteApiKey(id: number): Promise<boolean>;

  // Database maintenance
  cleanDatabase(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Admin operations
  async getAdmin(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async createAdmin(admin: InsertAdmin): Promise<Admin> {
    const hashedPassword = bcrypt.hashSync(admin.password, 10);
    const [newAdmin] = await db.insert(admins)
      .values({ 
        username: admin.username,
        password: hashedPassword,
        role: admin.role || 'admin'
      })
      .returning();
    return newAdmin;
  }

  async updateAdmin(username: string, adminData: Partial<InsertAdmin>): Promise<Admin> {
    const updateData: any = {};
    
    if (adminData.password) {
      updateData.password = bcrypt.hashSync(adminData.password, 10);
    }
    if (adminData.role) {
      updateData.role = adminData.role;
    }
    
    updateData.updatedAt = Math.floor(Date.now() / 1000);
    
    const [updatedAdmin] = await db.update(admins)
      .set(updateData)
      .where(eq(admins.username, username))
      .returning();
    return updatedAdmin;
  }

  async deleteAdmin(username: string): Promise<boolean> {
    const result = await db.delete(admins).where(eq(admins.username, username));
    return result.changes > 0;
  }

  // Proxy user operations
  async getProxyUser(id: number): Promise<ProxyUser | undefined> {
    const [user] = await db.select().from(proxyUsers).where(eq(proxyUsers.id, id));
    return user;
  }

  async getProxyUserByUsername(username: string): Promise<ProxyUser | undefined> {
    const [user] = await db.select().from(proxyUsers).where(eq(proxyUsers.username, username));
    return user;
  }

  async getAllProxyUsers(): Promise<ProxyUser[]> {
    return await db.select().from(proxyUsers).orderBy(desc(proxyUsers.createdAt));
  }

  async getActiveProxyUsers(): Promise<ProxyUser[]> {
    return await db.select().from(proxyUsers)
      .where(eq(proxyUsers.isActive, true))
      .orderBy(desc(proxyUsers.createdAt));
  }

  async createProxyUser(user: InsertProxyUser): Promise<ProxyUser> {
    const [newUser] = await db.insert(proxyUsers)
      .values(user)
      .returning();
    return newUser;
  }

  async updateProxyUser(id: number, userData: Partial<InsertProxyUser>): Promise<ProxyUser> {
    const updateData: any = {};
    
    if (userData.username) updateData.username = userData.username;
    if (userData.password) updateData.password = userData.password;  
    if (userData.packageId !== undefined) updateData.packageId = userData.packageId;
    if (userData.selectedIpId !== undefined) updateData.selectedIpId = userData.selectedIpId;
    if (userData.ipAddress) updateData.ipAddress = userData.ipAddress;
    if (userData.port) updateData.port = userData.port;
    if (userData.dataLimit !== undefined) updateData.dataLimit = userData.dataLimit;
    if (userData.validityDays !== undefined) updateData.validityDays = userData.validityDays;
    if (userData.isActive !== undefined) updateData.isActive = userData.isActive;
    if (userData.expiresAt !== undefined) updateData.expiresAt = userData.expiresAt;
    
    updateData.updatedAt = Math.floor(Date.now() / 1000);
    
    const [updatedUser] = await db.update(proxyUsers)
      .set(updateData)
      .where(eq(proxyUsers.id, id))
      .returning();
    return updatedUser;
  }

  async deleteProxyUser(id: number): Promise<boolean> {
    const result = await db.delete(proxyUsers).where(eq(proxyUsers.id, id));
    return result.changes > 0;
  }

  // Connection operations
  async getConnections(userId?: number): Promise<Connection[]> {
    if (userId) {
      return await db.select().from(connections)
        .where(eq(connections.userId, userId))
        .orderBy(desc(connections.connectedAt));
    }
    return await db.select().from(connections).orderBy(desc(connections.connectedAt));
  }

  async createConnection(connection: InsertConnection): Promise<Connection> {
    const [newConnection] = await db.insert(connections)
      .values({
        userId: connection.userId,
        clientIp: connection.clientIp,
        targetHost: connection.targetHost,
        targetPort: connection.targetPort,
        bytesUp: connection.bytesUp || 0,
        bytesDown: connection.bytesDown || 0
      })
      .returning();
    return newConnection;
  }

  async updateConnection(id: number, connectionData: Partial<InsertConnection>): Promise<Connection> {
    const updateData: any = {};
    
    if (connectionData.targetHost) updateData.targetHost = connectionData.targetHost;
    if (connectionData.targetPort) updateData.targetPort = connectionData.targetPort;
    if (connectionData.bytesUp !== undefined) updateData.bytesUp = connectionData.bytesUp;
    if (connectionData.bytesDown !== undefined) updateData.bytesDown = connectionData.bytesDown;
    
    const [updatedConnection] = await db.update(connections)
      .set(updateData)
      .where(eq(connections.id, id))
      .returning();
    return updatedConnection;
  }

  async closeConnection(id: number): Promise<boolean> {
    const result = await db.update(connections)
      .set({ 
        disconnectedAt: Math.floor(Date.now() / 1000)
      })
      .where(eq(connections.id, id));
    return result.changes > 0;
  }

  // IP pool operations
  async getIpPool(): Promise<IpPool[]> {
    return await db.select().from(ipPool).orderBy(desc(ipPool.createdAt));
  }

  async getAvailableIps(): Promise<IpPool[]> {
    return await db.select().from(ipPool)
      .where(and(
        eq(ipPool.isActive, true)
      ));
  }

  async createIp(ip: InsertIpPool): Promise<IpPool> {
    const [newIp] = await db.insert(ipPool)
      .values(ip)
      .returning();
    return newIp;
  }

  async updateIp(id: number, ip: Partial<InsertIpPool>): Promise<IpPool> {
    const [updatedIp] = await db.update(ipPool)
      .set(ip)
      .where(eq(ipPool.id, id))
      .returning();
    return updatedIp;
  }

  async deleteIp(id: number): Promise<boolean> {
    const result = await db.delete(ipPool).where(eq(ipPool.id, id));
    return result.changes > 0;
  }

  async assignIpToUser(ipId: number, userId: number): Promise<boolean> {
    const result = await db.update(ipPool)
      .set({ assignedUserId: userId })
      .where(eq(ipPool.id, ipId));
    return result.changes > 0;
  }

  // Xray config operations
  async getXrayConfig(name: string): Promise<XrayConfig | undefined> {
    const [config] = await db.select().from(xrayConfigs).where(eq(xrayConfigs.configName, name));
    return config;
  }

  async getAllXrayConfigs(): Promise<XrayConfig[]> {
    return await db.select().from(xrayConfigs).orderBy(desc(xrayConfigs.updatedAt));
  }

  async saveXrayConfig(config: InsertXrayConfig): Promise<XrayConfig> {
    const [savedConfig] = await db.insert(xrayConfigs)
      .values({
        configName: config.configName,
        configData: config.configData,
        isActive: config.isActive || false
      })
      .onConflictDoUpdate({
        target: xrayConfigs.configName,
        set: {
          configData: config.configData,
          updatedAt: Math.floor(Date.now() / 1000)
        }
      })
      .returning();
    return savedConfig;
  }

  async deleteXrayConfig(name: string): Promise<boolean> {
    const result = await db.delete(xrayConfigs).where(eq(xrayConfigs.configName, name));
    return result.changes > 0;
  }

  // Package operations
  async getAllPackages(): Promise<Package[]> {
    return await db.select().from(packages).orderBy(desc(packages.createdAt));
  }

  async getPackage(id: number): Promise<Package | undefined> {
    const [package_] = await db.select().from(packages).where(eq(packages.id, id));
    return package_;
  }

  async createPackage(packageData: InsertPackage): Promise<Package> {
    const [newPackage] = await db.insert(packages)
      .values({
        name: packageData.name,
        description: packageData.description,
        dataLimit: packageData.dataLimit,
        validityDays: packageData.validityDays,
        price: packageData.price || 0,
        maxConnections: packageData.maxConnections || 1,
        allowedIpCount: packageData.allowedIpCount || 1,
        isActive: packageData.isActive !== false
      })
      .returning();
    return newPackage;
  }

  async updatePackage(id: number, packageData: Partial<InsertPackage>): Promise<Package> {
    const [updatedPackage] = await db.update(packages)
      .set({ ...packageData, updatedAt: new Date() })
      .where(eq(packages.id, id))
      .returning();
    return updatedPackage;
  }

  async deletePackage(id: number): Promise<boolean> {
    const result = await db.delete(packages).where(eq(packages.id, id));
    return result.changes > 0;
  }

  // Settings operations
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async getAllSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async setSetting(setting: InsertSetting): Promise<Setting> {
    const [savedSetting] = await db.insert(settings)
      .values(setting)
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value: setting.value,
          description: setting.description,
          updatedAt: new Date()
        }
      })
      .returning();
    return savedSetting;
  }

  async deleteSetting(key: string): Promise<boolean> {
    const result = await db.delete(settings).where(eq(settings.key, key));
    return result.changes > 0;
  }

  // API key operations
  async getAllApiKeys(): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));
  }

  async getApiKey(apiKey: string): Promise<ApiKey | undefined> {
    const [key] = await db.select().from(apiKeys).where(eq(apiKeys.apiKey, apiKey));
    return key;
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [newApiKey] = await db.insert(apiKeys)
      .values(apiKey)
      .returning();
    return newApiKey;
  }

  async updateApiKey(id: number, apiKey: Partial<InsertApiKey>): Promise<ApiKey> {
    const [updatedApiKey] = await db.update(apiKeys)
      .set(apiKey)
      .where(eq(apiKeys.id, id))
      .returning();
    return updatedApiKey;
  }

  async deleteApiKey(id: number): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, id));
    return result.changes > 0;
  }

  // Database maintenance - Clean all data except admin credentials
  async cleanDatabase(): Promise<void> {
    console.log('🧹 Starting database cleanup (preserving admin credentials)...');
    
    try {
      // Delete all user data in proper order to handle foreign key constraints
      await db.delete(connections);
      console.log('✅ Cleared connections table');
      
      await db.delete(proxyUsers);
      console.log('✅ Cleared proxy users table');
      
      await db.delete(packages);
      console.log('✅ Cleared packages table');
      
      await db.delete(ipPool);
      console.log('✅ Cleared IP pool table');
      
      await db.delete(xrayConfigs);
      console.log('✅ Cleared Xray configs table');
      
      await db.delete(apiKeys);
      console.log('✅ Cleared API keys table');
      
      // Clear non-essential settings (keep core system settings)
      await db.delete(settings).where(
        and(
          // Don't delete core system settings
          eq(settings.key, 'user_cleanup_date')
        )
      );
      console.log('✅ Cleared user-specific settings');
      
      console.log('🎉 Database cleanup completed successfully!');
      console.log('🔐 Admin credentials preserved');
    } catch (error) {
      console.error('❌ Database cleanup failed:', error);
      throw new Error('Failed to clean database: ' + (error as Error).message);
    }
  }
}

export const storage = new DatabaseStorage();