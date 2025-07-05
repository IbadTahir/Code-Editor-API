import { v4 as uuidv4 } from 'uuid';
import { dbHelpers } from '../database';
import { DynamicDockerService } from './dynamicDockerService';
import { languageTiers, LanguageTier } from '../config/dynamicLanguages';

interface SessionInitRequest {
    userId: string;
    language?: string; // Single language for solo sessions
    languages?: string[]; // Multiple languages for room sessions
    sessionType: 'solo' | 'room';
    roomName?: string; // Only for room type
    userTier: 'free' | 'pro' | 'enterprise';
    maxUsers?: number; // Only for room type
}

interface SessionResponse {
    sessionId: string;
    sessionType: 'solo' | 'room';
    language?: string; // For solo sessions
    languages?: string[]; // For room sessions
    containerId: string;
    roomId?: string;
    roomName?: string;
    expiresAt: string;
    resourceTier: string;
    status: 'ready' | 'initializing' | 'error';
    websocketUrl?: string;
}

interface RoomInfo {
    roomId: string;
    name: string;
    language: string;
    createdAt: string;
    expiresAt: string;
    maxUsers: number;
    currentUsers: number;
    isActive: boolean;
    containerId?: string;
}

export class SessionService {
    private dockerService: DynamicDockerService | null = null;

    constructor() {
        // Initialize Docker service with better error handling
        this.initializeDockerService().catch(error => {
            console.error('Failed to initialize Docker service in constructor:', error);
        });
        
        // Clean expired sessions/rooms every 5 minutes
        setInterval(() => {
            this.cleanupExpiredSessions();
        }, 5 * 60 * 1000);

        // More aggressive cleanup for solo sessions - every 2 minutes
        setInterval(() => {
            this.cleanupIdleSoloSessions();
        }, 2 * 60 * 1000);
    }

    private async initializeDockerService(): Promise<void> {
        try {
            console.log('Initializing Docker service...');
            this.dockerService = DynamicDockerService.getInstance();
            console.log('DynamicDockerService initialized successfully');
        } catch (error) {
            console.error('Failed to initialize DynamicDockerService:', error);
            console.log('Proceeding without Docker service - some features may be limited');
            this.dockerService = null;
        }
    }

