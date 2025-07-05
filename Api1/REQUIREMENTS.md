# API1 - Code Editor Service Requirements

## Node.js Dependencies

Install all dependencies:
```bash
npm install
```

## System Requirements
- **Node.js**: 18+ (LTS recommended)
- **Docker Desktop**: Required for code execution
- **SQLite**: Included with Node.js

## Dependencies
- **Express**: ^5.1.0 - Web framework
- **Socket.io**: ^4.8.1 - WebSocket support
- **Dockerode**: ^4.0.7 - Docker API client
- **SQLite3**: ^5.1.7 - Database
- **TypeScript**: ^5.8.3 - Type checking
- **UUID**: ^11.1.0 - ID generation
- **CORS**: ^2.8.5 - Cross-origin requests

## Docker Images Required
The following Docker images must be built for code execution:
```bash
docker build -f docker/python/Dockerfile -t leviathan-python-optimized:latest .
docker build -f docker/javascript/Dockerfile -t leviathan-node-optimized:latest .
docker build -f docker/go/Dockerfile -t leviathan-go-optimized:latest .
docker build -f docker/cpp/Dockerfile -t leviathan-cpp-optimized:latest .
docker build -f docker/java/Dockerfile -t leviathan-java-optimized:latest .
```

## Scripts
```bash
npm run build    # Build TypeScript to JavaScript
npm start        # Start production server (http://localhost:3003)
npm run dev      # Start development server with auto-reload
```

## Environment Variables
Create `.env` file:
```
PORT=3003
WS_URL=ws://localhost:3003
DOCKER_HOST=npipe:////./pipe/docker_engine  # Windows
# DOCKER_HOST=unix:///var/run/docker.sock   # Linux/Mac
```

## Supported Languages
- Python 3.11+
- JavaScript (Node.js 18+)
- Go 1.19+
- C++ (GCC 11+)
- Java 11+

## API Endpoints
- `GET /api/languages/available` - Get supported languages
- `POST /api/sessions/init` - Create new session
- `POST /api/sessions/:id/execute` - Execute code
- `DELETE /api/sessions/:id` - Terminate session
- `GET /api/rooms` - List collaborative rooms
- `POST /api/rooms` - Create new room

## WebSocket Events
- `join-session` - Join a session
- `code-update` - Real-time code updates
- `execution-result` - Code execution results
