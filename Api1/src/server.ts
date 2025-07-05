import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import router from './routes';
import { errorHandler } from './middleware/errorHandler';
import WebSocketExecutionService from './services/websocketExecutionService';
import { setWebSocketService } from './controllers/websocketController';
import SharedTerminalService from './services/sharedTerminalService';
import { initDatabase } from './database';
import { ImageManager } from './services/imageManager';

const app = express();
const port = process.env.PORT || 3003;

// Create HTTP server for WebSocket integration
const server = createServer(app);

// Initialize database and Docker images
const initializeApp = async () => {
    try {
        // Initialize database first
        await initDatabase();
        console.log('Database initialized successfully');
        
        // Initialize optimized Docker images (graceful failure)
        console.log('Checking Docker images...');
        try {
            const imageManager = ImageManager.getInstance();
            await imageManager.initializeImages();
            console.log('Docker images ready');
        } catch (dockerError: any) {
            console.warn('⚠️  Docker initialization failed:', dockerError.message);
            console.warn('⚠️  Code execution will use fallback mode without containers');
            console.warn('⚠️  To enable full functionality, please start Docker Desktop');
        }
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        // Don't exit the process - continue running without Docker
        console.warn('⚠️  Application started with limited functionality');
    }
};

// Initialize shared Socket.IO server
import { Server as SocketIOServer } from 'socket.io';
const io = new SocketIOServer(server, {
    cors: {
        origin: "*", // Configure this for production
        methods: ["GET", "POST"]
    }
});

// Initialize WebSocket service with shared Socket.IO instance
const wsService = new WebSocketExecutionService(server, io);
setWebSocketService(wsService);

// Initialize shared terminal service with shared Socket.IO instance
const sharedTerminalService = new SharedTerminalService(server, io);
console.log('Shared terminal service initialized');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', router);

// Error handling
app.use(errorHandler);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        websocket: 'enabled',
        sharedTerminal: 'enabled',
        activeSessions: wsService.getActiveSessions().length,
        database: 'connected'
    });
});

// Docker health check endpoint
app.get('/health/docker', async (req, res) => {
    try {
        const Dockerode = require('dockerode');
        const dockerConfig = process.platform === 'win32' 
            ? { socketPath: '//./pipe/docker_engine' }
            : { socketPath: '/var/run/docker.sock' };
        const docker = new Dockerode(dockerConfig);
        
        await docker.ping();
        res.json({ 
            status: 'healthy', 
            docker: true, 
            message: 'Docker is running and accessible' 
        });
    } catch (error: any) {
        res.status(503).json({ 
            status: 'unhealthy', 
            docker: false, 
            message: 'Docker is not running or accessible',
            error: error.message 
        });
    }
});

// Start server
const startServer = async () => {
    await initializeApp();
    
    server.listen(port, () => {
        console.log(`Server running on port ${port}`);
        console.log('Supported languages: Python, JavaScript, Go, C++, Java, Rust');
        console.log('WebSocket enabled for interactive execution');
        console.log('Shared terminal service enabled for collaborative rooms');
        console.log('Session-based API ready');
        console.log('Multi-language shared containers supported');
        console.log('Database initialized with room management support');
    });
};

startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