    /**
     * Initialize a new session (solo or room) with primed Docker environment
     */
    async initializeSession(request: SessionInitRequest): Promise<SessionResponse> {
        console.log('SessionService: initializeSession called', request);
        const sessionId = uuidv4();
        console.log('Generated session ID:', sessionId);
        
        // Validate input based on session type
        if (request.sessionType === 'solo') {
            if (!request.language) {
                throw new Error('Language is required for solo sessions');
            }
            // Validate language availability
            console.log('Getting language config for:', request.language, 'tier:', request.userTier);
            const languageConfig = this.getLanguageConfig(request.language, request.userTier);
            if (!languageConfig) {
                console.error(`Language ${request.language} not available for tier ${request.userTier}`);
                throw new Error(`Language ${request.language} not available for your tier`);
            }
            console.log('Language config found:', languageConfig.name);
        } else if (request.sessionType === 'room') {
            if (!request.languages || request.languages.length === 0) {
                throw new Error('At least one language is required for room sessions');
            }
            if (!request.roomName) {
                throw new Error('Room name is required for room sessions');
            }
            // Validate all languages
            for (const language of request.languages) {
                const languageConfig = this.getLanguageConfig(language, request.userTier);
                if (!languageConfig) {
                    throw new Error(`Language ${language} not available for your tier`);
                }
            }
        }

        // Calculate expiration time
        const expiresAt = this.calculateExpirationTime(request.sessionType, request.userTier);
        console.log('Session expires at:', expiresAt);
        
        try {
            let roomId: string | undefined;
            let roomName: string | undefined;

            // Handle room creation if needed
            if (request.sessionType === 'room') {
                roomId = uuidv4();
                roomName = request.roomName!;
                console.log('Creating room:', roomId, roomName);
                
                // For rooms, use the first language as primary language in the rooms table
                const primaryLanguage = request.languages![0];
                const primaryLanguageConfig = this.getLanguageConfig(primaryLanguage, request.userTier);
                
                await dbHelpers.createRoom({
                    id: roomId,
                    name: roomName,
                    language: primaryLanguage, // Primary language for room
                    creator_id: request.userId,
                    expires_at: expiresAt,
                    max_users: request.maxUsers || 10,
                    resource_tier: primaryLanguageConfig?.cost || 'medium'
                });
                console.log('Room created');
                
                // Add all languages to the room
                await dbHelpers.addLanguagesToRoom(roomId, request.languages!);
                console.log('Languages added to room:', request.languages);

                // Add creator to room
                await dbHelpers.addUserToRoom(roomId, request.userId, 'owner');
                console.log('Room created and user added');
            }

            // Create session record
            console.log('Creating session record in database');
            const sessionLanguage = request.sessionType === 'solo' ? request.language! : request.languages![0];
            const sessionLanguageConfig = this.getLanguageConfig(sessionLanguage, request.userTier);
            
            await dbHelpers.createSession({
                id: sessionId,
                user_id: request.userId,
                language: sessionLanguage,
                session_type: request.sessionType,
                room_id: roomId,
                expires_at: expiresAt,
                resource_tier: sessionLanguageConfig?.cost || 'medium'
            });
            console.log('Session record created');

            // Create primed Docker container
            console.log('Creating primed Docker container...');
            let containerId: string;
            
            try {
                if (request.sessionType === 'solo') {
                    // Solo session - create language-specific container
                    containerId = await this.createPrimedContainer(
                        sessionLanguage,
                        sessionLanguageConfig!,
                        sessionId
                    );
                } else {
                    // Room session - for now, create container using primary language
                    // TODO: Implement true multi-language shared containers later
                    containerId = await this.createPrimedContainer(
                        sessionLanguage,
                        sessionLanguageConfig!,
                        sessionId
                    );
                }
                console.log('Container created:', containerId);
            } catch (containerError: any) {
                console.error('Failed to create container:', containerError);
                throw new Error(`Failed to create execution environment: ${containerError.message}`);
            }

            // Update session and room with container ID
            console.log('Updating session with container ID');
            await dbHelpers.updateSessionContainer(sessionId, containerId);
            if (roomId) {
                await dbHelpers.updateRoomContainer(roomId, containerId);
            }
            console.log('Session updated with container ID');

            return {
                sessionId,
                sessionType: request.sessionType,
                language: request.sessionType === 'solo' ? sessionLanguage : undefined,
                languages: request.sessionType === 'room' ? request.languages : undefined,
                containerId,
                roomId,
                roomName,
                expiresAt,
                resourceTier: sessionLanguageConfig?.cost || 'medium',
                status: 'ready',
                websocketUrl: process.env.WS_URL || `ws://localhost:${process.env.PORT || 3003}`
            };

        } catch (error) {
            console.error('Error in initializeSession, cleaning up:', error);
            // Cleanup on failure
            await dbHelpers.deactivateSession(sessionId);
            throw error;
        }
    }

    /**
     * Join an existing room
     */
    async joinRoom(roomId: string, userId: string): Promise<SessionResponse> {
        // Check if room exists and is active
        const room = await dbHelpers.getRoomById(roomId);
        if (!room) {
            throw new Error('Room not found or expired');
        }

        // Check if user already has access
        let userAccess = await dbHelpers.checkUserRoomAccess(roomId, userId);
        if (!userAccess) {
            // Check room capacity
            const roomUsers = await dbHelpers.getRoomUsers(roomId);
            if (roomUsers.length >= room.max_users) {
                throw new Error('Room is full');
            }
            
            // Add user to room
            await dbHelpers.addUserToRoom(roomId, userId, 'participant');
        }

        // Create session for this user
        const sessionId = uuidv4();
        await dbHelpers.createSession({
            id: sessionId,
            user_id: userId,
            language: room.language,
            session_type: 'room',
            room_id: roomId,
            expires_at: room.expires_at,
            resource_tier: room.resource_tier
        });

        // Update session with existing container
        if (room.container_id) {
            await dbHelpers.updateSessionContainer(sessionId, room.container_id);
        }

        return {
            sessionId,
            sessionType: 'room',
            language: room.language,
            containerId: room.container_id,
            roomId: room.id,
            roomName: room.name,
            expiresAt: room.expires_at,
            resourceTier: room.resource_tier,
            status: room.container_id ? 'ready' : 'initializing',
            websocketUrl: process.env.WS_URL || `ws://localhost:${process.env.PORT || 3003}`
        };
    }

    /**
     * Get session information
     */
    async getSession(sessionId: string): Promise<SessionResponse | null> {
        const session = await dbHelpers.getSessionById(sessionId);
        if (!session) {
            return null;
        }

        let roomInfo = null;
        if (session.room_id) {
            roomInfo = await dbHelpers.getRoomById(session.room_id);
        }

        return {
            sessionId: session.id,
            sessionType: session.session_type,
            language: session.language,
            containerId: session.container_id,
            roomId: session.room_id,
            roomName: roomInfo?.name,
            expiresAt: session.expires_at,
            resourceTier: session.resource_tier,
            status: session.container_id ? 'ready' : 'initializing',
            websocketUrl: process.env.WS_URL || `ws://localhost:${process.env.PORT || 3003}`
        };
    }

