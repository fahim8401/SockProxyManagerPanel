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

**✅ COMPLETE XRAY-CORE REBUILD (Final Version)**
- **Date**: August 4, 2025
- **Scope**: Complete system rebuild using Xray-core framework
- **Architecture**: Replicated 3x-ui's proven methodology but focused on SOCKS5
- **Changes Made**:
  - Implemented XrayManager class for process management
  - Created comprehensive database schema with Drizzle ORM
  - Built modern web interface with real-time WebSocket updates
  - Added JWT authentication and proper user management
  - Integrated IP pool management for advanced routing
  - Created production-ready systemd service configuration
- **Key Features**:
  - Real-time Xray process monitoring and control
  - Dynamic configuration updates without downtime
  - Enterprise-grade user management with data limits
  - Beautiful modern interface with gradient design
  - WebSocket-based live updates
  - Complete API for external integrations
- **Status**: Production-ready system using proven Xray-core technology

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