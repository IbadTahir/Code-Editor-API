import { Request, Response } from 'express';
import SessionService from '../services/sessionService';
import { dbHelpers } from '../database';

let sessionService: SessionService | null = null;

function getSessionService(): SessionService {
    if (!sessionService) {
        sessionService = new SessionService();
    }
    return sessionService;
}

interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        tier: 'free' | 'pro' | 'enterprise';
    };
}

/**
 * Initialize a new session (solo or room)
 * POST /api/sessions/init
 */
export const initializeSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        console.log('=== Session Initialization Started ===');
        const { language, languages, sessionType, roomName, maxUsers } = req.body;
        console.log('Request body:', { language, languages, sessionType, roomName, maxUsers });
        
        // For now, mock user data (in real app, get from JWT token)
        const userId = req.headers['x-user-id'] as string || 'demo-user';
        const userTier = (req.headers['x-user-tier'] as 'free' | 'pro' | 'enterprise') || 'free';
        console.log('User info:', { userId, userTier });

        if (!sessionType) {
            console.log('Missing session type');
            res.status(400).json({ 
                error: 'sessionType is required',
                validSessionTypes: ['solo', 'room']
            });
            return;
        }

        if (!['solo', 'room'].includes(sessionType)) {
            console.log('Invalid session type:', sessionType);
            res.status(400).json({ 
                error: 'Invalid sessionType',
                validSessionTypes: ['solo', 'room']
            });
            return;
        }

        // Validate based on session type
        if (sessionType === 'solo') {
            if (!language) {
                console.log('Missing language for solo session');
                res.status(400).json({ 
                    error: 'language is required for solo sessions' 
                });
                return;
            }
        } else if (sessionType === 'room') {
            if (!languages || !Array.isArray(languages) || languages.length === 0) {
                console.log('Missing or invalid languages for room session');
                res.status(400).json({ 
                    error: 'languages array is required for room sessions and must contain at least one language' 
                });
                return;
            }
            if (!roomName) {
                console.log('Missing room name for room session');
                res.status(400).json({ 
                    error: 'roomName is required for room sessions' 
                });
                return;
            }
        }

        console.log('Calling sessionService.initializeSession...');
        const sessionResponse = await getSessionService().initializeSession({
            userId,
            language: sessionType === 'solo' ? language : undefined,
            languages: sessionType === 'room' ? languages : undefined,
            sessionType,
            roomName,
            userTier,
            maxUsers
        });
        console.log('Session initialized successfully:', sessionResponse.sessionId);

        res.status(201).json({
            success: true,
            data: sessionResponse,
            message: `${sessionType} session initialized successfully`
        });

    } catch (error: any) {
        console.error('Error initializing session:', error);
        res.status(500).json({ 
            error: 'Failed to initialize session',
            details: error.message 
        });
    }
};

/**
 * Get all active rooms with pagination
 * GET /api/rooms?page=1&limit=10&search=term
 */
export const getRooms = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string || '';

        console.log(`Getting rooms - page: ${page}, limit: ${limit}, search: "${search}"`);

        const result = await getSessionService().getAllRooms(page, limit, search);

        res.json({
            success: true,
            data: {
                rooms: result.rooms,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / limit)
                }
            }
        });

    } catch (error: any) {
        console.error('Error getting rooms:', error);
        res.status(500).json({ 
            error: 'Failed to get rooms',
            details: error.message 
        });
    }
};

/**
 * Join an existing room
 * POST /api/sessions/join/:roomId
 */
export const joinRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { roomId } = req.params;
        const userId = req.headers['x-user-id'] as string || 'demo-user';
        const userTier = (req.headers['x-user-tier'] as 'free' | 'pro' | 'enterprise') || 'free';

        console.log(`User ${userId} joining room ${roomId}`);

        const session = await getSessionService().joinExistingRoom(roomId, userId, userTier);

        res.json({
            success: true,
            data: session
        });

    } catch (error: any) {
        console.error('Error joining room:', error);
        res.status(500).json({ 
            error: 'Failed to join room',
            details: error.message 
        });
    }
};

/**
 * Execute code in a session
 * POST /api/sessions/:sessionId/execute
 */