    /**
     * Get room information with current users
     */
    async getRoomInfo(roomId: string): Promise<RoomInfo | null> {
        const room = await dbHelpers.getRoomById(roomId);
        if (!room) {
            return null;
        }

        const users = await dbHelpers.getRoomUsers(roomId);

        return {
            roomId: room.id,
            name: room.name,
            language: room.language,
            createdAt: room.created_at,
            expiresAt: room.expires_at,
            maxUsers: room.max_users,
            currentUsers: users.length,
            isActive: room.is_active,
            containerId: room.container_id
        };
    }

    /**
     * Terminate a session
     */
    async terminateSession(sessionId: string): Promise<void> {
        const session = await dbHelpers.getSessionById(sessionId);
        if (!session) {
            return;
        }

        // Cleanup container if it exists
        if (session.container_id && this.dockerService) {
            try {
                await this.dockerService.destroyContainer(session.container_id);
            } catch (error) {
                console.error('Error destroying container:', error);
            }
        }

        // Deactivate session
        await dbHelpers.deactivateSession(sessionId);

        // If this was a solo session or the last user in a room, cleanup room too
        if (session.session_type === 'solo' || 
            (session.room_id && (await dbHelpers.getRoomUsers(session.room_id)).length <= 1)) {
            await dbHelpers.deactivateRoom(session.room_id);
        }
    }

    /**
     * Get user's active sessions
     */
    async getUserSessions(userId: string): Promise<SessionResponse[]> {
        const sessions = await dbHelpers.getUserActiveSessions(userId);
        
        const sessionResponses: SessionResponse[] = [];
        for (const session of sessions) {
            let roomInfo = null;
            if (session.room_id) {
                roomInfo = await dbHelpers.getRoomById(session.room_id);
            }

            sessionResponses.push({
                sessionId: session.id,
                sessionType: session.session_type,
                language: session.language,
                containerId: session.container_id,
                roomId: session.room_id,
                roomName: roomInfo?.name,
                expiresAt: session.expires_at,
                resourceTier: session.resource_tier,
                status: session.container_id ? 'ready' : 'initializing',
                websocketUrl: process.env.WS_URL || `ws://localhost:${process.env.PORT || 3003}`
            });
        }

        return sessionResponses;
    }

    /**
     * Manually trigger cleanup - useful for testing or admin operations
     */
    async triggerCleanup(): Promise<{cleanedSessions: number, cleanedRooms: number}> {
        const expiredSessions = await dbHelpers.getExpiredSessions();
        const expiredRooms = await dbHelpers.getExpiredRooms();
        
        await this.cleanupExpiredSessions();
        await this.cleanupIdleSoloSessions();
        
        return {
            cleanedSessions: expiredSessions.length,
            cleanedRooms: expiredRooms.length
        };
    }

