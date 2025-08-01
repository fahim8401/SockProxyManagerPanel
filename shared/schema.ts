import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  real,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  ipAddress: text("ip_address").notNull(),
  port: integer("port").notNull(),
  dataLimit: integer("data_limit").notNull(), // in bytes
  dataUsed: integer("data_used").default(0),
  daysValid: integer("days_valid").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  expiresAt: integer("expires_at").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  lastConnection: integer("last_connection", { mode: "timestamp" }),
  packageId: text("package_id").references(() => packages.id),
});

// Connections table
export const connections = sqliteTable("connections", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  userId: text("user_id").references(() => users.id).notNull(),
  ipAddress: text("ip_address").notNull(),
  startTime: integer("start_time", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  endTime: integer("end_time", { mode: "timestamp" }),
  bytesTransferred: integer("bytes_transferred").default(0),
});

// IP Pool table
export const ipPool = sqliteTable("ip_pool", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  ipAddress: text("ip_address").notNull().unique(),
  ipType: text("ip_type").notNull(), // 'IPv4' or 'IPv6'
  isAvailable: integer("is_available", { mode: "boolean" }).default(true),
  assignedUserId: text("assigned_user_id").references(() => users.id),
});

// Admin management table
export const admins = sqliteTable("admins", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  username: text("username").unique().notNull(),
  email: text("email").unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("admin"), // super_admin, admin, moderator, viewer
  permissions: text("permissions").default("{}"), // JSON string for permissions
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  lastLogin: integer("last_login", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("created_by"), // ID of admin who created this account
});

// Product Packages table
export const packages = sqliteTable("packages", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  name: text("name").notNull(),
  description: text("description"),
  dataLimitGB: integer("data_limit_gb").notNull(),
  timeLimit: integer("time_limit").notNull(), // in days
  maxConnections: integer("max_connections").default(1),
  allowedIPs: text("allowed_ips"), // comma-separated
  price: real("price"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
});

// API Keys table
export const apiKeys = sqliteTable("api_keys", {
  id: text("id").primaryKey().default(sql`(hex(randomblob(16)))`),
  name: text("name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  usageCount: integer("usage_count").default(0),
  lastUsed: integer("last_used", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`CURRENT_TIMESTAMP`),
  createdBy: text("created_by").notNull(),
});

// Schema validation
export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    createdAt: true,
    dataUsed: true,
    lastConnection: true,
  })
  .extend({
    confirmPassword: z.string().optional(),
    packageId: z.string().optional(),
    expiresAt: z.number(),
  })
  .refine((data) => !data.confirmPassword || data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const insertConnectionSchema = createInsertSchema(connections).omit({
  id: true,
  startTime: true,
});

export const insertIpPoolSchema = createInsertSchema(ipPool).omit({
  id: true,
});

export const insertAdminSchema = createInsertSchema(admins)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastLogin: true,
  })
  .extend({
    confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const insertPackageSchema = createInsertSchema(packages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  keyHash: true,
  usageCount: true,
  lastUsed: true,
  createdAt: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Connection = typeof connections.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type IpPool = typeof ipPool.$inferSelect;
export type InsertIpPool = z.infer<typeof insertIpPoolSchema>;
export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Package = typeof packages.$inferSelect;
export type InsertPackage = z.infer<typeof insertPackageSchema>;
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;