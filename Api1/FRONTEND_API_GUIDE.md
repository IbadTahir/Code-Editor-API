# Frontend Developer API Documentation

## Code Editor Backend - Complete Integration Guide

Welcome to the Code Editor Backend API! This comprehensive guide will help you integrate our powerful multi-language code execution and collaborative room features into your frontend application.

## 🚀 Quick Start

### Base URL
```
http://localhost:3000/api
```

### Health Check
```http
GET /health
```
Returns server status and available features.

---

## 🔐 Authentication

Currently using header-based authentication for development:

```javascript
const headers = {
  'x-user-id': 'your-user-id',
  'x-user-tier': 'free|pro|enterprise',
  'Content-Type': 'application/json'
};
```

---

## 📋 API Overview

### Session Types

1. **Solo Sessions**: Single-user code execution
2. **Room Sessions**: Multi-user collaborative environments with shared containers

---

## 🎯 Core API Endpoints

### 1. Initialize a Session

#### Solo Session
```http
POST /api/sessions/init
```

**Headers:**
```json
{
  "x-user-id": "your-user-id",
  "x-user-tier": "free|pro|enterprise",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "sessionType": "solo",
  "language": "python"
}
```

#### Room Session
```http
POST /api/sessions/init
```

**Headers:**
```json
{
  "x-user-id": "your-user-id", 
  "x-user-tier": "free|pro|enterprise",
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "sessionType": "room",
  "languages": ["python", "javascript", "go"],
  "roomName": "My Awesome Project",
  "maxUsers": 5
}
```

**Parameters:**
- `sessionType` (required): "solo" or "room"
- `language` (required for solo): Single language
- `languages` (required for room): Array of languages
- `roomName` (required for room): Room display name
- `maxUsers` (optional): Maximum users for room (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_12345",
    "sessionType": "room",
    "roomId": "room_67890",
    "roomName": "My Awesome Project",
    "languages": ["python", "javascript", "go"],
    "containerId": "container_abc123",
    "createdAt": "2025-06-17T10:00:00Z",
    "maxUsers": 5,
    "currentUsers": 1
  },
  "message": "Room session initialized successfully"
}
```

### 2. Join an Existing Room

```http
POST /api/sessions/join/:roomId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_54321",
    "roomId": "room_67890",
    "roomName": "My Awesome Project",
    "languages": ["python", "javascript", "go"],
    "containerId": "container_abc123",
    "currentUsers": 2,
    "maxUsers": 5
  },
  "message": "Successfully joined room"
}
```

### 3. Execute Code

```http
POST /api/sessions/:sessionId/execute
```

**Request Body:**
```json
{
  "code": "print('Hello, World!')",
  "input": "optional input for interactive programs"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_12345",
    "output": "Hello, World!\n",
    "error": null,
    "executionTime": 45,
    "timestamp": "2025-06-17T10:30:00Z"
  }
}
```

### 4. Get Session Info

```http
GET /api/sessions/:sessionId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_12345",
    "sessionType": "room",
    "roomId": "room_67890",
    "status": "active",
    "languages": ["python", "javascript", "go"],
    "currentUsers": 3,
    "maxUsers": 5,
    "createdAt": "2025-06-17T10:00:00Z",
    "lastActivity": "2025-06-17T10:30:00Z"
  }
}
```

### 5. Get User's Active Sessions

```http
GET /api/sessions/user/active
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "sess_12345",
        "sessionType": "room",
        "roomName": "My Project",
        "status": "active",
        "createdAt": "2025-06-17T10:00:00Z"
      }
    ],
    "totalSessions": 1
  }
}
```

### 6. Terminate Session

```http
DELETE /api/sessions/:sessionId
```

**Response:**
```json
{
  "success": true,
  "message": "Session terminated successfully"
}
```

---

## 🏠 Room Management

### Get Room Information

```http
GET /api/rooms/:roomId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roomId": "room_67890",
    "roomName": "My Awesome Project",
    "languages": ["python", "javascript", "go"],
    "maxUsers": 5,
    "currentUsers": 3,
    "containerId": "container_abc123",
    "status": "active",
    "createdAt": "2025-06-17T10:00:00Z"
  }
}
```

### Get Room Users

```http
GET /api/rooms/:roomId/users
```

**Response:**
```json
{
  "success": true,
  "data": {
    "roomId": "room_67890",
    "users": [
      {
        "userId": "user_1",
        "role": "owner",
        "joinedAt": "2025-06-17 10:00:00",
        "lastActive": "2025-06-17 10:30:00"
      },
      {
        "userId": "user_2",
        "role": "member", 
        "joinedAt": "2025-06-17 10:15:00",
        "lastActive": "2025-06-17 10:25:00"
      }
    ]
  }
}
```

---

## 🔧 WebSocket Integration (Socket.IO)

### Real-time Code Execution

Connect to Socket.IO for real-time code execution with interactive input support:

```javascript
import { io } from 'socket.io-client';

// Connect to execution namespace
const executionSocket = io('http://localhost:3000/execution');