    /**
     * Execute code in a primed session
     */
    async executeCodeInSession(sessionId: string, code: string, input?: string, requestedLanguage?: string): Promise<any> {
        const session = await dbHelpers.getSessionById(sessionId);
        if (!session) {
            throw new Error('Session not found or expired');
        }

        // For room sessions, determine the actual language to use
        let executionLanguage = session.language;
        let containerId = session.container_id;

        // If this is a room session and a specific language is requested
        if (session.session_type === 'room' && requestedLanguage) {
            // Get room languages to verify the requested language is allowed
            const roomLanguages = await dbHelpers.getRoomLanguages(session.room_id);
            if (!roomLanguages.includes(requestedLanguage)) {
                throw new Error(`Language ${requestedLanguage} is not available in this room`);
            }
            
            executionLanguage = requestedLanguage;
            
            // For room sessions, we need a container for the requested language
            // Check if we have a container for this language in the room
            const languageConfig = this.getLanguageConfig(executionLanguage, 'pro');
            if (!languageConfig) {
                throw new Error(`Language ${executionLanguage} not available`);
            }
            
            // Create or get a container for this specific language
            containerId = await this.getOrCreateLanguageContainer(session.room_id, executionLanguage, languageConfig);
        }

        if (!containerId) {
            throw new Error('Session container not ready');
        }

        // Ensure Docker service is available
        const dockerService = this.ensureDockerService();

        try {
            // Verify the container exists
            const containerExists = await dockerService.verifyContainerExists(containerId);
            if (!containerExists) {
                console.log(`Container ${containerId} not found, recreating...`);
                
                const languageConfig = this.getLanguageConfig(executionLanguage, 'pro');
                if (!languageConfig) {
                    throw new Error(`Cannot recreate container: language ${executionLanguage} not available`);
                }
                
                containerId = await this.createPrimedContainer(executionLanguage, languageConfig, sessionId);
                
                // Update the session with the new container ID (for solo sessions)
                if (session.session_type === 'solo') {
                    await dbHelpers.updateSessionContainer(sessionId, containerId);
                }
                
                console.log(`Session ${sessionId} container recreated: ${containerId}`);
            }

            // Execute code in the appropriate container
            const result = await dockerService.executeCodeInContainer(
                containerId,
                code,
                input || ''
            );

            // For solo sessions, schedule aggressive cleanup after execution
            if (session.session_type === 'solo') {
                console.log(`Scheduling cleanup for solo session: ${sessionId}`);
                setTimeout(() => {
                    this.cleanupSoloSession(sessionId, containerId).catch((error: any) => {
                        console.error(`Error cleaning up solo session ${sessionId}:`, error);
                    });
                }, 2000);
            }

            return result;
        } catch (error: any) {
            console.error(`Error executing code in session ${sessionId}:`, error);
            
            // If it's a container-related error, try to recreate the container
            if (error.message.includes('no such container') || error.message.includes('container')) {
                console.log('Container error detected, attempting to recreate container...');
                try {
                    const languageConfig = this.getLanguageConfig(executionLanguage, 'pro');
                    
                    if (languageConfig) {
                        const newContainerId = await this.createPrimedContainer(executionLanguage, languageConfig, sessionId);
                        
                        if (session.session_type === 'solo') {
                            await dbHelpers.updateSessionContainer(sessionId, newContainerId);
                        }
                        
                        // Retry execution with new container
                        return await dockerService.executeCodeInContainer(newContainerId, code, input || '');
                    }
                } catch (recreateError: any) {
                    console.error('Failed to recreate container:', recreateError);
                    throw new Error('Container unavailable and recreation failed. Please refresh your session.');
                }
            }
            
            throw error;
        }
    }

    private async createPrimedContainer(
        language: string, 
        languageConfig: LanguageTier, 
        sessionId: string
    ): Promise<string> {
        console.log('Creating primed container for language:', language);
        
        // Check if Docker service is available
        this.ensureDockerService();
        
        // Ensure Docker service is available
        const dockerService = this.ensureDockerService();
        
        // Create container with the language configuration
        console.log('Calling dockerService.createDynamicContainer...');
        const containerId = await dockerService.createDynamicContainer({
            language,
            isPersistent: true,
            customPackages: languageConfig.commonPackages
        });
        console.log('Docker container created:', containerId);

        // Prime the container (install additional packages, set up environment, etc.)
        console.log('Priming container...');
        await this.primeContainer(containerId, language, languageConfig);
        console.log('Container primed successfully');

        return containerId;
    }

    private async primeContainer(
        containerId: string, 
        language: string, 
        config: LanguageTier
    ): Promise<void> {
        try {
            console.log(`Priming container ${containerId} for ${language}...`);
            
            // Check if dockerService is properly initialized
            if (!this.dockerService) {
                console.error('Docker service not initialized, skipping container priming');
                return;
            }
            
            // Language-specific priming commands
            const primingCommands = this.getPrimingCommands(language);
            
            for (let i = 0; i < primingCommands.length; i++) {
                const command = primingCommands[i];
                console.log(`Executing priming command ${i + 1}/${primingCommands.length}: ${command}`);
                try {
                    // Check if executeCommand method exists
                    if (typeof this.dockerService.executeCommand !== 'function') {
                        console.error('executeCommand method not available on dockerService');
                        break;
                    }
                    
                    await this.dockerService.executeCommand(containerId, command);
                    console.log(`Priming command ${i + 1} completed successfully`);
                } catch (commandError: any) {
                    console.error(`Priming command ${i + 1} failed: ${commandError.message}`);
                    // Continue with other commands - some priming failures are acceptable
                }
            }
            console.log(`Container ${containerId} priming completed`);
        } catch (error: any) {
            console.error(`Error priming container for ${language}:`, error);
            // Continue anyway - basic functionality should still work
        }
    }

