# Xray SOCKS5 Management System - API Documentation

## Overview

The Xray SOCKS5 Management System provides a comprehensive RESTful API for external integrations. This API allows you to programmatically manage users, packages, IP pools, and system statistics.

## Base URL

```
http://your-server:5000/api
https://your-domain.com/api
```

## Authentication

All external API endpoints require authentication using API keys. Generate API keys through the admin panel.

### API Key Authentication

Include the API key in the request header:

```http
X-API-Key: your-generated-api-key
```

### Admin Authentication (Internal)

Admin endpoints use JWT tokens:

```http
Authorization: Bearer your-jwt-token
```

## Rate Limiting

- **External API**: 100 requests per minute per API key
- **Admin API**: 1000 requests per minute per token

## Response Format

All responses follow a consistent JSON format:

### Success Response
```json
{
  "success": true,
  "data": {...},
  "timestamp": "2025-08-04T12:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  },
  "timestamp": "2025-08-04T12:00:00.000Z"
}
```

## External API Endpoints

### 1. User Management

#### Get All Users
```http
GET /api/external/users
```

**Headers:**
```http
X-API-Key: your-api-key
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "user1",
      "packageId": 2,
      "ipAddress": "103.7.4.182",
      "port": 1080,
      "dataLimit": 10737418240,
      "dataUsed": 1073741824,
      "validityDays": 30,
      "isActive": true,
      "createdAt": "2025-08-04T10:00:00.000Z",
      "expiresAt": "2025-09-03T10:00:00.000Z"
    }
  ]
}
```

#### Create New User
```http
POST /api/external/users
```

**Headers:**
```http
Content-Type: application/json
X-API-Key: your-api-key
```

**Request Body:**
```json
{
  "username": "newuser",
  "password": "securepassword",
  "packageId": 2,
  "dataLimit": 10737418240,
  "validityDays": 30,
  "ipAddress": "103.7.4.182",
  "port": 1080,
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "username": "newuser",
    "packageId": 2,
    "ipAddress": "103.7.4.182",
    "port": 1080,
    "dataLimit": 10737418240,
    "dataUsed": 0,
    "validityDays": 30,
    "isActive": true,
    "createdAt": "2025-08-04T12:00:00.000Z",
    "expiresAt": "2025-09-03T12:00:00.000Z"
  }
}
```

#### Get Specific User
```http
GET /api/external/users/{id}
```

**Parameters:**
- `id` (integer): User ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "user1",
    "packageId": 2,
    "ipAddress": "103.7.4.182",
    "port": 1080,
    "dataLimit": 10737418240,
    "dataUsed": 1073741824,
    "validityDays": 30,
    "isActive": true,
    "createdAt": "2025-08-04T10:00:00.000Z",
    "expiresAt": "2025-09-03T10:00:00.000Z"
  }
}
```

#### Update User
```http
PUT /api/external/users/{id}
```

**Request Body:**
```json
{
  "dataLimit": 21474836480,
  "validityDays": 60,
  "isActive": true
}
```

#### Delete User
```http
DELETE /api/external/users/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "User deleted successfully"
  }
}
```

### 2. System Statistics

#### Get System Stats
```http
GET /api/external/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "activeUsers": 142,
    "totalConnections": 89,
    "xrayRunning": true,
    "systemInfo": {
      "uptime": "7 days, 3 hours",
      "cpuUsage": 23.5,
      "memoryUsage": 67.2,
      "diskUsage": 45.8
    },
    "networkStats": {
      "totalBandwidth": 1073741824000,
      "usedBandwidth": 536870912000,
      "avgLatency": 45.2
    }
  }
}
```

### 3. Package Information

#### Get All Packages
```http
GET /api/external/packages
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Basic",
      "description": "1GB data, 30 days validity",
      "dataLimit": 1073741824,
      "validityDays": 30,
      "price": 10.00,
      "maxConnections": 1,
      "allowedIpCount": 1,
      "isActive": true
    },
    {
      "id": 2,
      "name": "Premium",
      "description": "10GB data, 30 days validity, 3 IPs",
      "dataLimit": 10737418240,
      "validityDays": 30,
      "price": 50.00,
      "maxConnections": 5,
      "allowedIpCount": 3,
      "isActive": true
    }
  ]
}
```

### 4. IP Pool Management

#### Get Available IPs
```http
GET /api/external/ip-pool
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ipAddress": "103.7.4.182",
      "country": "US",
      "city": "New York",
      "provider": "VPS Provider",
      "type": "datacenter",
      "speed": 1000,
      "isActive": true,
      "isPublic": true,
      "assignedUserId": null
    }
  ]
}
```

## Admin API Endpoints

### 1. Authentication

#### Admin Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "username": "admin",
      "role": "admin"
    }
  }
}
```