// Start code execution
const executeCode = (code, language, sessionId) => {
  executionSocket.emit('start-execution', {
    code: code,
    language: language,
    sessionId: sessionId
  });
};

// Listen for session started
executionSocket.on('session-started', (data) => {
  console.log('Execution started:', data.sessionId);
});

// Listen for real-time output
executionSocket.on('output', (data) => {
  console.log('Output:', data.data);
  // data.type can be 'stdout' or 'stderr'
});

// Send input for interactive programs
const sendInput = (sessionId, input) => {
  executionSocket.emit('input', {
    sessionId: sessionId,
    input: input + '\n'
  });
};

// Listen for execution completion
executionSocket.on('execution-complete', (data) => {
  console.log('Execution completed:', data.exitCode);
});

// Handle errors
executionSocket.on('error', (error) => {
  console.error('Execution error:', error);
});
```

### Shared Terminal Access

Connect to the terminal namespace for collaborative terminal sessions:

```javascript
// Connect to terminal namespace
const terminalSocket = io('http://localhost:3000/terminal');

// Join a room's terminal
const joinTerminal = (roomId, userId) => {
  terminalSocket.emit('join-room-terminal', {
    roomId: roomId,
    userId: userId
  });
};

// Listen for terminal ready
terminalSocket.on('terminal-ready', (data) => {
  console.log('Terminal ready for room:', data.roomId);
});

// Send terminal commands
const sendCommand = (sessionId, command) => {
  terminalSocket.emit('terminal-input', {
    sessionId: sessionId,
    input: command + '\n'
  });
};

// Receive terminal output
terminalSocket.on('terminal-output', (data) => {
  console.log('Terminal output:', data.data);
});

// Handle terminal errors
terminalSocket.on('terminal-error', (error) => {
  console.error('Terminal error:', error);
});
```

### Socket.IO Events Reference

#### Execution Namespace (`/execution`)

**Client → Server:**
- `start-execution` - Start code execution
- `input` - Send input to running program
- `terminate-session` - Stop execution

**Server → Client:**
- `session-started` - Execution session started
- `output` - Real-time program output
- `execution-complete` - Program finished
- `session-terminated` - Session manually terminated
- `error` - Execution error

#### Terminal Namespace (`/terminal`)

**Client → Server:**
- `join-room-terminal` - Join room's terminal
- `terminal-input` - Send terminal command
- `list-files` - List files in workspace

**Server → Client:**
- `terminal-ready` - Terminal session ready
- `terminal-output` - Terminal output
- `file-list` - Response to list-files request
- `terminal-error` - Terminal error

### Get Terminal Connection Info

```http
GET /api/sessions/:sessionId/terminal
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "sess_12345",
    "roomId": "room_67890",
    "terminalEndpoint": "ws://localhost:3000/terminal",
    "protocol": "Socket.IO",
    "description": "Connect to shared terminal via Socket.IO",
    "namespace": "/terminal"
  }
}
```

---

## 🌍 Language Support

### Get Available Languages

```http
GET /api/languages/available
```

**Response:**
```json
{
  "success": true,
  "data": {
    "languages": [
      {
        "id": "python",
        "name": "Python",
        "version": "3.11",
        "extensions": [".py"],
        "tier": "free"
      },
      {
        "id": "javascript",
        "name": "JavaScript (Node.js)",
        "version": "20.x",
        "extensions": [".js", ".mjs"],
        "tier": "free"
      },
      {
        "id": "go",
        "name": "Go",
        "version": "1.21",
        "extensions": [".go"],
        "tier": "pro"
      },
      {
        "id": "cpp",
        "name": "C++",
        "version": "gcc 13",
        "extensions": [".cpp", ".cc", ".cxx"],
        "tier": "pro"
      },
      {
        "id": "java",
        "name": "Java",
        "version": "21",
        "extensions": [".java"],
        "tier": "enterprise"
      },
      {
        "id": "rust",
        "name": "Rust",
        "version": "1.75",
        "extensions": [".rs"],
        "tier": "enterprise"
      }
    ]
  }
}
```

---

## 📱 Frontend Integration Examples

### React Hook for Session Management

```javascript
import { useState, useEffect } from 'react';