    private getPrimingCommands(language: string): string[] {
        const commands: Record<string, string[]> = {
            python: [
                'pip install --no-cache-dir requests numpy pandas matplotlib seaborn',
                'mkdir -p /workspace/files',
                'echo "print(\\"Python environment ready!\\")" > /workspace/test.py'
            ],
            javascript: [
                'cd /workspace && npm init -y',
                'cd /workspace && npm install --no-save lodash axios moment',
                'mkdir -p /workspace/files',
                'echo "console.log(\\"JavaScript environment ready!\\")" > /workspace/test.js'
            ],
            go: [
                'go mod init workspace',
                'mkdir -p /workspace/files',
                'echo "package main\nfunc main() { println(\\"Go environment ready!\\") }" > /workspace/test.go'
            ],
            cpp: [
                'mkdir -p /workspace/files',
                'echo "#include <iostream>\nint main() { std::cout << \\"C++ environment ready!\\" << std::endl; return 0; }" > /workspace/test.cpp'
            ],
            java: [
                'mkdir -p /workspace/files',
                'echo "public class Test { public static void main(String[] args) { System.out.println(\\"Java environment ready!\\"); } }" > /workspace/Test.java'
            ]
        };

        return commands[language] || [];
    }

    private getLanguageConfig(language: string, userTier: string): LanguageTier | null {
        const languageConfig = languageTiers[language];
        if (!languageConfig || !languageConfig.active) {
            return null;
        }

        // Check if user tier has access to this language
        const tierAccess = {
            free: ['low'],
            pro: ['low', 'medium'],
            enterprise: ['low', 'medium', 'high']
        };

        const allowedTiers = tierAccess[userTier as keyof typeof tierAccess] || ['low'];
        if (!allowedTiers.includes(languageConfig.cost)) {
            return null;
        }

        return languageConfig;
    }

    private calculateExpirationTime(sessionType: string, userTier: string): string {
        const now = new Date();
        
        // Expiration times based on session type and user tier
        const expirationMinutes = {
            solo: {
                free: 30,
                pro: 60,
                enterprise: 120
            },
            room: {
                free: 60,
                pro: 240,    // 4 hours
                enterprise: 480 // 8 hours
            }
        };

        const minutes = expirationMinutes[sessionType as keyof typeof expirationMinutes]
                        [userTier as keyof typeof expirationMinutes.solo] || 30;
        
        now.setMinutes(now.getMinutes() + minutes);
        return now.toISOString();
    }

    private async cleanupExpiredSessions(): Promise<void> {
        try {
            console.log('Running cleanup for expired sessions...');
            
            // Get expired sessions with container IDs before marking them inactive
            const expiredSessions = await dbHelpers.getExpiredSessions();
            const expiredRooms = await dbHelpers.getExpiredRooms();
            
            console.log(`Found ${expiredSessions.length} expired sessions and ${expiredRooms.length} expired rooms`);
            
            // Clean up Docker containers for expired sessions
            for (const session of expiredSessions) {
                if (session.container_id && this.dockerService) {
                    try {
                        console.log(`Cleaning up container for expired session: ${session.id} (${session.session_type})`);
                        await this.dockerService.destroyContainer(session.container_id);
                    } catch (error: any) {
                        console.error(`Failed to cleanup container ${session.container_id} for session ${session.id}:`, error.message);
                    }
                }
            }
            
            // Clean up Docker containers for expired rooms
            for (const room of expiredRooms) {
                if (room.container_id && this.dockerService) {
                    try {
                        console.log(`Cleaning up container for expired room: ${room.id}`);
                        await this.dockerService.destroyContainer(room.container_id);
                    } catch (error: any) {
                        console.error(`Failed to cleanup container ${room.container_id} for room ${room.id}:`, error.message);
                    }
                }
            }
            
            // Mark sessions and rooms as inactive in database
            await dbHelpers.cleanExpiredSessions();
            await dbHelpers.cleanExpiredRooms();
            
            console.log('Cleanup completed');
        } catch (error: any) {
            console.error('Error cleaning up expired sessions:', error.message);
        }
    }

    /**
     * Aggressively cleanup solo session - destroy container and deactivate session
     */
    private async cleanupSoloSession(sessionId: string, containerId: string): Promise<void> {
        try {
            console.log(`Starting cleanup for solo session: ${sessionId}`);
            
            // First destroy the Docker container
            if (containerId && this.dockerService) {
                console.log(`Destroying container: ${containerId}`);
                await this.dockerService.destroyContainer(containerId);
                console.log(`Container destroyed: ${containerId}`);
            }

            // Then deactivate the session in database
            await dbHelpers.deactivateSession(sessionId);
            console.log(`Solo session cleaned up: ${sessionId}`);
            
        } catch (error: any) {
            console.error(`Failed to cleanup solo session ${sessionId}:`, error.message);
            // Don't throw - cleanup failures shouldn't affect user experience
        }
    }