export const executeCode = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;
        const { code, input, language } = req.body;

        if (!sessionId) {
            res.status(400).json({ error: 'Session ID is required' });
            return;
        }

        if (!code) {
            res.status(400).json({ error: 'Code is required' });
            return;
        }

        const result = await getSessionService().executeCodeInSession(sessionId, code, input, language);

        res.json({
            success: true,
            data: {
                sessionId,
                output: result.output,
                error: result.error,
                executionTime: result.executionTime,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Error executing code:', error);
        const statusCode = error.message.includes('not found') ? 404 : 
                          error.message.includes('not ready') ? 409 : 500;
        
        res.status(statusCode).json({ 
            error: 'Failed to execute code',
            details: error.message 
        });
    }
};

/**
 * Get session information
 * GET /api/sessions/:sessionId
 */
export const getSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            res.status(400).json({ error: 'Session ID is required' });
            return;
        }

        const session = await getSessionService().getSession(sessionId);

        if (!session) {
            res.status(404).json({ error: 'Session not found' });
            return;
        }

        res.json({
            success: true,
            data: session
        });

    } catch (error: any) {
        console.error('Error getting session:', error);
        res.status(500).json({ 
            error: 'Failed to get session',
            details: error.message 
        });
    }
};

/**
 * Get user's active sessions
 * GET /api/sessions/user/active
 */
export const getUserSessions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.headers['x-user-id'] as string || 'demo-user';

        const sessions = await getSessionService().getUserSessions(userId);

        res.json({
            success: true,
            data: {
                userId,
                activeSessions: sessions.length,
                sessions
            }
        });

    } catch (error: any) {
        console.error('Error getting user sessions:', error);
        res.status(500).json({ 
            error: 'Failed to get user sessions',
            details: error.message 
        });
    }
};

/**
 * Terminate a session
 * DELETE /api/sessions/:sessionId
 */
export const terminateSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            res.status(400).json({ error: 'Session ID is required' });
            return;
        }

        await getSessionService().terminateSession(sessionId);

        res.json({
            success: true,
            message: 'Session terminated successfully'
        });

    } catch (error: any) {
        console.error('Error terminating session:', error);
        res.status(500).json({ 
            error: 'Failed to terminate session',
            details: error.message 
        });
    }
};

/**
 * Get room information
 * GET /api/rooms/:roomId
 */
export const getRoomInfo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { roomId } = req.params;

        console.log(`Getting room info for ${roomId}`);

        const roomInfo = await getSessionService().getRoomDetails(roomId);

        res.json({
            success: true,
            data: roomInfo
        });

    } catch (error: any) {
        console.error('Error getting room info:', error);
        res.status(500).json({ 
            error: 'Failed to get room info',
            details: error.message 
        });
    }
};

/**
 * Get room users/participants
 * GET /api/rooms/:roomId/users
 */
export const getRoomUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { roomId } = req.params;

        console.log(`Getting users for room ${roomId}`);

        const users = await getSessionService().getRoomParticipants(roomId);

        res.json({
            success: true,
            data: users
        });

    } catch (error: any) {
        console.error('Error getting room users:', error);
        res.status(500).json({ 
            error: 'Failed to get room users',
            details: error.message 
        });
    }
};

/**
 * Get available languages for user tier
 * GET /api/languages/available
 */
export const getAvailableLanguages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userTier = (req.headers['x-user-tier'] as 'free' | 'pro' | 'enterprise') || 'free';
        const { languageTiers } = await import('../config/dynamicLanguages');
        
        const tierAccess = {
            free: ['low'],
            pro: ['low', 'medium'],
            enterprise: ['low', 'medium', 'high']
        };

        const allowedTiers = tierAccess[userTier] || ['low'];
        
        const availableLanguages = Object.entries(languageTiers)
            .filter(([_, config]) => config.active && allowedTiers.includes(config.cost))
            .map(([language, config]) => ({
                language,
                displayName: config.name,
                version: 'latest',
                tier: config.cost,
                description: `${config.name} runtime environment`,
                extensions: [config.fileExtension]
            }));

        res.json({
            success: true,
            data: {
                userTier,
                availableLanguages,
                totalLanguages: availableLanguages.length
            }
        });

    } catch (error: any) {
        console.error('Error getting available languages:', error);
        res.status(500).json({ 
            error: 'Failed to get available languages',
            details: error.message 
        });
    }
};

/**
 * Manually trigger cleanup of expired sessions and containers
 * POST /api/sessions/admin/cleanup
 */
export const triggerCleanup = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        console.log('Manual cleanup triggered');

        const result = await getSessionService().triggerCleanup();

        res.json({
            success: true,
            message: 'Cleanup completed',
            data: {
                cleanedSessions: result.cleanedSessions,
                cleanedRooms: result.cleanedRooms,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Error triggering cleanup:', error);
        res.status(500).json({ 
            error: 'Failed to trigger cleanup',
            details: error.message 
        });
    }
};

export default {
    initializeSession,
    getRooms,
    joinRoom,
    executeCode,
    getSession,
    getUserSessions,
    terminateSession,
    getRoomInfo,
    getRoomUsers,
    getAvailableLanguages,
    triggerCleanup
};