### 2. Package Management

#### Create Package
```http
POST /api/packages
```

**Headers:**
```http
Authorization: Bearer your-jwt-token
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Enterprise Plus",
  "description": "500GB data, 180 days validity, unlimited IPs",
  "dataLimit": 536870912000,
  "validityDays": 180,
  "price": 500.00,
  "maxConnections": 50,
  "allowedIpCount": 20,
  "isActive": true
}
```

#### Update Package
```http
PUT /api/packages/{id}
```

#### Delete Package
```http
DELETE /api/packages/{id}
```

### 3. User Management (Admin)

#### Get All Users (Admin)
```http
GET /api/users
```

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `limit` (integer): Items per page (default: 50)
- `search` (string): Search by username
- `packageId` (integer): Filter by package
- `status` (string): Filter by status (active/inactive)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [...],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3
    }
  }
}
```

### 4. IP Pool Management (Admin)

#### Add IP to Pool
```http
POST /api/ip-pool
```

**Request Body:**
```json
{
  "ipAddress": "103.7.4.184",
  "country": "US",
  "city": "Los Angeles",
  "provider": "DataCenter Corp",
  "type": "datacenter",
  "speed": 1000,
  "isPublic": true,
  "isActive": true
}
```

### 5. API Key Management

#### Create API Key
```http
POST /api/api-keys
```

**Request Body:**
```json
{
  "keyName": "Integration Key",
  "permissions": "read",
  "expiryDays": 365
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "keyName": "Integration Key",
    "apiKey": "xray_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
    "permissions": "read",
    "isActive": true,
    "expiresAt": "2026-08-04T12:00:00.000Z"
  }
}
```

### 6. System Control

#### Restart Xray Service
```http
POST /api/xray/restart
```

#### Get Xray Status
```http
GET /api/xray/status
```

#### Database Cleanup
```http
POST /api/admin/clean-database
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Database cleaned successfully. All user data removed except admin credentials."
  }
}
```

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `AUTH_REQUIRED` | Authentication required | No API key or token provided |
| `INVALID_API_KEY` | Invalid API key | API key is invalid or expired |
| `INSUFFICIENT_PERMISSIONS` | Insufficient permissions | API key lacks required permissions |
| `USER_NOT_FOUND` | User not found | Requested user doesn't exist |
| `USERNAME_EXISTS` | Username already exists | Username is already taken |
| `PACKAGE_NOT_FOUND` | Package not found | Requested package doesn't exist |
| `IP_NOT_AVAILABLE` | IP address not available | Requested IP is not available |
| `VALIDATION_ERROR` | Validation error | Request data validation failed |
| `INTERNAL_ERROR` | Internal server error | Unexpected server error |
| `RATE_LIMITED` | Rate limit exceeded | Too many requests |

## Status Codes

- `200 OK` - Successful request
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication failed
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (duplicate)
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

## Code Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const API_BASE = 'http://your-server:5000/api';
const API_KEY = 'your-api-key';

// Create a new user
async function createUser(userData) {
  try {
    const response = await axios.post(`${API_BASE}/external/users`, userData, {
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating user:', error.response.data);
    throw error;
  }
}

// Get system statistics
async function getStats() {
  try {
    const response = await axios.get(`${API_BASE}/external/stats`, {
      headers: {
        'X-API-Key': API_KEY
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching stats:', error.response.data);
    throw error;
  }
}

// Usage example
(async () => {
  try {
    // Create a new user
    const newUser = await createUser({
      username: 'client123',
      password: 'securepass',
      packageId: 2,
      dataLimit: 10737418240,
      validityDays: 30
    });
    
    console.log('User created:', newUser);
    
    // Get system stats
    const stats = await getStats();
    console.log('System stats:', stats);
    
  } catch (error) {
    console.error('API Error:', error);
  }
})();
```

### Python

```python
import requests
import json

API_BASE = 'http://your-server:5000/api'
API_KEY = 'your-api-key'

class XrayAPI:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            'X-API-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def create_user(self, user_data):
        """Create a new SOCKS5 user"""
        response = requests.post(
            f'{self.base_url}/external/users',
            headers=self.headers,
            json=user_data
        )
        response.raise_for_status()
        return response.json()
    
    def get_users(self):
        """Get all users"""
        response = requests.get(
            f'{self.base_url}/external/users',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def get_stats(self):
        """Get system statistics"""
        response = requests.get(
            f'{self.base_url}/external/stats',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def delete_user(self, user_id):
        """Delete a user"""
        response = requests.delete(
            f'{self.base_url}/external/users/{user_id}',
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Usage example
if __name__ == '__main__':
    api = XrayAPI(API_BASE, API_KEY)
    
    try:
        # Create a new user
        new_user = api.create_user({
            'username': 'python_user',
            'password': 'secure123',
            'packageId': 1,
            'dataLimit': 1073741824,
            'validityDays': 30
        })
        
        print('User created:', json.dumps(new_user, indent=2))
        
        # Get all users
        users = api.get_users()
        print(f'Total users: {len(users["data"])}')
        
        # Get system stats
        stats = api.get_stats()
        print('System stats:', json.dumps(stats, indent=2))
        
    except requests.exceptions.RequestException as e:
        print(f'API Error: {e}')
```