    /**
     * Clean up solo sessions that are idle or close to expiration
     */
    private async cleanupIdleSoloSessions(): Promise<void> {
        try {
            console.log('Running cleanup for idle solo sessions...');
            
            // Get all active solo sessions that are close to expiration (within 5 minutes)
            const cutoffTime = new Date();
            cutoffTime.setMinutes(cutoffTime.getMinutes() + 5); // Clean up sessions expiring within 5 minutes
            
            const soloSessions = await dbHelpers.getSoloSessionsNearExpiration(cutoffTime.toISOString());
            
            console.log(`Found ${soloSessions.length} solo sessions near expiration`);
            
            for (const session of soloSessions) {
                if (session.container_id) {
                    console.log(`Proactively cleaning up solo session: ${session.id}`);
                    await this.cleanupSoloSession(session.id, session.container_id);
                }
            }
            
        } catch (error: any) {
            console.error('Error cleaning up idle solo sessions:', error.message);
        }
    }

    /**
     * Create a shared multi-language container for room sessions
     */
    private async createSharedContainer(roomId: string, languages: string[]): Promise<string> {
        console.log('Creating shared container for room:', roomId, 'languages:', languages);
        
        // Use the shared Docker image with platform-specific socket
        const dockerConfig = process.platform === 'win32' 
            ? { socketPath: '//./pipe/docker_engine' }
            : { socketPath: '/var/run/docker.sock' };
            
        const docker = new (require('dockerode'))(dockerConfig);

        const container = await docker.createContainer({
            Image: 'leviathan-python-optimized:latest', // Use existing Python image as base for shared containers
            name: `shared-room-${roomId}-${Date.now()}`,
            Cmd: ['/bin/bash', '-c', 'tail -f /dev/null'], // Keep container running
            Tty: true,
            OpenStdin: true,
            StdinOnce: false,
            AttachStdin: true,
            AttachStdout: true,
            AttachStderr: true,
            WorkingDir: '/workspace',
            HostConfig: {
                Memory: 1024 * 1024 * 1024, // 1GB memory for shared containers
                MemorySwap: 2 * 1024 * 1024 * 1024, // 2GB swap
                CpuCount: 2, // 2 CPU cores
                SecurityOpt: ['no-new-privileges'],
                NetworkMode: 'bridge', // Allow network access for package installations
                AutoRemove: false // Keep container for persistence
            },
            Env: [
                `ROOM_ID=${roomId}`,
                `LANGUAGES=${languages.join(',')}`,
                'TERM=xterm-256color'
            ]
        });

        // Start the container
        await container.start();
        
        // Setup workspace directories for each language
        for (const language of languages) {
            await this.setupLanguageWorkspace(container.id, language);
        }

        console.log(`Shared container created and configured: ${container.id}`);
        return container.id;
    }

    /**
     * Setup workspace directory and initial files for a language
     */
    private async setupLanguageWorkspace(containerId: string, language: string): Promise<void> {
        try {
            const commands = [
                `mkdir -p /workspace/${language}`,
                `echo "# ${language.toUpperCase()} Workspace" > /workspace/${language}/README.md`
            ];

            // Add language-specific setup
            switch (language.toLowerCase()) {
                case 'python':
                    commands.push(
                        `echo "print('Hello from Python!')" > /workspace/${language}/hello.py`,
                        `echo "# Python dependencies\\n# Add your requirements here" > /workspace/${language}/requirements.txt`
                    );
                    break;
                case 'javascript':
                case 'node':
                    commands.push(
                        `echo "console.log('Hello from Node.js!');" > /workspace/${language}/hello.js`,
                        `echo '{"name": "workspace", "version": "1.0.0", "dependencies": {}}' > /workspace/${language}/package.json`
                    );
                    break;
                case 'go':
                    commands.push(
                        `echo 'package main\\n\\nimport "fmt"\\n\\nfunc main() {\\n\\tfmt.Println("Hello from Go!")\\n}' > /workspace/${language}/hello.go`,
                        `echo 'module workspace\\n\\ngo 1.21' > /workspace/${language}/go.mod`
                    );
                    break;
                case 'java':
                    commands.push(
                        `echo 'public class Hello {\\n\\tpublic static void main(String[] args) {\\n\\t\\tSystem.out.println("Hello from Java!");\\n\\t}\\n}' > /workspace/${language}/Hello.java`
                    );
                    break;
                case 'cpp':
                case 'c++':
                    commands.push(
                        `echo '#include <iostream>\\nusing namespace std;\\n\\nint main() {\\n\\tcout << "Hello from C++!" << endl;\\n\\treturn 0;\\n}' > /workspace/${language}/hello.cpp`
                    );
                    break;
            }

            // Execute setup commands
            for (const command of commands) {
                try {
                    // Check if dockerService and executeCommand method are available
                    if (this.dockerService && typeof this.dockerService.executeCommand === 'function') {
                        await this.dockerService.executeCommand(containerId, command);
                    } else {
                        console.warn('Docker service or executeCommand not available, skipping command:', command);
                    }
                } catch (commandError) {
                    console.error('Failed to execute setup command:', command, commandError);
                    // Continue with other commands
                }
            }

            console.log(`Workspace setup completed for ${language}`);
        } catch (error) {
            console.error(`Error setting up workspace for ${language}:`, error);
            // Continue anyway - basic functionality should still work
        }
    }

