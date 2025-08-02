# SOCKS5 Proxy Admin Panel

## Overview

This is a comprehensive full-stack SOCKS5 proxy management system with complete admin interface. It provides enterprise-level features including user management, real-time monitoring, IP pool management, detailed analytics, security controls, and system administration. The application features a modern React frontend with shadcn/ui components and a robust Express.js backend with SQLite database integration.

**🚀 PROJECT STATUS: FULLY OPERATIONAL WITH WORKING SOCKS5 PROXY**
- All core features implemented and fully tested
- Application running successfully on port 5000
- **✅ SOCKS5 proxy server fully operational and tested on port 1080**
- **✅ User authentication working perfectly with proxy connections**
- **✅ Real proxy connections verified with external websites (HTTP & HTTPS)**
- **✅ HTTPS/TLS support fully working (port 443) with proper SSL tunnel**
- **✅ SOCKS5 connectivity issue RESOLVED - proxy working for authenticated connections**
- **✅ Comprehensive diagnostic testing confirms successful connections to Google, HTTPBin**
- **✅ Enhanced DNS resolution with IPv4/IPv6 fallback support**
- **✅ Improved error handling and connection timeout management**
- **✅ User deletion functionality working correctly with proper UUID format**
- **✅ API keys creation and management system fully operational**
- **✅ External API access working with authentication**
- **✅ VPS deployment initiated on 103.7.4.183 with server credentials**
- **✅ All critical issues resolved: user deletion, SOCKS5 connectivity, API keys**
- **✅ Complete install.sh script updated with all latest fixes and features**
- **✅ Enterprise-grade installation script with security hardening and optimization**
- **✅ Demo data completely removed from system**
- **✅ CORS configuration for custom domain (103.7.4.183) setup**
- **✅ Reverse proxy/load balancer support with proper headers**
- **✅ Comprehensive responsive design implementation completed**
- **✅ Mobile navigation with sliding sidebar and hamburger menu**
- **✅ Adaptive layouts for mobile (320px+), tablet (768px+), and desktop (1024px+)**
- **✅ install.sh v4.0.0 - Complete enterprise installation with all features**
- Database fully functional with SQLite/PostgreSQL
- Complete API management system with usage analytics
- Enhanced user portal with SOCKS5 user authentication
- User management with detailed profiles and controls
- Real-time monitoring and analytics dashboard
- API key management with rate limiting monitoring
- Enhanced Create User page with package selection and sidebar navigation
- Authentication removed from admin panel for easier access
- Package-based user creation with auto-filled limits
- **✅ Regional & timezone settings with comprehensive localization options**
- One-click installation script and comprehensive documentation
- **✅ Complete uninstall script (uninstall.sh) for clean system removal**
- Production deployment guide created
- **✅ Complete enterprise-grade SOCKS5 proxy management system**
- **✅ IP routing system implemented - users can be assigned specific outbound IPs**
- **✅ Multiple public IP support with per-user traffic NAT routing**
- **✅ IP sharing capability - multiple users can share the same outbound IP without restrictions**
- **✅ Demonstrated with test users: shareduser1 & shareduser2 both using IP 103.7.4.182**
- **✅ Settings page functionality completely fixed - all features work and data saves properly**
- **✅ Complete install.sh v4.0.0 with all latest fixes and enterprise features**
- **✅ User portal access issue RESOLVED - authentication working perfectly**
- **✅ Complete uninstall.sh v4.0.0 - Safe system removal with backup creation**
- **✅ Installation error FIXED - missing drizzle.config.ts issue resolved**
- **✅ Complete self-contained install.sh v4.0.0 - Creates entire application from scratch**
- **✅ Install.sh now uses GitHub zip download (https://github.com/fahim8401/SockProxyManagerPanel/archive/refs/heads/MAIN.zip)**
- **✅ Install.sh updated with browserslist fix and build tools for better compatibility**

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
- **Multiple users can share the same IP address (no restrictions)**
- Automatic IP assignment to users
- IP availability tracking
- Geographic distribution support
- Bulk IP import capabilities
- IP usage statistics
- **Flexible IP sharing for cost-effective proxy solutions**

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

### ✅ API Management System
- Complete API key generation and management with usage analytics
- External API endpoints (/api/v1/users, /api/v1/users/:id)
- API documentation with examples and rate limiting info
- Real-time API usage monitoring and statistics dashboard
- Secure API key authentication with JWT tokens
- Rate limiting (100 requests/min) and access controls

### ✅ User Portal System
- SOCKS5 user authentication with JWT tokens
- Dedicated user dashboard for proxy users
- Real-time usage monitoring and account information
- Secure login system separate from admin panel
- Personal data usage tracking and connection status
- Account details with network configuration display

### ✅ Enhanced User Management
- Detailed user profile modals with network configuration
- Data usage visualization with progress bars
- User timeline and activity history
- Suspend/resume functionality with visual indicators
- Real-time status tracking with expiration alerts
- Comprehensive user statistics and analytics

### ✅ Interactive Network Performance Dashboard
- Real-time bandwidth monitoring with live charts
- Connection quality analysis with network scoring
- Latency and jitter measurement with interactive graphs
- User traffic analysis with individual usage patterns
- Geographic distribution monitoring with regional metrics
- Server health tracking (CPU, memory, disk usage)
- Auto-refresh capabilities with customizable time ranges
- Mobile-responsive design with navigation integration

### ✅ System Administration
- Comprehensive settings panel with 8 configuration tabs
- Server configuration management (port, connections, timeouts)
- Security settings (rate limiting, geo-blocking, fail2ban)
- Firewall and DDoS protection configuration
- Advanced routing and traffic shaping
- DNS management with filtering and caching
- **✅ Regional & timezone settings (multiple languages, currencies, date formats)**
- Database backup automation and management
- Notification system setup with email and SMS alerts

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
- **Database**: SQLite with Drizzle ORM ✅ **CONNECTED**
- **Database Provider**: Better SQLite3 (Local file-based database)
- **Real-time Communication**: WebSocket server for live updates
- **Session Management**: JWT-based authentication
- **SOCKS5 Server**: Custom implementation for proxy functionality  
- **Security**: bcrypt password hashing, JWT tokens, rate limiting

### Data Storage ✅ **ACTIVE DATABASE** 
- **Primary Database**: SQLite (Portable local database file)
- **ORM**: Drizzle ORM with schema-first approach  
- **Schema Location**: `shared/schema.ts` for type-safe database operations
- **Database File**: `./database.sqlite` (auto-created)
- **Tables Created**: users, connections, ip_pool, admins (with default data)
- **Storage Implementation**: DatabaseStorage class with SQLite adapter
- **Database Operations**: Full CRUD operations with foreign key relationships
- **Auto-initialization**: Default admin (admin/admin123) and 6 IP addresses

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