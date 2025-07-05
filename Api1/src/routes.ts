import express, { Router, RequestHandler } from 'express';
import { executeCode } from './controllers/codeExecutionController';
import {
  getSupportedLanguagesController,
  getLanguagesByTierController,
  createDynamicContainer,
  executeCodeInContainer,
  getContainerStatus,
  destroyContainer,
  listContainers,
  executeCodeTransient
} from './controllers/dynamicCodeController';
import {
  getActiveSessions,
  getSessionInfo,
  terminateSession,
  createSessionEndpoint,
  getWebSocketInfo
} from './controllers/websocketController';
import sessionController from './controllers/sessionController';
import {
  executeEnhancedCode,
  executeInteractiveCode,
  installPackages,
  getSupportedLanguages as getEnhancedSupportedLanguages,
  getLanguageInfo,
  testCodeExecution
} from './controllers/enhancedCodeController';

const router: Router = express.Router();

// Health endpoints
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Code Editor API', timestamp: new Date().toISOString() });
});

router.get('/health/docker', async (req, res) => {
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

// === NEW SESSION-BASED API ===
// Session management endpoints (new session-based API)
router.post('/sessions/init', sessionController.initializeSession as RequestHandler);
router.post('/sessions/join/:roomId', sessionController.joinRoom as RequestHandler);  
router.post('/sessions/:sessionId/execute', sessionController.executeCode as RequestHandler);
router.get('/sessions/:sessionId', sessionController.getSession as RequestHandler);
router.get('/sessions/user/active', sessionController.getUserSessions as RequestHandler);
router.delete('/sessions/:sessionId', sessionController.terminateSession as RequestHandler);

// Admin endpoints
router.post('/sessions/admin/cleanup', sessionController.triggerCleanup as RequestHandler);

// Room management
router.get('/rooms', sessionController.getRooms as RequestHandler);
router.get('/rooms/:roomId', sessionController.getRoomInfo as RequestHandler);
router.get('/rooms/:roomId/users', sessionController.getRoomUsers as RequestHandler);

// Terminal access endpoints
router.get('/sessions/:sessionId/terminal', (req, res) => {
    const { sessionId } = req.params;
    res.json({
        success: true,
        data: {
            sessionId,
            terminalEndpoint: 'ws://localhost:3000/terminal',
            protocol: 'Socket.IO',
            namespace: '/terminal',
            description: 'Connect to shared terminal via Socket.IO'
        }
    });
});

// Shared terminal endpoints (WebSocket connections handled by SharedTerminalService)
router.get('/rooms/:roomId/terminal/info', (req, res) => {
    const { roomId } = req.params;
    res.json({
        success: true,
        data: {
            roomId,
            terminalEndpoint: `/terminal/${roomId}`,
            protocol: 'ws',
            description: 'Connect to shared terminal via WebSocket'
        }
    });
});

// Language discovery
router.get('/languages/available', sessionController.getAvailableLanguages as RequestHandler);

// === LEGACY ENDPOINTS (backward compatibility) ===
// Legacy endpoint (keep for backward compatibility)
router.post('/execute', executeCode as RequestHandler);

// Language information endpoints
router.get('/languages', getSupportedLanguagesController as RequestHandler);
router.get('/languages/tier/:tier', getLanguagesByTierController as RequestHandler);

// Container management endpoints
router.post('/containers', createDynamicContainer as RequestHandler);
router.get('/containers', listContainers as RequestHandler);
router.get('/containers/:containerId/status', getContainerStatus as RequestHandler);
router.delete('/containers/:containerId', destroyContainer as RequestHandler);

// Code execution endpoints
router.post('/containers/execute', executeCodeInContainer as RequestHandler);
router.post('/execute/transient', executeCodeTransient as RequestHandler);

// WebSocket interactive execution endpoints
router.get('/websocket/info', getWebSocketInfo as RequestHandler);
router.post('/websocket/session', createSessionEndpoint as RequestHandler);
router.get('/websocket/sessions', getActiveSessions as RequestHandler);
router.get('/websocket/sessions/:sessionId', getSessionInfo as RequestHandler);
router.delete('/websocket/sessions/:sessionId', terminateSession as RequestHandler);

// === ENHANCED CODE EXECUTION API ===
// Advanced code execution with full language support (loops, functions, imports)
router.post('/enhanced-execution/execute', executeEnhancedCode as RequestHandler);
router.post('/enhanced-execution/interactive', executeInteractiveCode as RequestHandler);
router.post('/enhanced-execution/install-packages', installPackages as RequestHandler);
router.get('/enhanced-execution/languages', getEnhancedSupportedLanguages as RequestHandler);
router.get('/enhanced-execution/languages/:language', getLanguageInfo as RequestHandler);
router.post('/enhanced-execution/test', testCodeExecution as RequestHandler);

// Room-based enhanced execution (requires room terminal)
router.post('/rooms/:roomId/enhanced-execution/execute', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { code, language, packages, fileName, input, timeout } = req.body;
        
        if (!code || !language) {
            res.status(400).json({ error: 'Code and language are required' });
            return;
        }
        
        // This would integrate with SharedTerminalService
        res.json({
            success: true,
            message: 'Room-based enhanced execution endpoint (implement with SharedTerminalService)',
            data: { roomId, language, codeLength: code.length }
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Room execution failed', details: error.message });
    }
});

// === SESSION-BASED API (existing) ===
export default router;
