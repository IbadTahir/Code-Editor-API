import { Request, Response } from 'express';
import WebSocketExecutionService from '../services/websocketExecutionService';

// This will be injected from the main server
let wsService: WebSocketExecutionService;

export const setWebSocketService = (service: WebSocketExecutionService) => {
  wsService = service;
};

/**
 * Get all active WebSocket execution sessions
 */
export const getActiveSessions = async (req: Request, res: Response) => {
  try {
    if (!wsService) {
      return res.status(500).json({
        success: false,
        error: 'WebSocket service not initialized'
      });
    }

    const sessions = wsService.getActiveSessions();
    
    res.json({
      success: true,
      activeSessions: sessions,
      count: sessions.length
    });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active sessions'
    });
  }
};

/**
 * Get information about a specific session
 */
export const getSessionInfo = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!wsService) {
      return res.status(500).json({
        success: false,
        error: 'WebSocket service not initialized'
      });
    }

    const sessionInfo = wsService.getSessionInfo(sessionId);
    
    if (!sessionInfo) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: sessionInfo
    });
  } catch (error) {
    console.error('Error getting session info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session info'
    });
  }
};

/**
 * Terminate a specific WebSocket execution session
 */
export const terminateSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!wsService) {
      return res.status(500).json({
        success: false,
        error: 'WebSocket service not initialized'
      });
    }

    const terminated = await wsService.forceTerminateSession(sessionId);
    
    if (!terminated) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or already terminated'
      });
    }

    res.json({
      success: true,
      message: 'Session terminated successfully',
      sessionId
    });
  } catch (error) {
    console.error('Error terminating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to terminate session'
    });
  }
};

/**
 * Create a new WebSocket execution session endpoint
 * This provides session info for frontend to connect via WebSocket
 */
export const createSessionEndpoint = async (req: Request, res: Response) => {
  try {
    const { language, code } = req.body;

    if (!language || !code) {
      return res.status(400).json({
        success: false,
        error: 'Language and code are required'
      });
    }

    // Generate a session ID that frontend can use to connect
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      success: true,
      sessionId,
      websocketUrl: `/socket.io/?sessionId=${sessionId}`,
      instructions: {
        connect: 'Connect to the WebSocket endpoint',
        start: 'Send start-execution event with sessionId, language, and code',
        input: 'Send input event with sessionId and input data',
        terminate: 'Send terminate-session event with sessionId'
      },
      example: {
        startExecution: {
          event: 'start-execution',
          data: { sessionId, language, code }
        },
        sendInput: {
          event: 'input',
          data: { sessionId, input: 'user input here' }
        },
        terminate: {
          event: 'terminate-session',
          data: { sessionId }
        }
      }
    });
  } catch (error) {
    console.error('Error creating session endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session endpoint'
    });
  }
};

/**
 * Get WebSocket connection info and documentation
 */
export const getWebSocketInfo = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      websocket: {
        endpoint: '/socket.io/',
        events: {
          client_to_server: {
            'start-execution': {
              description: 'Start a new code execution session',
              data: {
                sessionId: 'string (optional, will be generated if not provided)',
                language: 'string (python, javascript, go, cpp, java)',
                code: 'string (the code to execute)'
              }
            },
            'input': {
              description: 'Send input to the running program',
              data: {
                sessionId: 'string',
                input: 'string (user input)'
              }
            },
            'terminate-session': {
              description: 'Terminate an active session',
              data: {
                sessionId: 'string'
              }
            }
          },
          server_to_client: {
            'session-started': {
              description: 'Emitted when execution session starts',
              data: {
                sessionId: 'string',
                language: 'string',
                message: 'string'
              }
            },
            'output': {
              description: 'Real-time program output',
              data: {
                type: 'stdout | stderr | warning',
                data: 'string (the output)'
              }
            },
            'execution-complete': {
              description: 'Emitted when program finishes',
              data: {
                sessionId: 'string',
                exitCode: 'number',
                message: 'string'
              }
            },
            'error': {
              description: 'Error during execution',
              data: {
                message: 'string (error description)'
              }
            },
            'session-terminated': {
              description: 'Session was terminated',
              data: {
                sessionId: 'string'
              }
            }
          }
        },
        security: {
          features: [
            'No network access in containers',
            'Limited memory and CPU',
            'Input sanitization',
            'Output filtering',
            'Automatic session cleanup',
            'Maximum session duration: 30 minutes'
          ]
        }
      }
    });
  } catch (error) {
    console.error('Error getting WebSocket info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get WebSocket info'
    });
  }
};