    /**
     * Get all active rooms with pagination and search
     */
    async getAllRooms(page: number = 1, limit: number = 10, search: string = ''): Promise<{rooms: any[], total: number}> {
        try {
            console.log(`Getting all rooms - page: ${page}, limit: ${limit}, search: "${search}"`);

            // Build query with search filter
            let query = `
                SELECT 
                    r.*,
                    COUNT(DISTINCT ru.user_id) as current_users,
                    GROUP_CONCAT(DISTINCT rl.language) as languages
                FROM rooms r
                LEFT JOIN room_users ru ON r.id = ru.room_id
                LEFT JOIN room_languages rl ON r.id = rl.room_id
                WHERE r.is_active = 1 AND r.expires_at > datetime('now')
            `;
            
            let params: any[] = [];
            
            if (search) {
                query += ` AND r.name LIKE ?`;
                params.push(`%${search}%`);
            }
            
            query += ` GROUP BY r.id ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
            params.push(limit, (page - 1) * limit);

            const rooms = await this.queryDatabase(query, params);

            // Get total count
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM rooms r 
                WHERE r.is_active = 1 AND r.expires_at > datetime('now')
            `;
            let countParams: any[] = [];
            
            if (search) {
                countQuery += ` AND r.name LIKE ?`;
                countParams.push(`%${search}%`);
            }

            const countResult = await this.queryDatabase(countQuery, countParams);
            const total = countResult[0]?.total || 0;

            console.log(`Found ${rooms.length} rooms (${total} total)`);
            
            return {
                rooms: rooms.map(room => ({
                    ...room,
                    languages: room.languages ? [...new Set(room.languages.split(','))] : [],
                    current_users: room.current_users || 0
                })),
                total
            };

        } catch (error) {
            console.error('Error getting all rooms:', error);
            throw error;
        }
    }

    /**
     * Join an existing room
     */
    async joinExistingRoom(roomId: string, userId: string, userTier: 'free' | 'pro' | 'enterprise'): Promise<any> {
        try {
            console.log(`User ${userId} joining room ${roomId}`);

            // Check if room exists and is active
            const room = await this.queryDatabase(
                `SELECT * FROM rooms WHERE id = ? AND is_active = 1 AND expires_at > datetime('now')`,
                [roomId]
            );

            if (!room || room.length === 0) {
                throw new Error('Room not found or no longer active');
            }

            const roomData = room[0];

            // Check if user is already in the room (in room_users table)
            const existingRoomUser = await this.queryDatabase(
                `SELECT * FROM room_users WHERE room_id = ? AND user_id = ?`,
                [roomId, userId]
            );

            // Check if user already has an active session in this room
            const existingSession = await this.queryDatabase(
                `SELECT * FROM sessions WHERE user_id = ? AND room_id = ? AND is_active = 1`,
                [userId, roomId]
            );

            if (existingSession && existingSession.length > 0) {
                // User already has a session in this room, just update last_active and return existing session
                console.log('User already has active session in room, updating last_active and returning existing session');
                
                // Update last_active time
                await this.queryDatabase(
                    `UPDATE room_users SET last_active = datetime('now') WHERE room_id = ? AND user_id = ?`,
                    [roomId, userId]
                );
                
                return this.getSession(existingSession[0].id);
            }

            // If user is not in room_users table, check if room has space for new users
            if (!existingRoomUser || existingRoomUser.length === 0) {
                // Check current unique user count
                const currentUsers = await this.queryDatabase(
                    `SELECT COUNT(DISTINCT user_id) as count FROM room_users WHERE room_id = ?`,
                    [roomId]
                );

                if (currentUsers[0].count >= roomData.max_users) {
                    throw new Error('Room is full');
                }

                // Add user to room_users table (new user)
                await this.queryDatabase(
                    `INSERT INTO room_users (room_id, user_id, role, joined_at, last_active) 
                     VALUES (?, ?, 'participant', datetime('now'), datetime('now'))`,
                    [roomId, userId]
                );
                console.log(`Added new user ${userId} to room ${roomId}`);
            } else {
                // User is already in room_users table, just update last_active
                await this.queryDatabase(
                    `UPDATE room_users SET last_active = datetime('now') WHERE room_id = ? AND user_id = ?`,
                    [roomId, userId]
                );
                console.log(`Updated last_active for existing room user ${userId} in room ${roomId}`);
            }

            // Create new session for the user in this room
            const sessionId = uuidv4();
            const expiresAt = roomData.expires_at; // Use room's expiration time

            await this.queryDatabase(
                `INSERT INTO sessions (id, user_id, language, session_type, room_id, created_at, expires_at, is_active, resource_tier)
                 VALUES (?, ?, ?, 'room', ?, datetime('now'), ?, 1, ?)`,
                [sessionId, userId, roomData.language, roomId, expiresAt, roomData.resource_tier]
            );

            console.log(`User ${userId} joined room ${roomId} with session ${sessionId}`);

            // Return session details
            return {
                sessionId,
                sessionType: 'room',
                roomId,
                roomName: roomData.name,
                language: roomData.language,
                containerId: roomData.container_id,
                expiresAt,
                resourceTier: roomData.resource_tier,
                status: 'ready',
                websocketUrl: process.env.WS_URL || `ws://localhost:${process.env.PORT || 3003}`
            };

        } catch (error) {
            console.error('Error joining room:', error);
            throw error;
        }
    }

