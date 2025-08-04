# SOCKS5 Proxy Admin Panel

## Overview

This project is a comprehensive full-stack SOCKS5 proxy management system with an admin interface, designed for enterprise use. It offers features such as user management, real-time monitoring, IP pool management (including IP sharing), detailed analytics, security controls, and system administration. The system aims to provide a robust and scalable solution for managing SOCKS5 proxies, enabling efficient user and resource allocation, and delivering insightful operational data.

## Recent Changes (August 2025)

**✅ CRITICAL AUTHENTICATION ISSUES RESOLVED**
- **Date**: August 3, 2025
- **Issue**: Frontend and backend used completely different authentication systems causing errors on all pages
- **Root Cause**: Frontend used simple password check (`admin123`) with localStorage, backend used JWT tokens
- **Solution**: Integrated frontend with backend JWT authentication system
- **Changes Made**:
  - Updated `client/src/hooks/useAuth.ts` to use backend JWT authentication
  - Fixed login page to require username and password (admin/admin123)  
  - Added authentication middleware to ALL protected API endpoints
  - Fixed TypeScript errors in query client header spreading
- **Status**: All admin panel CRUD operations now working correctly with proper authentication

**✅ VPS DEPLOYMENT PORT CONFLICT RESOLUTION**
- **Date**: August 3, 2025
- **Issue**: Recurring "EADDRINUSE: address already in use 0.0.0.0:5000" errors during VPS deployment
- **Root Cause**: Multiple processes competing for port 5000 and incorrect systemd service paths
- **Solution**: Created comprehensive deployment script with aggressive port clearing
- **Changes Made**:
  - Created `simple-deploy.sh` with multi-method port conflict resolution
  - Fixed systemd service ExecStart path to point to correct `/opt/socks5-admin/index.js`
  - Added aggressive process killing and port verification
  - Created deployment package with minimal runtime dependencies
- **Status**: Ready for reliable VPS deployment without port conflicts

**✅ PRODUCTION VPS INSTALLATION SYSTEM (3x-ui Inspired)**
- **Date**: August 4, 2025
- **Issue**: Need bare metal/VPS compatible system inspired by 3x-ui's proven methodology
- **Solution**: Built complete production system with aggressive port management and proper NAT routing
- **Changes Made**:
  - Created `vps-install.sh` inspired by 3x-ui's installation approach
  - Implemented production-ready Node.js SOCKS5 server with admin panel
  - Added comprehensive NAT routing test script (`test-comprehensive-nat.sh`)
  - Aggressive port cleanup using fuser and lsof (multi-method approach)
  - Self-contained application with minimal dependencies
  - Proper systemd service with automatic restart capabilities
- **Status**: Ready for production VPS deployment with zero external dependencies

**✅ XRAY-CORE BASED SOCKS5 SYSTEM (True 3x-ui Architecture)**
- **Date**: August 4, 2025
- **Discovery**: 3x-ui doesn't implement SOCKS5 directly - they use Xray-core for all proxy protocols
- **Solution**: Created `xray-based-install.sh` using actual Xray-core like 3x-ui does
- **Key Insights**:
  - 3x-ui is a management panel for Xray-core (not custom proxy implementation)
  - Xray-core handles SOCKS5, Vmess, Vless, Trojan protocols with enterprise reliability
  - All proxy logic handled by proven Xray binary, not custom code
- **Changes Made**:
  - Downloads and configures Xray-core binary (v24.9.30 latest stable)
  - Creates Xray JSON configuration for SOCKS5 with authentication
  - Node.js management interface with SQLite user database
  - Real-time config updates and Xray process management
  - Auto-restart and health monitoring like 3x-ui
- **Status**: Production-ready system using same core technology as 3x-ui

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components (Radix UI primitives)
- **Styling**: Tailwind CSS
- **Routing**: Wouter
- **State Management**: TanStack Query
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: SQLite with Drizzle ORM
- **Database Provider**: Better SQLite3 (Local file-based database)
- **Real-time Communication**: WebSocket server
- **Session Management**: JWT-based authentication
- **SOCKS5 Server**: Custom implementation
- **Security**: bcrypt password hashing, JWT tokens, rate limiting

### Data Storage
- **Primary Database**: SQLite (local file: `./database.sqlite`)
- **ORM**: Drizzle ORM
- **Schema Location**: `shared/schema.ts`
- **Tables**: users, connections, ip_pool, admins

### Key Features
- **Admin Dashboard**: Real-time statistics, live connection monitoring, system status, data transfer analytics, user activity.
- **User Management**: Create/edit/delete SOCKS5 users, username/password authentication, data quota, expiration dates, IP assignment, custom port assignment, user status.
- **IP Pool Management**: IPv4 and IPv6 address management, multiple users can share the same IP, automatic IP assignment, IP availability tracking, bulk import.
- **Real-time Analytics**: Connection patterns, data transfer monitoring, geographic user distribution, bandwidth utilization, historical data.
- **Advanced Security**: Rate limiting, geographic blocking, Fail2Ban integration, connection encryption (TLS 1.3), session management.
- **API Management System**: API key generation and management with usage analytics, external API endpoints, JWT token authentication, rate limiting.
- **User Portal System**: Dedicated user dashboard for proxy users, real-time usage monitoring, account information, secure login separate from admin panel.
- **Interactive Network Performance Dashboard**: Real-time bandwidth, connection quality analysis, latency/jitter, user traffic analysis, server health tracking.
- **System Administration**: Comprehensive settings panel, server configuration, security settings, advanced routing, DNS management, regional & timezone settings, database backup.
- **Monitoring & Logs**: Real-time system logs, connection activity, error tracking, performance metrics, security events.
- **SOCKS5 Proxy Server**: Full SOCKS5 protocol implementation, multi-user authentication, bandwidth monitoring per user, connection tracking, automatic quota enforcement.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connectivity (for deployment)
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: UI component primitives
- **react-hook-form**: Form handling and validation
- **zod**: Runtime type validation
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first styling
- **ESBuild**: Server-side bundling for production