const useCodeSession = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const initializeSession = async (sessionType, options = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/sessions/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'current-user-id',
          'x-user-tier': 'free'
        },
        body: JSON.stringify({
          sessionType,
          ...options
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSession(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const executeCode = async (code, input) => {
    if (!session) throw new Error('No active session');
    
    const response = await fetch(`/api/sessions/${session.sessionId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'current-user-id'
      },
      body: JSON.stringify({ 
        code: code,
        input: input  // Optional input for interactive programs
      })
    });
    
    return response.json();
  };

  return {
    session,
    loading,
    error,
    initializeSession,
    executeCode
  };
};
```

### Vue.js Composable

```javascript
import { ref, reactive } from 'vue';

export function useCodeEditor() {
  const session = ref(null);
  const loading = ref(false);
  const error = ref(null);

  const createSoloSession = async (language) => {
    loading.value = true;
    try {
      const response = await fetch('/api/sessions/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': getCurrentUserId(),
          'x-user-tier': getUserTier()
        },
        body: JSON.stringify({
          sessionType: 'solo',
          language
        })
      });
      
      const result = await response.json();
      session.value = result.data;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const createRoom = async (languages, roomName, maxUsers = 5) => {
    loading.value = true;
    try {
      const response = await fetch('/api/sessions/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': getCurrentUserId(),
          'x-user-tier': getUserTier()
        },
        body: JSON.stringify({
          sessionType: 'room',
          languages,
          roomName,
          maxUsers
        })
      });
      
      const result = await response.json();
      session.value = result.data;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  return {
    session,
    loading,
    error,
    createSoloSession,
    createRoom
  };
}
```

---

## 🔌 WebSocket Message Types

### Execution Messages

**Send:**
```json
{
  "type": "execute",
  "sessionId": "sess_12345",
  "code": "print('Hello')",
  "language": "python"
}
```

**Receive:**
```json
{
  "type": "execution_result",
  "sessionId": "sess_12345",
  "success": true,
  "output": "Hello\n",
  "error": null,
  "executionTime": 25
}
```

### Terminal Messages

**Send:**
```json
{
  "type": "input",
  "data": "ls -la\n"
}
```

**Receive:**
```json
{
  "type": "output",
  "data": "total 8\ndrwxr-xr-x 2 user user 4096 Jun 17 10:00 .\n"
}
```

---

## 🛠 User Tiers & Limitations

### Free Tier
- Solo sessions only
- Python, JavaScript support
- 30-second execution timeout
- 128MB memory limit

### Pro Tier
- Room sessions (up to 3 users)
- Python, JavaScript, Go, C++ support
- 60-second execution timeout
- 256MB memory limit

### Enterprise Tier
- Room sessions (up to 10 users)
- All languages (including Java, Rust)
- 120-second execution timeout
- 512MB memory limit
- Shared terminal access
- File persistence

---

## 🚨 Error Handling

### Common Error Responses

```json
{
  "success": false,
  "error": "Session not found",
  "code": "SESSION_NOT_FOUND"
}
```

```json
{
  "success": false,
  "error": "Language not supported for your tier",
  "code": "LANGUAGE_TIER_RESTRICTION",
  "availableLanguages": ["python", "javascript"]
}
```

```json
{
  "success": false,
  "error": "Room is full",
  "code": "ROOM_FULL",
  "maxUsers": 5,
  "currentUsers": 5
}
```

### Error Codes Reference

| Code | Description | Solution |
|------|-------------|----------|
| `SESSION_NOT_FOUND` | Session doesn't exist | Create new session |
| `LANGUAGE_TIER_RESTRICTION` | Language not available for user tier | Upgrade tier or use different language |
| `ROOM_FULL` | Room has reached max capacity | Wait or create new room |
| `EXECUTION_TIMEOUT` | Code execution took too long | Optimize code or upgrade tier |
| `MEMORY_LIMIT_EXCEEDED` | Code used too much memory | Optimize memory usage |
| `INVALID_SESSION_TYPE` | Invalid sessionType provided | Use 'solo' or 'room' |
| `CONTAINER_ERROR` | Docker container issue | Retry or contact support |

---

## 📊 Rate Limits

### Per User Limits

| Tier | Requests/min | Sessions | Execution/min |
|------|-------------|----------|---------------|
| Free | 60 | 1 | 10 |
| Pro | 120 | 3 | 30 |
| Enterprise | 300 | 10 | 100 |

---

## 🧪 Testing Your Integration

### Example Test Suite (Jest)

```javascript
describe('Code Editor API', () => {
  test('should create solo session', async () => {
    const response = await fetch('/api/sessions/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user',
        'x-user-tier': 'free'
      },
      body: JSON.stringify({
        sessionType: 'solo',
        language: 'python'
      })
    });
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data.sessionType).toBe('solo');
  });

  test('should execute Python code', async () => {
    // First create session
    const sessionResponse = await createSession();
    const sessionId = sessionResponse.data.sessionId;
    
    // Then execute code
    const response = await fetch(`/api/sessions/${sessionId}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'test-user'
      },
      body: JSON.stringify({
        code: 'print("Hello, Test!")',
        language: 'python'
      })
    });
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data.output).toContain('Hello, Test!');
  });
});
```

---

## 🔗 Useful Links

- **Health Check**: `GET /health`
- **WebSocket Endpoint**: `ws://localhost:3000`
- **Terminal WebSocket**: `ws://localhost:3000/terminal/:roomId`

---

## 🆘 Support & Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure backend is running on port 3000
2. **WebSocket Fails**: Check firewall settings and WebSocket support
3. **Docker Errors**: Ensure Docker is running and accessible
4. **Session Timeout**: Sessions expire after 1 hour of inactivity

### Debug Mode

Add debug headers to see detailed information:

```javascript
headers: {
  'x-debug': 'true',
  'x-verbose': 'true'
}
```

---

## 🚀 What's Next?

- File management endpoints
- Real-time collaboration features
- Code sharing and version control
- Advanced debugging tools
- Performance analytics

Happy coding! 🎉
