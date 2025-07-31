import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  bigint,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  ipAddress: text("ip_address").notNull(),
  port: integer("port").notNull(),
  dataLimit: bigint("data_limit", { mode: "number" }).notNull(), // in bytes
  dataUsed: bigint("data_used", { mode: "number" }).default(0),
  daysValid: integer("days_valid").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),
  lastConnection: timestamp("last_connection"),
});

export const connections = pgTable("connections", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  ipAddress: text("ip_address").notNull(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  bytesTransferred: bigint("bytes_transferred", { mode: "number" }).default(0),
});

export const ipPool = pgTable("ip_pool", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ipAddress: text("ip_address").notNull().unique(),
  ipType: text("ip_type").notNull(), // 'IPv4' or 'IPv6'
  isAvailable: boolean("is_available").default(true),
  assignedUserId: varchar("assigned_user_id").references(() => users.id),
});

export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    createdAt: true,
    dataUsed: true,
    lastConnection: true,
  })
  .extend({
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
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

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Connection = typeof connections.$inferSelect;
export type IpPool = typeof ipPool.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type InsertIpPool = z.infer<typeof insertIpPoolSchema>;

// Admin management table
export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  email: varchar("email").unique(),
  password: varchar("password").notNull(),
  role: varchar("role").notNull().default("admin"), // super_admin, admin, moderator, viewer
  permissions: jsonb("permissions").default(sql`'{}'`), // Custom permissions object
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by"), // ID of admin who created this account
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

export type Admin = typeof admins.$inferSelect;
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
