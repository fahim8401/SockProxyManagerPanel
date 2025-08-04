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

**✅ FINAL PRODUCTION SAAS PLATFORM (Version 2.0)**
- **Date**: August 4, 2025
- **Scope**: Complete production-ready SAAS platform with universal Linux compatibility
- **Major Updates**:
  - **Removed "Default Package"** from General Settings as requested
  - **Added Database Cleaning** feature that preserves admin credentials while clearing all user data
  - **Integrated Speed Test** - Embedded openspeedtest.hplink.com.bd in Network Performance Monitor
  - **Universal Linux Compatibility** - Created install-linux.sh for all Linux distributions
  - **Comprehensive Documentation** - Complete README.md with installation and usage guides
- **Enhanced Features**:
  - Triple-confirmation database cleaning with safety warnings
  - Real-time iframe speed testing integration
  - Automated installation for Ubuntu, Debian, CentOS, RHEL, Fedora, Arch, Alpine, OpenSUSE
  - Systemd service integration with security hardening
  - Nginx reverse proxy with SSL/TLS support
  - Automated backup system with 7-day retention
  - Firewall configuration for all major Linux distributions
- **Production Deployment**:
  - Single-command installation: `curl -fsSL https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/MAIN/install-linux.sh | sudo bash`
  - Domain-based SSL setup support
  - Professional service management with systemd
  - Comprehensive security configuration
- **Status**: Complete commercial SAAS platform ready for immediate production deployment on any Linux system

## Universal Linux Deployment

**✅ UNIVERSAL LINUX COMPATIBILITY ACHIEVED**
- **Date**: August 4, 2025
- **Deployment Method**: Automated installation for ALL Linux distributions
- **Supported Distributions**:
  - Ubuntu/Debian (apt package manager)
  - CentOS/RHEL/Rocky/AlmaLinux (yum/dnf package manager)
  - Fedora (dnf package manager)
  - Arch/Manjaro (pacman package manager)
  - OpenSUSE/SLES (zypper package manager)
  - Alpine Linux (apk package manager)
  - Generic Linux (automatic package manager detection)
- **Installation Features**:
  - Automatic distribution detection
  - Package manager auto-selection
  - Firewall configuration (UFW/firewalld)
  - SSL certificate automation with Certbot
  - Systemd service with security hardening
  - Nginx reverse proxy with WebSocket support
  - Daily automated backups with retention
  - Comprehensive error handling and logging
- **Installation Methods**:
  - Quick: `curl -fsSL https://raw.githubusercontent.com/fahim8401/SockProxyManagerPanel/MAIN/install-linux.sh | sudo bash`
  - With Domain: `curl -fsSL ... | sudo bash -s yourdomain.com`
- **Status**: Production-ready for ANY Linux distribution worldwide

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