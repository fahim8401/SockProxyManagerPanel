# SOCKS5 Proxy Admin Panel

## Overview

This is a full-stack web application for managing a SOCKS5 proxy server. It provides an admin interface for user management, connection monitoring, IP pool management, and real-time analytics. The application features a React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database integration.

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
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Real-time Communication**: WebSocket server for live updates
- **Session Management**: PostgreSQL session store (connect-pg-simple)
- **SOCKS5 Server**: Custom implementation for proxy functionality

### Data Storage
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with schema-first approach
- **Schema Location**: `shared/schema.ts` for type-safe database operations
- **Migrations**: Drizzle Kit for database migrations in `./migrations`

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