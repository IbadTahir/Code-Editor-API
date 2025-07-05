# Code Editor Backend

A comprehensive code execution API providing dynamic Docker container management for multiple programming languages with both solo and shared collaborative environments.

## 🚀 Features

- **Dual Session Types**: Solo (transient) and Shared (persistent collaborative) containers
- **Multi-Language Support**: 12+ programming languages with optimized execution environments
- **Real-time Terminal**: WebSocket-based secure terminal access for shared containers
- **Role-based Access**: Admin controls for shared container management
- **Resource Management**: Tiered resource allocation (low/medium/high cost)
- **Auto-cleanup**: Intelligent container lifecycle management
- **Security First**: Sandboxed containers with resource limits and input sanitization

## 📋 Supported Languages

### Low-Cost Tier (Fast startup, lightweight)
- **Python** (256MB, 10s timeout) - `python:3.11-slim`
- **JavaScript/Node.js** (256MB, 10s timeout) - `node:18-slim`
- **Go** (200MB, 8s timeout) - `golang:1.21-alpine`
- **Lua** (128MB, 8s timeout)

### Medium-Cost Tier 
- **C++** (300MB, 20s timeout) - `gcc:latest`
- **Java** (512MB, 15s timeout) - `openjdk:17-slim`
- **Rust** (400MB, 20s timeout)
- **PHP** (256MB, 12s timeout)

### High-Cost Tier (Specialized environments)
- **R** (1GB, 30s timeout)
- **Julia** (1GB, 30s timeout)

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Apps   │───▶│   Express API    │───▶│  Docker Engine  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                          │
                              ▼                          ▼
                       ┌─────────────┐           ┌─────────────┐
                       │  SQLite DB  │           │ Containers  │
                       │ Sessions    │           │ • Solo      │
                       │ Rooms       │           │ • Shared    │
                       │ Users       │           │ • Terminal  │
                       └─────────────┘           └─────────────┘
                              │
                              ▼
                       ┌─────────────┐
                       │ WebSocket   │
                       │ Terminal    │
                       │ Sessions    │
                       └─────────────┘
```

## 🚦 Quick Start

### Prerequisites
- Node.js 16+
- Docker Engine
- Docker socket accessible at `/var/run/docker.sock`

### Installation

```bash
# Clone and install
cd Code-editor-backend
npm install

# Build optimized Docker images
chmod +x build-optimized-images.sh
./build-optimized-images.sh

# Start the server
npm run dev
```

### Basic Usage

```javascript
// Solo session - execute Python code
const response = await fetch('/api/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    language: 'python',
    code: 'print("Hello World!")'
  })
});

// Shared session - create collaborative environment
const sessionResponse = await fetch('/api/sessions/init', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionType: 'room',
    language: 'python',
    roomName: 'my-coding-room'
  })
});
```

## 📖 API Reference

### Core Endpoints

#### Session Management
- `POST /api/sessions/init` - Initialize solo or shared session
- `POST /api/sessions/join/:roomId` - Join existing shared session
- `POST /api/sessions/:sessionId/execute` - Execute code in session
- `GET /api/sessions/:sessionId` - Get session details
- `DELETE /api/sessions/:sessionId` - Terminate session

#### Language Discovery
- `GET /api/languages` - List all supported languages
- `GET /api/languages/tier/:tier` - Get languages by resource tier
- `GET /api/languages/available` - Get currently available languages

#### Container Management
- `POST /api/containers` - Create dynamic container
- `GET /api/containers` - List active containers
- `DELETE /api/containers/:id` - Remove container

#### Legacy Execution
- `POST /api/execute` - Simple code execution (backward compatibility)

### WebSocket Terminal (Shared Containers)

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Connect to shared container terminal
socket.emit('join-room', { roomId: 'room-123' });

// Send terminal commands
socket.emit('terminal-input', { 
  roomId: 'room-123', 
  command: 'ls -la\n' 
});

// Receive terminal output
socket.on('terminal-output', (data) => {
  console.log(data.output);
});
```

## 🏗️ Project Structure

```
src/
├── controllers/          # Request handlers
│   ├── sessionController.ts
│   ├── codeExecutionController.ts
│   └── websocketController.ts
├── services/            # Business logic
│   ├── sessionService.ts
│   ├── dockerService.ts
│   ├── dynamicDockerService.ts
│   └── websocketExecutionService.ts
├── database/            # SQLite database
│   └── index.ts
├── config/             # Configuration
│   └── dynamicLanguages.ts
└── utils/              # Utilities
    ├── languageConfigs.ts
    └── validators.ts

docker/                 # Optimized container images
├── python/
├── javascript/
├── cpp/
└── java/
```

## 🔧 Configuration

### Environment Variables

```bash
PORT=3000                    # Server port
WS_URL=ws://localhost:3000   # WebSocket URL
DB_PATH=./data/rooms.db      # SQLite database path
DOCKER_SOCKET=/var/run/docker.sock  # Docker socket
```

### Language Configuration

Each language has configurable resource limits:

```typescript
{
  name: 'Python',
  cost: 'low',           // Resource tier
  memoryLimit: '256m',   // Container memory limit
  cpuLimit: 0.5,         // CPU cores
  executionTimeout: 10000, // Max execution time (ms)
  concurrentLimit: 20,   // Max concurrent containers
  baseImage: 'python:3.11-slim',
  commonPackages: ['requests', 'numpy']
}
```

## 🔒 Security Features

### Container Security
- **Network isolation**: No external network access
- **Resource limits**: Memory, CPU, and timeout constraints
- **Privilege dropping**: `no-new-privileges` security option
- **Automatic cleanup**: Containers removed after use
- **File system isolation**: Read-only base system

### Input/Output Sanitization
- **Terminal escape sequence removal**
- **Control character filtering**
- **Output size limits** (50KB max)
- **Command injection prevention**

### Session Management
- **Role-based access control** (owner/admin/participant)
- **Session expiration** (configurable timeouts)
- **Resource quotas** per user tier
- **Audit logging** of all operations

## 🎯 Session Types Explained

### Solo Sessions (Transient)
- **Purpose**: Individual code execution
- **Lifecycle**: Container created → code executed → container destroyed
- **Storage**: No persistent storage
- **Use case**: Code testing, learning, demonstrations

### Shared Sessions (Persistent)
- **Purpose**: Collaborative development
- **Lifecycle**: Container created → multiple users join → collaborative work → manual cleanup
- **Storage**: Persistent file system within container
- **Terminal Access**: Full shell access via WebSocket
- **Use case**: Team coding, workshops, shared development environments

## 🛠️ Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
npm start
```

### Docker Development
```bash
# Build all optimized images
./build-optimized-images.sh

# Check container status
docker ps

# View container logs
docker logs <container-id>
```

## 📊 Monitoring & Debugging

### Health Check
```bash
curl http://localhost:3000/health
```

### Container Metrics
```bash
# Active sessions
GET /api/websocket/sessions

# Container status
GET /api/containers

# Room information
GET /api/rooms/:roomId
```

### Database Access
```bash
sqlite3 data/rooms.db
.schema
SELECT * FROM sessions WHERE is_active = 1;
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Check the API documentation in `/docs`
- Review container logs for debugging
- Open an issue on GitHub

## 🗺️ Roadmap

- [ ] Authentication integration with external auth API
- [ ] Multi-language support for shared containers
- [ ] Advanced file management for shared sessions
- [ ] Resource usage analytics
- [ ] Container orchestration with Kubernetes
- [ ] Real-time collaboration features
- [ ] Code sharing and version control integration