### cURL Examples

```bash
#!/bin/bash

API_BASE="http://your-server:5000/api"
API_KEY="your-api-key"

# Create a new user
curl -X POST "${API_BASE}/external/users" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "curl_user",
    "password": "password123",
    "packageId": 2,
    "dataLimit": 10737418240,
    "validityDays": 30
  }' | jq '.'

# Get all users
curl -X GET "${API_BASE}/external/users" \
  -H "X-API-Key: ${API_KEY}" | jq '.'

# Get system statistics
curl -X GET "${API_BASE}/external/stats" \
  -H "X-API-Key: ${API_KEY}" | jq '.'

# Delete a user
curl -X DELETE "${API_BASE}/external/users/5" \
  -H "X-API-Key: ${API_KEY}" | jq '.'
```

### PHP

```php
<?php

class XrayAPI {
    private $baseUrl;
    private $apiKey;
    
    public function __construct($baseUrl, $apiKey) {
        $this->baseUrl = $baseUrl;
        $this->apiKey = $apiKey;
    }
    
    private function makeRequest($method, $endpoint, $data = null) {
        $url = $this->baseUrl . $endpoint;
        
        $headers = [
            'X-API-Key: ' . $this->apiKey,
            'Content-Type: application/json'
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode >= 400) {
            throw new Exception("API Error: HTTP $httpCode - $response");
        }
        
        return json_decode($response, true);
    }
    
    public function createUser($userData) {
        return $this->makeRequest('POST', '/external/users', $userData);
    }
    
    public function getUsers() {
        return $this->makeRequest('GET', '/external/users');
    }
    
    public function getStats() {
        return $this->makeRequest('GET', '/external/stats');
    }
    
    public function deleteUser($userId) {
        return $this->makeRequest('DELETE', "/external/users/$userId");
    }
}

// Usage example
try {
    $api = new XrayAPI('http://your-server:5000/api', 'your-api-key');
    
    // Create user
    $newUser = $api->createUser([
        'username' => 'php_user',
        'password' => 'secure123',
        'packageId' => 1,
        'dataLimit' => 1073741824,
        'validityDays' => 30
    ]);
    
    echo "User created: " . json_encode($newUser, JSON_PRETTY_PRINT) . "\n";
    
    // Get stats
    $stats = $api->getStats();
    echo "Stats: " . json_encode($stats, JSON_PRETTY_PRINT) . "\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
```

## Webhooks (Future Feature)

The system is designed to support webhooks for real-time notifications:

### Webhook Events
- `user.created` - New user created
- `user.updated` - User updated
- `user.deleted` - User deleted
- `user.expired` - User subscription expired
- `system.maintenance` - System maintenance events

### Webhook Configuration
```json
{
  "url": "https://your-app.com/webhooks/xray",
  "events": ["user.created", "user.expired"],
  "secret": "webhook-secret-key"
}
```

## Best Practices

### Security
1. **Secure API Keys**: Store API keys securely and rotate regularly
2. **HTTPS Only**: Always use HTTPS in production
3. **Rate Limiting**: Implement client-side rate limiting
4. **Input Validation**: Validate all input data
5. **Error Handling**: Handle errors gracefully

### Performance
1. **Caching**: Cache frequently accessed data
2. **Pagination**: Use pagination for large datasets
3. **Batch Operations**: Batch multiple operations when possible
4. **Connection Pooling**: Use connection pooling for databases

### Reliability
1. **Retry Logic**: Implement exponential backoff for retries
2. **Timeout Handling**: Set appropriate timeouts
3. **Health Checks**: Implement health check endpoints
4. **Monitoring**: Monitor API usage and performance

## Support

For API support and questions:
- **Documentation**: [GitHub Wiki](https://github.com/fahim8401/SockProxyManagerPanel/wiki)
- **Issues**: [GitHub Issues](https://github.com/fahim8401/SockProxyManagerPanel/issues)
- **API Questions**: Tag issues with `api` label

---

**© 2025 Xray SOCKS5 Management System - Complete API Documentation**