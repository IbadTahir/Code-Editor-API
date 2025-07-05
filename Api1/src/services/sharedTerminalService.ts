import { Server as SocketIOServer, Namespace } from 'socket.io';
import { Server as HTTPServer } from 'http';
import Dockerode from 'dockerode';
import { Container } from 'dockerode';
import { spawn, ChildProcess } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { dbHelpers } from '../database';
import EnhancedCodeExecutionService from './enhancedCodeExecutionService';
import { languageTiers } from '../config/dynamicLanguages';

interface TerminalSession {
  id: string;
  containerId: string;
  roomId: string;
  userId: string;
  container: Container;
  execInstance?: any;
  isActive: boolean;
  startTime: Date;
}

interface RoomTerminal {
  roomId: string;
  containerId: string;
  container: Container;
  activeSessions: Map<string, TerminalSession>;
  createdAt: Date;
  lastActivity: Date;
}

class SharedTerminalService {
  private io: SocketIOServer | Namespace;
  private docker: Dockerode;
  private roomTerminals: Map<string, RoomTerminal> = new Map();
  private userSessions: Map<string, TerminalSession> = new Map();
  private codeExecutionService: EnhancedCodeExecutionService;
  private readonly SHARED_IMAGE = 'leviathan-python-optimized:latest'; // Use optimized image
  private readonly MAX_OUTPUT_SIZE = 50000; // 50KB max output per message

