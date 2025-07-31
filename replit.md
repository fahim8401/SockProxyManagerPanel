# SOCKS5 Proxy Admin Panel

## Overview

This is a comprehensive full-stack SOCKS5 proxy management system with complete admin interface. It provides enterprise-level features including user management, real-time monitoring, IP pool management, detailed analytics, security controls, and system administration. The application features a modern React frontend with shadcn/ui components and a robust Express.js backend with PostgreSQL database integration.

## Complete Feature Set

### ✅ Admin Dashboard
- Real-time statistics and KPIs
- Live connection monitoring via WebSocket
- System status indicators
- Data transfer analytics
- User activity overview
- Interactive charts and graphs

### ✅ User Management
- Create/edit/delete SOCKS5 users
- Username/password authentication
- Data quota management (GB limits)
- Expiration date controls
- IP address assignment from pool
- Custom port assignment
- User status management (active/inactive)
- Detailed user profiles with activity history

### ✅ IP Pool Management
- IPv4 and IPv6 address management
- Automatic IP assignment to users
- IP availability tracking
- Geographic distribution support
- Bulk IP import capabilities
- IP usage statistics

### ✅ Real-time Analytics
- Connection patterns and trends
- Data transfer monitoring
- Geographic user distribution
- Protocol usage statistics
- Peak usage analysis
- Bandwidth utilization charts
- Historical data analysis

### ✅ Advanced Security
- Rate limiting protection
- Geographic blocking capabilities
- Fail2Ban integration
- Authentication security monitoring
- Connection encryption (TLS 1.3)
- Failed login attempt tracking
- Session management

### ✅ System Administration
- Comprehensive settings panel
- Server configuration management
- Database backup automation
- Log management and rotation
- Performance monitoring
- Security configuration
- Notification system setup

### ✅ Monitoring & Logs
- Real-time system logs
- Connection activity logs
- Error tracking and reporting
- Performance metrics
- Security event logging
- Exportable log data
- Log filtering and search

### ✅ SOCKS5 Proxy Server
- Full SOCKS5 protocol implementation
- Multi-user authentication
- Bandwidth monitoring per user
- Connection tracking and limits
- Automatic quota enforcement
- Real-time connection management

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components (Radix UI primitives)
- **Styling**: Tailwind CSS with CSS variables for theming
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM ✅ **CONNECTED**
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Real-time Communication**: WebSocket server for live updates
- **Session Management**: In-memory sessions with potential PostgreSQL upgrade
- **SOCKS5 Server**: Custom implementation for proxy functionality

### Data Storage ✅ **ACTIVE DATABASE**
- **Primary Database**: PostgreSQL via Neon serverless (Connected)
- **ORM**: Drizzle ORM with schema-first approach
- **Schema Location**: `shared/schema.ts` for type-safe database operations
- **Tables Created**: users, connections, ip_pool (6 default IPs initialized)
- **Storage Implementation**: DatabaseStorage class replacing MemStorage
- **Database Operations**: Full CRUD operations with foreign key relationships

## Key Components

### Database Schema
- **Users Table**: Stores user credentials, IP assignments, data limits, and expiration dates
- **Connections Table**: Tracks active and historical proxy connections
- **IP Pool Table**: Manages available IPv4/IPv6 addresses for assignment

### API Endpoints
- `GET /api/stats` - System statistics (users, connections, data transfer)
- `GET /api/users` - User management endpoints
- `POST /api/users` - Create new users with validation
- WebSocket `/ws` - Real-time updates for dashboard

### Frontend Components
- **Dashboard**: Main overview with stats cards, real-time charts, and system status
- **User Management**: CRUD operations for proxy users
- **Real-time Monitoring**: Live connection tracking and data visualization
- **System Status**: Service health monitoring

### SOCKS5 Proxy Server
- Custom SOCKS5 implementation in `server/services/socksProxy.ts`
- User authentication against database
- Connection tracking and bandwidth monitoring
- IP assignment from managed pool

## Data Flow

1. **User Authentication**: SOCKS5 clients authenticate against user database
2. **IP Assignment**: Users receive IP addresses from the managed pool
3. **Connection Tracking**: All proxy connections are logged with bandwidth usage
4. **Real-time Updates**: WebSocket pushes live stats to admin dashboard
5. **Data Persistence**: All operations are stored in PostgreSQL database

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database operations
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: UI component primitives
- **react-hook-form**: Form handling and validation
- **zod**: Runtime type validation

### Development Tools
- **Vite**: Build tool and development server
- **TypeScript**: Type safety across the stack
- **Tailwind CSS**: Utility-first styling
- **ESBuild**: Server-side bundling for production

## Deployment Strategy

### Development
- **Frontend**: Vite dev server with HMR
- **Backend**: tsx for TypeScript execution with auto-reload
- **Database**: Neon serverless PostgreSQL
- **Scripts**: 
  - `npm run dev` - Start development server
  - `npm run db:push` - Push schema changes to database

### Production Build
- **Frontend**: Static build output to `dist/public`
- **Backend**: ESBuild bundle to `dist/index.js`
- **Database**: Production Neon database via DATABASE_URL
- **Scripts**:
  - `npm run build` - Build both frontend and backend
  - `npm start` - Run production server

### Configuration
- Environment variables for database connection
- Drizzle configuration for PostgreSQL dialect
- Vite configuration with path aliases and React plugin
- TypeScript configuration with shared paths for monorepo structure

The application uses a monorepo structure with shared TypeScript types between client and server, ensuring type safety across the entire stack. The SOCKS5 proxy functionality is integrated directly into the backend, providing a complete proxy management solution.