    /**
     * Get room details by ID
     */
    async getRoomDetails(roomId: string): Promise<any> {
        try {
            console.log(`Getting details for room ${roomId}`);

            const room = await this.queryDatabase(
                `SELECT r.*, COUNT(ru.user_id) as current_users
                 FROM rooms r
                 LEFT JOIN room_users ru ON r.id = ru.room_id
                 WHERE r.id = ?
                 GROUP BY r.id`,
                [roomId]
            );

            if (!room || room.length === 0) {
                throw new Error('Room not found');
            }

            // Get room languages
            const languages = await this.queryDatabase(
                `SELECT language FROM room_languages WHERE room_id = ?`,
                [roomId]
            );

            const roomData = room[0];
            return {
                ...roomData,
                languages: languages.map(l => l.language),
                current_users: roomData.current_users || 0
            };

        } catch (error) {
            console.error('Error getting room details:', error);
            throw error;
        }
    }

    /**
     * Get room participants/users
     */
    async getRoomParticipants(roomId: string): Promise<any[]> {
        try {
            console.log(`Getting participants for room ${roomId}`);

            const users = await this.queryDatabase(
                `SELECT ru.*, s.is_active as session_active, s.id as session_id
                 FROM room_users ru
                 LEFT JOIN sessions s ON ru.room_id = s.room_id AND ru.user_id = s.user_id AND s.is_active = 1
                 WHERE ru.room_id = ?
                 ORDER BY ru.joined_at`,
                [roomId]
            );

            return users;

        } catch (error) {
            console.error('Error getting room participants:', error);
            throw error;
        }
    }

    /**
     * Helper method to query database (implements the missing dbHelpers.queryDatabase)
     */
    private queryDatabase(query: string, params: any[] = []): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const { db } = require('../database');
            db.all(query, params, (err: any, rows: any[]) => {
                if (err) {
                    console.error('Database query error:', err);
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    /**
     * Get or create a container for a specific language in a room
     */
    private async getOrCreateLanguageContainer(roomId: string, language: string, languageConfig: LanguageTier): Promise<string> {
        try {
            // For now, create a new container for each language execution
            // In a production system, you might want to cache containers per room+language
            console.log(`Creating container for language ${language} in room ${roomId}`);
            
            const containerId = await this.createPrimedContainer(language, languageConfig, `room-${roomId}-${language}`);
            console.log(`Created container ${containerId} for ${language} in room ${roomId}`);
            
            return containerId;
        } catch (error) {
            console.error(`Error creating container for ${language} in room ${roomId}:`, error);
            throw error;
        }
    }

    private ensureDockerService(): DynamicDockerService {
        if (!this.dockerService) {
            console.log('Docker service not initialized, attempting to initialize now...');
            try {
                this.dockerService = DynamicDockerService.getInstance();
                console.log('Docker service initialized successfully on demand');
            } catch (error) {
                console.error('Failed to initialize Docker service on demand:', error);
                throw new Error('Docker service not available - please check Docker installation and restart the service');
            }
        }
        return this.dockerService;
    }
}

export default SessionService;