  constructor(server: HTTPServer, io?: SocketIOServer) {
    if (io) {
      // Use shared Socket.IO instance with namespace
      this.io = io.of('/terminal');
    } else {
      // Create new Socket.IO instance (backward compatibility)
      this.io = new SocketIOServer(server, {
        cors: {
          origin: "*", // Configure properly for production
          methods: ["GET", "POST"]
        },
        transports: ['websocket', 'polling']
      });
    }

    // Platform-specific Docker socket configuration
    const dockerConfig = process.platform === 'win32' 
      ? { socketPath: '//./pipe/docker_engine' }
      : { socketPath: '/var/run/docker.sock' };
      
    this.docker = new Dockerode(dockerConfig);
    
    // Initialize enhanced code execution service
    this.codeExecutionService = new EnhancedCodeExecutionService();

    this.setupSocketHandlers();
    this.startCleanupInterval();
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Join room terminal
      socket.on('join-room-terminal', async (data) => {
        try {
          const { roomId, userId } = data;
          
          if (!roomId || !userId) {
            socket.emit('terminal-error', { message: 'Room ID and User ID are required' });
            return;
          }

          // Verify user has access to room
          const hasAccess = await this.verifyRoomAccess(roomId, userId);
          if (!hasAccess) {
            socket.emit('terminal-error', { message: 'Access denied to room' });
            return;
          }

          // Get or create room terminal
          let roomTerminal = await this.getOrCreateRoomTerminal(roomId);
          
          // Create user terminal session
          const session = await this.createTerminalSession(roomTerminal, userId, socket.id);
          
          // Join socket room
          socket.join(`room-${roomId}`);
          socket.join(`terminal-${session.id}`);
          
          // Store session reference
          this.userSessions.set(socket.id, session);
          
          socket.emit('terminal-ready', {
            sessionId: session.id,
            roomId: roomId,
            message: 'Terminal connected. You can now run commands.'
          });

          // Send welcome message
          socket.emit('terminal-output', {
            data: `Welcome to shared coding environment!\nRoom: ${roomId}\nUser: ${userId}\n$ `,
            sessionId: session.id
          });

        } catch (error) {
          console.error('Error joining room terminal:', error);
          socket.emit('terminal-error', { 
            message: 'Failed to join room terminal',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Send terminal input
      socket.on('terminal-input', async (data) => {
        try {
          const { input, sessionId } = data;
          const session = this.userSessions.get(socket.id);

          if (!session || !session.isActive) {
            socket.emit('terminal-error', { message: 'No active terminal session' });
            return;
          }

          if (!session.execInstance) {
            // Create new exec instance
            session.execInstance = await session.container.exec({
              Cmd: ['/bin/bash'],
              AttachStdin: true,
              AttachStdout: true,
              AttachStderr: true,
              Tty: true,
              WorkingDir: '/workspace'
            });

            const stream = await session.execInstance.start({
              hijack: true,
              stdin: true,
              Tty: true
            });

            // Handle output
            stream.on('data', (chunk: Buffer) => {
              const output = this.sanitizeOutput(chunk.toString());
              if (output.length > 0) {
                // Broadcast to all users in the room
                this.io.to(`room-${session.roomId}`).emit('terminal-output', {
                  data: output,
                  sessionId: session.id,
                  userId: session.userId
                });
              }
            });

            stream.on('error', (error: Error) => {
              console.error('Terminal stream error:', error);
              socket.emit('terminal-error', { 
                message: 'Terminal connection error',
                sessionId: session.id 
              });
            });

            // Store stream reference
            session.execInstance.stream = stream;
          }

          // Send input to terminal
          if (session.execInstance.stream && session.execInstance.stream.writable) {
            session.execInstance.stream.write(input);
            
            // Update last activity
            const roomTerminal = this.roomTerminals.get(session.roomId);
            if (roomTerminal) {
              roomTerminal.lastActivity = new Date();
            }
          }

        } catch (error) {
          console.error('Error handling terminal input:', error);
          socket.emit('terminal-error', { 
            message: 'Failed to process terminal input',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket.id);
      });

      // Get room file listing
      socket.on('list-files', async (data) => {
        try {
          const { path = '/workspace' } = data;
          const session = this.userSessions.get(socket.id);

          if (!session) {
            socket.emit('terminal-error', { message: 'No active session' });
            return;
          }

          const exec = await session.container.exec({
            Cmd: ['ls', '-la', path],
            AttachStdout: true,
            AttachStderr: true
          });

          const stream = await exec.start({ Detach: false });
          let output = '';

          stream.on('data', (chunk: Buffer) => {
            output += chunk.toString();
          });

          stream.on('end', () => {
            socket.emit('file-list', {
              path: path,
              files: this.parseFileList(output)
            });
          });

        } catch (error) {
          console.error('Error listing files:', error);
          socket.emit('terminal-error', { message: 'Failed to list files' });
        }
      });

      // Enhanced Code Execution Events
      
      // Execute code with enhanced features (loops, functions, imports)
      socket.on('execute-enhanced-code', async (data) => {
        try {
          const { code, language, packages, fileName, input, timeout } = data;
          const session = this.userSessions.get(socket.id);

          if (!session || !session.isActive) {
            socket.emit('terminal-error', { message: 'No active terminal session' });
            return;
          }

          // Execute code using enhanced service
          const result = await this.codeExecutionService.executeCode({
            code,
            language: language || 'python', // Default to Python
            fileName,
            input,
            packages,
            timeout
          });

          // Broadcast result to all users in the room
          this.io.to(`room-${session.roomId}`).emit('code-execution-result', {
            sessionId: session.id,
            userId: session.userId,
            language,
            result,
            timestamp: new Date().toISOString()
          });

          // Update last activity
          const roomTerminal = this.roomTerminals.get(session.roomId);
          if (roomTerminal) {
            roomTerminal.lastActivity = new Date();
          }

        } catch (error) {
          console.error('Error in enhanced code execution:', error);
          socket.emit('terminal-error', { 
            message: 'Enhanced code execution failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Install packages dynamically
      socket.on('install-packages', async (data) => {
        try {
          const { packages, language } = data;
          const session = this.userSessions.get(socket.id);

          if (!session || !session.isActive) {
            socket.emit('terminal-error', { message: 'No active terminal session' });
            return;
          }

          if (!packages || !Array.isArray(packages) || packages.length === 0) {
            socket.emit('terminal-error', { message: 'Packages array is required' });
            return;
          }

          // Create a temporary context for package installation
          const context = {
            containerId: session.containerId,
            language: language || 'python',
            workingDir: '/workspace',
            installedPackages: new Set<string>()
          };

          // Install packages
          await this.codeExecutionService.installPackages(context, packages);

          // Broadcast success to all users in the room
          this.io.to(`room-${session.roomId}`).emit('packages-installed', {
            sessionId: session.id,
            userId: session.userId,
            packages,
            language,
            timestamp: new Date().toISOString()
          });

          socket.emit('package-install-success', {
            packages,
            message: `Successfully installed: ${packages.join(', ')}`
          });

        } catch (error) {
          console.error('Error installing packages:', error);
          socket.emit('terminal-error', { 
            message: 'Package installation failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Execute interactive code (for REPL-like experience)
      socket.on('execute-interactive', async (data) => {
        try {
          const { code, language } = data;
          const session = this.userSessions.get(socket.id);

          if (!session || !session.isActive) {
            socket.emit('terminal-error', { message: 'No active terminal session' });
            return;
          }

          // Use session container ID as context ID for interactive execution
          const contextId = session.containerId;
          
          const result = await this.codeExecutionService.executeInteractiveCode(
            contextId, 
            code, 
            language || 'python'
          );

          // Broadcast result to all users in the room
          this.io.to(`room-${session.roomId}`).emit('interactive-execution-result', {
            sessionId: session.id,
            userId: session.userId,
            language,
            code,
            result,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          console.error('Error in interactive execution:', error);
          socket.emit('terminal-error', { 
            message: 'Interactive execution failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Get supported languages
      socket.on('get-supported-languages', () => {
        try {
          const languages = Object.keys(languageTiers).filter(key => 
            languageTiers[key].active !== false
          );
          
          socket.emit('supported-languages', {
            languages,
            details: languages.map(lang => ({
              name: lang,
              displayName: languageTiers[lang].name,
              fileExtension: languageTiers[lang].fileExtension,
              commonPackages: languageTiers[lang].commonPackages
            }))
          });
        } catch (error) {
          console.error('Error getting supported languages:', error);
          socket.emit('terminal-error', { message: 'Failed to get supported languages' });
        }
      });

      // Enhanced Code Execution Methods

      /**
       * Execute code with full language support (loops, functions, imports)
       */
      socket.on('execute-enhanced-code', async (data) => {
        try {
          const { code, language, packages, fileName, input, timeout } = data;
          const session = this.userSessions.get(socket.id);

          if (!session || !session.isActive) {
            socket.emit('terminal-error', { message: 'No active terminal session' });
            return;
          }

          // Execute code using enhanced service
          const result = await this.codeExecutionService.executeCode({
            code,
            language: language || 'python', // Default to Python
            fileName,
            input,
            packages,
            timeout
          });

          // Broadcast result to all users in the room
          this.io.to(`room-${session.roomId}`).emit('code-execution-result', {
            sessionId: session.id,
            userId: session.userId,
            language,
            result,
            timestamp: new Date().toISOString()
          });

          // Update last activity
          const roomTerminal = this.roomTerminals.get(session.roomId);
          if (roomTerminal) {
            roomTerminal.lastActivity = new Date();
          }

        } catch (error) {
          console.error('Error in enhanced code execution:', error);
          socket.emit('terminal-error', { 
            message: 'Enhanced code execution failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      /**
       * Install packages in a room terminal
       */
      socket.on('install-packages-in-room', async (data) => {
        try {
          const { roomId, packages, language } = data;
          const roomTerminal = this.roomTerminals.get(roomId);

          if (!roomTerminal) {
            socket.emit('terminal-error', { message: 'Room terminal not found' });
            return;
          }

          const context = {
            containerId: roomTerminal.containerId,
            language,
            workingDir: '/workspace',
            installedPackages: new Set<string>()
          };

          await this.codeExecutionService.installPackages(context, packages);

          // Broadcast success to all users in the room
          this.io.to(`room-${roomId}`).emit('packages-installed', {
            sessionId: roomId,
            userId: roomId,
            packages,
            language,
            timestamp: new Date().toISOString()
          });

          socket.emit('package-install-success', {
            packages,
            message: `Successfully installed: ${packages.join(', ')}`
          });

        } catch (error) {
          console.error('Error installing packages in room:', error);
          socket.emit('terminal-error', { 
            message: 'Package installation in room failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      /**
       * Execute interactive code in a room (REPL-like)
       */
      socket.on('execute-interactive-code', async (data) => {
        try {
          const { roomId, code, language } = data;
          const roomTerminal = this.roomTerminals.get(roomId);

          if (!roomTerminal) {
            socket.emit('terminal-error', { message: 'Room terminal not found' });
            return;
          }

          const result = await this.codeExecutionService.executeInteractiveCode(
            roomTerminal.containerId, 
            code, 
            language || 'python'
          );

          // Broadcast result to all users in the room
          this.io.to(`room-${roomId}`).emit('interactive-execution-result', {
            sessionId: roomId,
            userId: roomId,
            language,
            code,
            result,
            timestamp: new Date().toISOString()
          });

        } catch (error) {
          console.error('Error in interactive execution in room:', error);
          socket.emit('terminal-error', { 
            message: 'Interactive execution in room failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      /**
       * Get available languages with their capabilities
       */
      socket.on('get-supported-languages-details', () => {
        try {
          const languages = Object.keys(languageTiers).filter(key => 
            languageTiers[key].active !== false
          );
          
          socket.emit('supported-languages-details', {
            languages,
            details: languages.map(lang => ({
              name: lang,
              displayName: languageTiers[lang].name,
              fileExtension: languageTiers[lang].fileExtension,
              commonPackages: languageTiers[lang].commonPackages,
              supportsPackageInstall: !!languageTiers[lang].packageInstallCommand,
              memoryLimit: languageTiers[lang].memoryLimit,
              executionTimeout: languageTiers[lang].executionTimeout
            }))
          });
        } catch (error) {
          console.error('Error getting supported languages details:', error);
          socket.emit('terminal-error', { message: 'Failed to get supported languages details' });
        }
      });

      /**
       * Create a multi-language container for a room
       */
      socket.on('create-multi-language-container', async (data) => {
        try {
          const { roomId, languages } = data;

          // Validate languages
          if (!Array.isArray(languages) || languages.length === 0) {
            socket.emit('terminal-error', { message: 'Languages array is required' });
            return;
          }

          // Create multi-language container
          const container = await this.createMultiLanguageContainer(roomId, languages);

          // Update room terminal info
          let roomTerminal = this.roomTerminals.get(roomId);
          if (roomTerminal) {
            roomTerminal.containerId = container.id;
            roomTerminal.container = container;
          }

          socket.emit('multi-language-container-created', {
            roomId,
            containerId: container.id,
            message: 'Multi-language container created successfully'
          });

        } catch (error) {
          console.error('Error creating multi-language container:', error);
          socket.emit('terminal-error', { 
            message: 'Failed to create multi-language container',
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // ...existing code...
    });
  }

  private async verifyRoomAccess(roomId: string, userId: string): Promise<boolean> {
    try {
      // Check if user has access to the room
      const roomUsers = await dbHelpers.getRoomUsers(roomId);
      return roomUsers.some(user => user.user_id === userId);
    } catch (error) {
      console.error('Error verifying room access:', error);
      return false;
    }
  }

  private async getOrCreateRoomTerminal(roomId: string): Promise<RoomTerminal> {
    let roomTerminal = this.roomTerminals.get(roomId);
    
    if (!roomTerminal) {
      // Create new shared container for the room
      const container = await this.createSharedContainer(roomId);
      
      if (!container.id) {
        throw new Error('Failed to create container: container ID is undefined');
      }
      
      roomTerminal = {
        roomId,
        containerId: container.id,
        container,
        activeSessions: new Map(),
        createdAt: new Date(),
        lastActivity: new Date()
      };
      
      this.roomTerminals.set(roomId, roomTerminal);
      
      // Update database with container ID
      await dbHelpers.updateRoomContainer(roomId, container.id);
    }
    
    return roomTerminal;
  }

  private async createSharedContainer(roomId: string): Promise<Container> {
    console.log(`Creating shared container for room: ${roomId}`);

    // Use multi-language optimized image that supports all languages
    const multiLangImage = 'leviathan-python-optimized:latest'; // Base image with Python
    
    // Create container with enhanced configuration for multi-language support
    const container = await this.docker.createContainer({
      Image: multiLangImage,
      name: `shared-room-${roomId}-${Date.now()}`,
      Cmd: ['/bin/bash'],
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: '/workspace',
      HostConfig: {
        Memory: 2 * 1024 * 1024 * 1024, // 2GB memory for enhanced execution
        MemorySwap: 4 * 1024 * 1024 * 1024, // 4GB swap
        CpuCount: 4, // 4 CPU cores for better performance
        SecurityOpt: ['no-new-privileges'],
        NetworkMode: 'bridge', // Enable network for package installation
        AutoRemove: false // Keep container for persistence
      },
      Env: [
        `ROOM_ID=${roomId}`,
        'TERM=xterm-256color',
        'DEBIAN_FRONTEND=noninteractive',
        'PYTHONUNBUFFERED=1',
        'NODE_ENV=development'
      ]
    });

    // Start the container
    await container.start();
    
    // Setup multi-language environment
    const setupCommands = [
      // Update package manager
      'apt-get update',
      
      // Install essential tools
      'apt-get install -y --no-install-recommends curl wget git build-essential software-properties-common',
      
      // Install Node.js 18 for JavaScript support
      'curl -fsSL https://deb.nodesource.com/setup_18.x | bash -',
      'apt-get install -y nodejs',
      'npm install -g npm@latest',
      
      // Install Go for Go support
      'wget -q https://go.dev/dl/go1.21.0.linux-amd64.tar.gz -O /tmp/go.tar.gz',
      'tar -C /usr/local -xzf /tmp/go.tar.gz',
      'echo "export PATH=$PATH:/usr/local/go/bin" >> /etc/profile',
      'echo "export PATH=$PATH:/usr/local/go/bin" >> /root/.bashrc',
      
      // Install C++ compiler (already included in build-essential)
      
      // Install Java
      'apt-get install -y default-jdk',
      
      // Setup workspace directory
      'mkdir -p /workspace',
      'chmod 777 /workspace',
      
      // Install common Python packages
      'pip install --no-cache-dir --upgrade pip setuptools wheel',
      'pip install --no-cache-dir numpy pandas matplotlib seaborn plotly scikit-learn requests urllib3 flask fastapi',
      
      // Install common Node.js packages globally
      'npm install -g lodash axios express socket.io moment uuid fs-extra chalk',
      
      // Cleanup
      'apt-get clean',
      'rm -rf /var/lib/apt/lists/* /tmp/*'
    ];

    console.log(`Setting up multi-language environment for room: ${roomId}`);
    
    // Execute setup commands one by one (with error handling)
    for (const cmd of setupCommands) {
      try {
        const exec = await container.exec({
          Cmd: ['/bin/bash', '-c', cmd],
          AttachStdout: true,
          AttachStderr: true
        });

        const stream = await exec.start({ Detach: false });
        let output = '';

        await new Promise<void>((resolve) => {
          stream.on('data', (chunk: Buffer) => {
            output += chunk.toString();
          });

          stream.on('end', () => {
            resolve();
          });
        });

        console.log(`Setup command completed: ${cmd.substring(0, 50)}...`);
      } catch (error) {
        console.warn(`Setup command failed (continuing): ${cmd}`, error);
      }
    }
    
    console.log(`Shared multi-language container created and configured: ${container.id}`);
    return container;
  }

  private async createTerminalSession(
    roomTerminal: RoomTerminal, 
    userId: string, 
    socketId: string
  ): Promise<TerminalSession> {
    const sessionId = uuidv4();
    
    const session: TerminalSession = {
      id: sessionId,
      containerId: roomTerminal.containerId,
      roomId: roomTerminal.roomId,
      userId,
      container: roomTerminal.container,
      isActive: true,
      startTime: new Date()
    };

    roomTerminal.activeSessions.set(socketId, session);
    return session;
  }

  private handleDisconnect(socketId: string): void {
    const session = this.userSessions.get(socketId);
    
    if (session) {
      // Clean up exec instance
      if (session.execInstance && session.execInstance.stream) {
        try {
          session.execInstance.stream.end();
        } catch (error) {
          console.error('Error closing terminal stream:', error);
        }
      }

      // Remove from room terminal
      const roomTerminal = this.roomTerminals.get(session.roomId);
      if (roomTerminal) {
        roomTerminal.activeSessions.delete(socketId);
      }

      // Remove user session
      this.userSessions.delete(socketId);
      
      console.log(`Terminal session disconnected: ${session.id}`);
    }
  }

  private sanitizeOutput(output: string): string {
    // Remove dangerous escape sequences and control characters
    let sanitized = output
      .replace(/\x1b\[[0-9;]*m/g, '') // Remove ANSI color codes
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control chars except \n, \t, \r

    // Limit output size
    if (sanitized.length > this.MAX_OUTPUT_SIZE) {
      sanitized = sanitized.substring(0, this.MAX_OUTPUT_SIZE) + '\n[Output truncated...]\n';
    }

    return sanitized;
  }

  private parseFileList(output: string): any[] {
    const lines = output.split('\n').filter(line => line.trim());
    const files = [];

    for (const line of lines) {
      if (line.startsWith('total')) continue;
      
      const parts = line.split(/\s+/);
      if (parts.length >= 9) {
        files.push({
          permissions: parts[0],
          size: parts[4],
          date: `${parts[5]} ${parts[6]} ${parts[7]}`,
          name: parts.slice(8).join(' '),
          isDirectory: parts[0].startsWith('d')
        });
      }
    }

    return files;
  }

  private startCleanupInterval(): void {
    // Clean up inactive sessions every 5 minutes
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 5 * 60 * 1000);

    // Clean up unused room terminals every 30 minutes
    setInterval(() => {
      this.cleanupUnusedRoomTerminals();
    }, 30 * 60 * 1000);
  }

  private cleanupInactiveSessions(): void {
    const now = new Date();
    const maxInactiveTime = 30 * 60 * 1000; // 30 minutes

    for (const [socketId, session] of this.userSessions.entries()) {
      const inactiveTime = now.getTime() - session.startTime.getTime();
      
      if (inactiveTime > maxInactiveTime) {
        this.handleDisconnect(socketId);
      }
    }
  }

  private async cleanupUnusedRoomTerminals(): Promise<void> {
    const now = new Date();
    const maxUnusedTime = 60 * 60 * 1000; // 1 hour

    for (const [roomId, roomTerminal] of this.roomTerminals.entries()) {
      const unusedTime = now.getTime() - roomTerminal.lastActivity.getTime();
      
      if (unusedTime > maxUnusedTime && roomTerminal.activeSessions.size === 0) {
        try {
          // Stop and remove container
          await roomTerminal.container.stop({ t: 10 });
          await roomTerminal.container.remove({ force: true });
          
          // Remove from tracking
          this.roomTerminals.delete(roomId);
          
          console.log(`Cleaned up unused room terminal: ${roomId}`);
        } catch (error) {
          console.error(`Error cleaning up room terminal ${roomId}:`, error);
        }
      }
    }
  }

  // Public methods for external access
  public getActiveRoomTerminals(): string[] {
    return Array.from(this.roomTerminals.keys());
  }

  public getRoomTerminalInfo(roomId: string): any {
    const roomTerminal = this.roomTerminals.get(roomId);
    if (!roomTerminal) return null;

    return {
      roomId: roomTerminal.roomId,
      containerId: roomTerminal.containerId,
      activeSessions: roomTerminal.activeSessions.size,
      createdAt: roomTerminal.createdAt,
      lastActivity: roomTerminal.lastActivity
    };
  }

  public async executeCommand(roomId: string, command: string): Promise<string> {
    const roomTerminal = this.roomTerminals.get(roomId);
    if (!roomTerminal) {
      throw new Error('Room terminal not found');
    }

    const exec = await roomTerminal.container.exec({
      Cmd: ['/bin/bash', '-c', command],
      AttachStdout: true,
      AttachStderr: true
    });

    const stream = await exec.start({ Detach: false });
    let output = '';

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        output += chunk.toString();
      });

      stream.on('end', () => {
        resolve(this.sanitizeOutput(output));
      });

      stream.on('error', (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Execute code with full language support (loops, functions, imports)
   */
  public async executeEnhancedCode(
    roomId: string, 
    code: string, 
    language: string,
    options?: {
      packages?: string[];
      fileName?: string;
      input?: string;
      timeout?: number;
    }
  ): Promise<any> {
    const roomTerminal = this.roomTerminals.get(roomId);
    if (!roomTerminal) {
      throw new Error('Room terminal not found');
    }

    return await this.codeExecutionService.executeCode({
      code,
      language,
      fileName: options?.fileName,
      input: options?.input,
      packages: options?.packages,
      timeout: options?.timeout
    });
  }

  /**
   * Install packages in a room terminal
   */
  public async installPackagesInRoom(
    roomId: string, 
    packages: string[], 
    language: string
  ): Promise<void> {
    const roomTerminal = this.roomTerminals.get(roomId);
    if (!roomTerminal) {
      throw new Error('Room terminal not found');
    }

    const context = {
      containerId: roomTerminal.containerId,
      language,
      workingDir: '/workspace',
      installedPackages: new Set<string>()
    };

    await this.codeExecutionService.installPackages(context, packages);
  }

  /**
   * Execute interactive code in a room (REPL-like)
   */
  public async executeInteractiveCode(
    roomId: string, 
    code: string, 
    language: string
  ): Promise<any> {
    const roomTerminal = this.roomTerminals.get(roomId);
    if (!roomTerminal) {
      throw new Error('Room terminal not found');
    }

    return await this.codeExecutionService.executeInteractiveCode(
      roomTerminal.containerId, 
      code, 
      language
    );
  }

  /**
   * Get available languages with their capabilities
   */
  public getSupportedLanguages(): any[] {
    return Object.keys(languageTiers)
      .filter(key => languageTiers[key].active !== false)
      .map(lang => ({
        name: lang,
        displayName: languageTiers[lang].name,
        fileExtension: languageTiers[lang].fileExtension,
        commonPackages: languageTiers[lang].commonPackages,
        supportsPackageInstall: !!languageTiers[lang].packageInstallCommand,
        memoryLimit: languageTiers[lang].memoryLimit,
        executionTimeout: languageTiers[lang].executionTimeout
      }));
  }

  /**
   * Create a multi-language container for a room
   */
  public async createMultiLanguageContainer(roomId: string, languages: string[]): Promise<Container> {
    console.log(`Creating multi-language container for room: ${roomId} with languages: ${languages.join(', ')}`);

    // Use a base image that supports multiple languages (like ubuntu with all tools)
    const multiLangImage = 'leviathan-python-optimized:latest'; // Use optimized Python image as base
    
    const container = await this.docker.createContainer({
      Image: multiLangImage,
      name: `multi-lang-room-${roomId}-${Date.now()}`,
      Cmd: ['/bin/bash'],
      Tty: true,
      OpenStdin: true,
      StdinOnce: false,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: '/workspace',
      HostConfig: {
        Memory: 2 * 1024 * 1024 * 1024, // 2GB memory for multi-language containers
        MemorySwap: 4 * 1024 * 1024 * 1024, // 4GB swap
        CpuCount: 4, // 4 CPU cores for better performance
        SecurityOpt: ['no-new-privileges'],
        NetworkMode: 'bridge', // Enable network for package installation
        AutoRemove: false
      },
      Env: [
        `ROOM_ID=${roomId}`,
        `SUPPORTED_LANGUAGES=${languages.join(',')}`,
        'TERM=xterm-256color',
        'DEBIAN_FRONTEND=noninteractive'
      ]
    });

    // Start the container
    await container.start();
    
    // Install additional language support if needed
    const setupCommands = [
      'apt-get update',
      'apt-get install -y --no-install-recommends curl wget git build-essential',
    ];

    // Add Node.js if JavaScript is requested
    if (languages.includes('javascript')) {
      setupCommands.push(
        'curl -fsSL https://deb.nodesource.com/setup_18.x | bash -',
        'apt-get install -y nodejs'
      );
    }

    // Add Go if requested
    if (languages.includes('go')) {
      setupCommands.push(
        'wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz',
        'tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz',
        'echo "export PATH=$PATH:/usr/local/go/bin" >> /etc/profile'
      );
    }

    // Execute setup commands
    for (const cmd of setupCommands) {
      try {
        await this.executeCommand(roomId, cmd);
      } catch (error) {
        console.warn(`Setup command failed (continuing): ${cmd}`, error);
      }
    }

    console.log(`Multi-language container created and configured: ${container.id}`);
    return container;
  }
}

export default SharedTerminalService;
