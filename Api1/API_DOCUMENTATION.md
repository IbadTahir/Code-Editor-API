# Dynamic Docker Code Execution API Documentation

## Overview

This API provides dynamic Docker container management for code execution across multiple programming languages. It supports both transient (one-time use) and persistent (shared room) containers with automatic language toolkit provisioning.

## Base URL

```
http://localhost:3000/api
```

## Language Support

The API supports multiple programming languages organized by resource cost tiers:

### Low-Cost Languages (Fast, Lightweight)
- **Python** - 256MB RAM, 10s timeout
- **JavaScript (Node.js)** - 256MB RAM, 10s timeout  
- **TypeScript** - 300MB RAM, 15s timeout
- **Go** - 200MB RAM, 8s timeout
- **Lua** - 128MB RAM, 8s timeout

### Medium-Cost Languages
- **C++** - 300MB RAM, 20s timeout
- **Java** - 512MB RAM, 15s timeout
- **Kotlin** - 512MB RAM, 18s timeout
- **PHP** - 256MB RAM, 12s timeout
- **Ruby** - 300MB RAM, 12s timeout
- **Rust** - 400MB RAM, 20s timeout

### High-Cost Languages (Specialized)
- **R** - 1GB RAM, 30s timeout
- **Julia** - 1GB RAM, 30s timeout

## API Endpoints

### Language Information

#### GET `/languages`
Get all supported languages with their configurations.

**Response:**
```json
{
  "success": true,
  "languages": [
    {
      "name": "python",
      "displayName": "Python",
      "cost": "low",
      "memoryLimit": "256m",
      "executionTimeout": 10000,
      "fileExtension": ".py",
      "commonPackages": ["numpy", "pandas", "requests", "matplotlib"]
    }
  ],
  "count": 12
}
```

#### GET `/languages/tier/:tier`
Get languages by cost tier (low, medium, high).

**Parameters:**
- `tier` - Cost tier: `low`, `medium`, or `high`

**Response:**
```json
{
  "success": true,
  "tier": "low",
  "languages": [
    {
      "name": "python",
      "displayName": "Python",
      "memoryLimit": "256m",
      "executionTimeout": 10000,
      "concurrentLimit": 20
    }
  ],
  "count": 5
}
```

### Container Management

#### POST `/containers`
Create a new dynamic container with language toolkit.

**Request Body:**
```json
{
  "language": "python",
  "isPersistent": true,
  "roomId": "room-123",
  "customPackages": ["requests", "beautifulsoup4"],
  "memoryOverride": "512m",
  "timeoutOverride": 15000
}
```

**Response:**
```json
{
  "success": true,
  "containerId": "550e8400-e29b-41d4-a716-446655440000",
  "language": "python",
  "isPersistent": true,
  "roomId": "room-123",
  "config": {
    "memoryLimit": "512m",
    "executionTimeout": 15000,
    "cost": "low"
  }
}
```

#### GET `/containers`
List all persistent containers.

**Response:**
```json
{
  "success": true,
  "containers": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "containerId": "docker-container-id",
      "language": "python",
      "roomId": "room-123",
      "createdAt": "2025-06-11T10:30:00.000Z",
      "lastActivity": "2025-06-11T11:45:00.000Z",
      "isActive": true,
      "status": {
        "status": "running",
        "memory": 536870912
      }
    }
  ],
  "count": 1
}
```

#### GET `/containers/:containerId/status`
Get container status and information.

**Response:**
```json
{
  "success": true,
  "containerId": "550e8400-e29b-41d4-a716-446655440000",
  "status": {
    "status": "running",
    "created": "2025-06-11T10:30:00.000Z",
    "language": "python",
    "roomId": "room-123",
    "lastActivity": "2025-06-11T11:45:00.000Z",
    "isActive": true,
    "memory": 536870912
  }
}
```

#### DELETE `/containers/:containerId`
Destroy a container.

**Response:**
```json
{
  "success": true,
  "message": "Container destroyed successfully",
  "containerId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Code Execution

#### POST `/containers/execute`
Execute code in an existing container.

**Request Body:**
```json
{
  "containerId": "550e8400-e29b-41d4-a716-446655440000",
  "files": [
    {
      "name": "main.py",
      "content": "print('Hello, World!')\nprint(2 + 2)"
    },
    {
      "name": "utils.py", 
      "content": "def helper():\n    return 'helper function'"
    }
  ],
  "entryFile": "main.py"
}
```

**Response:**
```json
{
  "success": true,
  "containerId": "550e8400-e29b-41d4-a716-446655440000",
  "output": "Hello, World!\n4\n",
  "error": "",
  "executionTime": 1250
}
```

#### POST `/execute/transient`
Create a transient container and execute code in one request.

**Request Body:**
```json
{
  "language": "python",
  "files": [
    {
      "name": "main.py",
      "content": "import requests\nprint('Python with requests!')"
    }
  ],
  "entryFile": "main.py",
  "customPackages": ["requests"]
}
```

**Response:**
```json
{
  "success": true,
  "language": "python",
  "output": "Python with requests!\n",
  "error": "",
  "executionTime": 2500,
  "containerId": "auto-generated-id"
}
```

#### POST `/execute` (Legacy)
Legacy endpoint for backward compatibility.

**Request Body:**
```json
{
  "language": "python",
  "code": "print('Hello from legacy endpoint!')"
}
```

**Response:**
```json
{
  "success": true,
  "output": "Hello from legacy endpoint!\n",
  "error": "",
  "executionTime": 1000
}
```

## Usage Examples

### Quick Python Script Execution
```bash
curl -X POST http://localhost:3000/api/execute/transient \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "files": [{"name": "main.py", "content": "print(2 ** 10)"}]
  }'
```

### Persistent Development Environment
```bash
# Create persistent container
curl -X POST http://localhost:3000/api/containers \
  -H "Content-Type: application/json" \
  -d '{
    "language": "python",
    "isPersistent": true,
    "roomId": "my-dev-room",
    "customPackages": ["numpy", "pandas"]
  }'

# Execute code in persistent container
curl -X POST http://localhost:3000/api/containers/execute \
  -H "Content-Type: application/json" \
  -d '{
    "containerId": "returned-container-id",
    "files": [{"name": "analysis.py", "content": "import pandas as pd\nprint(pd.__version__)"}]
  }'
```

## File Structure Support

The API supports multi-file projects with automatic entry file detection and language-specific execution.

## Error Handling

All endpoints return consistent error responses with appropriate HTTP status codes.

## Security & Resource Management

- Container isolation with resource limits
- Automatic cleanup of inactive containers
- Network isolation and security restrictions
- Readonly filesystem protection
