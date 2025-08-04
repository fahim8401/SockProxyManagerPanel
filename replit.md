# Xray SOCKS5 Management System

This is a comprehensive SOCKS5 proxy management system built using Xray-core framework, inspired by 3x-ui's proven architecture. The system provides enterprise-grade proxy management with a modern web interface.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Technology Stack
- **Proxy Engine**: Xray-core v24.9.30 (same technology as 3x-ui)
- **Backend**: Node.js with TypeScript and Express.js
- **Database**: SQLite with Drizzle ORM for type-safe operations
- **Frontend**: Vanilla HTML/CSS/JavaScript with modern design
- **Authentication**: JWT tokens with bcryptjs password hashing
- **Real-time Updates**: WebSocket connections for live status monitoring

## Key Architectural Decisions

### Xray-core Integration
- Downloads and manages Xray-core binary (like 3x-ui does)
- Generates JSON configuration files for SOCKS5 protocol
- Automatic process management with restart capabilities
- Real-time stats via Xray's built-in API

### Database Schema
- **admins**: Administrative user accounts with JWT authentication
- **proxy_users**: SOCKS5 proxy users with credentials and limits
- **connections**: Active connection tracking with bandwidth monitoring
- **ip_pool**: Available IP addresses for outbound routing
- **xray_configs**: Xray configuration storage and versioning
- **settings**: System configuration key-value store

### Security Model
- JWT-based authentication with 24-hour token expiration
- bcryptjs password hashing for all user credentials
- Prepared SQL statements via Drizzle ORM
- CORS configuration for development flexibility

## Recent Changes

**✅ COMPLETE SAAS PLATFORM UPGRADE (Final Version)**
- **Date**: August 4, 2025
- **Scope**: Complete upgrade to full commercial SAAS platform
- **Architecture**: Enterprise-grade proxy management with package-based billing
- **Changes Made**:
  - Added package management system with pricing tiers
  - Built comprehensive admin panel with full CRUD operations
  - Implemented IP selection options for users
  - Added data limits and expiry day management
  - Created external API system with secure key authentication
  - Enhanced user management with package assignments
  - Added analytics and reporting dashboard
- **Key SAAS Features**:
  - Package-based user management (Basic, Premium, Enterprise)
  - IP pool selection during user creation
  - Customizable data limits and validity periods
  - External API endpoints for integration
  - Secure API key generation and management
  - Real-time analytics and system monitoring
  - Complete admin dashboard with modern UI
- **API Endpoints**:
  - GET/POST /api/external/users (with API key auth)
  - GET /api/external/stats
  - Full admin API for packages, users, IPs
- **Status**: Production-ready commercial SAAS platform with Ubuntu VPS deployment ready

## Ubuntu VPS Deployment

**✅ COMPLETE DEPLOYMENT PACKAGE READY**
- **Date**: August 4, 2025
- **Deployment Method**: Automated Ubuntu VPS installation
- **Package Includes**:
  - Auto-installation script (`install-ubuntu.sh`)
  - Complete deployment guide (`UBUNTU_VPS_INSTALLATION.md`)
  - Systemd service configuration
  - Nginx reverse proxy setup
  - SSL certificate automation with Certbot
  - Firewall configuration (UFW)
  - Performance optimizations
  - Automated backup system
  - Monitoring and maintenance scripts
- **System Requirements**:
  - Ubuntu 20.04+ VPS
  - Minimum 1GB RAM, 1 CPU core, 20GB storage
  - Root or sudo access
  - Optional: Domain name for SSL
- **Installation**: Single command deployment with `sudo ./install-ubuntu.sh`
- **Status**: Ready for immediate production deployment

# External Dependencies

## Core Runtime
- **Xray-core**: High-performance proxy framework (v24.9.30)
- **Express.js**: Web application framework
- **better-sqlite3**: High-performance SQLite driver
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **ws**: WebSocket server implementation

## Database & ORM
- **Drizzle ORM**: Type-safe database toolkit
- **Drizzle-Zod**: Schema validation integration

## Development Tools
- **TypeScript**: Static type checking
- **tsx**: TypeScript execution for Node.js