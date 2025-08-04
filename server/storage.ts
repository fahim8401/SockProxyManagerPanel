import { db } from './db';
import { 
  admins, 
  proxyUsers, 
  connections, 
  ipPool, 
  xrayConfigs, 
  settings,
  type Admin,
  type ProxyUser,
  type Connection,
  type IpPool,
  type XrayConfig,
  type Setting,
  type InsertAdmin,
  type InsertProxyUser,
  type InsertConnection,
  type InsertIpPool,
  type InsertXrayConfig,
  type InsertSetting
} from '../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export interface IStorage {
  // Admin operations
  getAdmin(username: string): Promise<Admin | undefined>;
  createAdmin(admin: InsertAdmin): Promise<Admin>;
  updateAdmin(username: string, admin: Partial<InsertAdmin>): Promise<Admin>;
  deleteAdmin(username: string): Promise<boolean>;

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
      .values({ ...admin, password: hashedPassword })
      .returning();
    return newAdmin;
  }

  async updateAdmin(username: string, admin: Partial<InsertAdmin>): Promise<Admin> {
    const updateData = { ...admin };
    if (updateData.password) {
      updateData.password = bcrypt.hashSync(updateData.password, 10);
    }
    
    const [updatedAdmin] = await db.update(admins)
      .set({ ...updateData, updatedAt: new Date() })
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

  async updateProxyUser(id: number, user: Partial<InsertProxyUser>): Promise<ProxyUser> {
    const [updatedUser] = await db.update(proxyUsers)
      .set({ ...user, updatedAt: new Date() })
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
      .values(connection)
      .returning();
    return newConnection;
  }

  async updateConnection(id: number, connection: Partial<InsertConnection>): Promise<Connection> {
    const [updatedConnection] = await db.update(connections)
      .set(connection)
      .where(eq(connections.id, id))
      .returning();
    return updatedConnection;
  }

  async closeConnection(id: number): Promise<boolean> {
    const result = await db.update(connections)
      .set({ 
        isActive: false, 
        disconnectedAt: new Date() 
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
        eq(ipPool.isActive, true),
        eq(ipPool.assignedUserId, undefined)
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
      .values(config)
      .onConflictDoUpdate({
        target: xrayConfigs.configName,
        set: {
          configData: config.configData,
          isActive: config.isActive,
          updatedAt: new Date()
        }
      })
      .returning();
    return savedConfig;
  }

  async deleteXrayConfig(name: string): Promise<boolean> {
    const result = await db.delete(xrayConfigs).where(eq(xrayConfigs.configName, name));
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
}

export const storage = new DatabaseStorage();