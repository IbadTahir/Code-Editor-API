import { Server as SocketIOServer, Namespace } from 'socket.io';
import { Server as HTTPServer } from 'http';
import Dockerode from 'dockerode';
import { Container } from 'dockerode';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';
import { getLanguageConfig } from '../utils/languageConfigs';

interface ExecutionSession {
  id: string;
  container: Container;
  language: string;
  userId?: string;
  startTime: number;
  isActive: boolean;
}

interface TerminalSanitizer {
  stripAnsiCodes(text: string): string;
  filterControlCharacters(text: string): string;
  sanitizeInput(input: string): string;
}

class WebSocketExecutionService {
  private io: SocketIOServer | Namespace;
  private docker: Dockerode;
  private activeSessions: Map<string, ExecutionSession> = new Map();
  private sanitizer: TerminalSanitizer;
  private readonly MAX_SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_OUTPUT_LENGTH = 50000; // 50KB max output
  private dockerAvailable: boolean = false;

  constructor(server: HTTPServer, io?: SocketIOServer) {
    if (io) {
      // Use shared Socket.IO instance with namespace
      this.io = io.of('/execution');
    } else {
      // Create new Socket.IO instance (backward compatibility)
      this.io = new SocketIOServer(server, {
        cors: {
          origin: "*", // Configure this properly for production
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
    this.checkDockerAvailability();

    this.sanitizer = {
      stripAnsiCodes: (text: string): string => {
        return text.replace(/\x1b\[[0-9;]*m/g, '');
      },
      
      filterControlCharacters: (text: string): string => {
        return text.replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
          // Allow newlines, tabs, and carriage returns
          if (char === '\n' || char === '\t' || char === '\r') {
            return char;
          }
          return '';
        });
      },
      
      sanitizeInput: (input: string): string => {
        // Remove dangerous characters and limit length
        const sanitized = input
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars except \n, \t
          .substring(0, 1000); // Limit input length
        return sanitized;
      }
    };

    this.setupSocketHandlers();
    this.startCleanupInterval();
  }

  private async checkDockerAvailability(): Promise<void> {
    try {
      await this.docker.ping();
      this.dockerAvailable = true;
      console.log('✅ Docker connection established');
    } catch (error: any) {
      this.dockerAvailable = false;
      console.warn('⚠️  Docker not available:', error.message);
      console.warn('⚠️  Code execution will be disabled until Docker is started');
    }
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle execution start
      socket.on('start-execution', async (data) => {
        try {
          const { language, code, sessionId } = data;
          
          if (!language || !code) {
            socket.emit('error', { message: 'Language and code are required' });
            return;
          }

          if (!this.dockerAvailable) {
            socket.emit('error', { 
              message: 'Code execution is currently unavailable. Docker Desktop is not running. Please start Docker Desktop and try again.',
              type: 'docker_unavailable'
            });
            return;
          }

          const session = await this.createExecutionSession(language, code, sessionId);
          socket.join(session.id);
          
          socket.emit('session-started', { 
            sessionId: session.id,
            language: session.language,
            message: 'Execution environment ready. Your program is running...'
          });

          // Start the container and handle I/O
          await this.executeWithRealTimeIO(session, socket);

        } catch (error) {
          console.error('Error starting execution:', error);
          socket.emit('error', { 
            message: error instanceof Error ? error.message : 'Failed to start execution'
          });
        }
      });

      // Handle user input
      socket.on('input', async (data) => {
        try {
          const { sessionId, input } = data;
          const session = this.activeSessions.get(sessionId);
          
          if (!session || !session.isActive) {
            socket.emit('error', { message: 'No active session found' });
            return;
          }

          const sanitizedInput = this.sanitizer.sanitizeInput(input);
          await this.sendInputToContainer(session, sanitizedInput + '\n');
          
        } catch (error) {
          console.error('Error sending input:', error);
          socket.emit('error', { message: 'Failed to send input' });
        }
      });

      // Handle session termination
      socket.on('terminate-session', async (data) => {
        const { sessionId } = data;
        await this.terminateSession(sessionId);
        socket.emit('session-terminated', { sessionId });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        // Clean up any sessions associated with this socket
        this.cleanupSocketSessions(socket.id);
      });
    });
  }

  private async createExecutionSession(
    language: string, 
    code: string, 
    sessionId?: string
  ): Promise<ExecutionSession> {
    const config = getLanguageConfig(language);
    if (!config) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const id = sessionId || uuidv4();
    const tempDir = path.join(os.tmpdir(), `websocket-exec-${id}`);
    const fileName = `main${config.fileExtension}`;
    const filePath = path.join(tempDir, fileName);

    // Create temporary directory and write code file
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(filePath, code);

    try {
      // Create container with interactive capabilities
      const container = await this.docker.createContainer({
        Image: config.image,
        Cmd: config.buildCommand(fileName),
        HostConfig: {
          Memory: 268435456, // 256MB
          MemorySwap: 536870912, // 512MB
          AutoRemove: false, // Don't auto-remove for interactive sessions
          Binds: [`${tempDir}:/app`],
          SecurityOpt: ['no-new-privileges'],
          OomKillDisable: false,
          NetworkMode: 'none' // No network access for security
        },
        WorkingDir: '/app',
        Tty: true, // Enable TTY for interactive sessions
        OpenStdin: true, // Enable stdin
        StdinOnce: false, // Keep stdin open
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true
      });

      const session: ExecutionSession = {
        id,
        container,
        language,
        startTime: Date.now(),
        isActive: true
      };

      this.activeSessions.set(id, session);
      return session;
    } catch (error: any) {
      // Clean up temp directory on error
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp directory:', cleanupError);
      }
      
      if (error.message?.includes('ENOENT') || error.message?.includes('docker_engine')) {
        throw new Error('Docker is not running. Please start Docker Desktop and try again.');
      }
      throw error;
    }
  }

  private async executeWithRealTimeIO(session: ExecutionSession, socket: any): Promise<void> {
    try {
      // Start the container
      await session.container.start();

      // Attach to container for real-time I/O
      const stream = await session.container.attach({
        stream: true,
        stdin: true,
        stdout: true,
        stderr: true,
        hijack: true
      });

      let outputBuffer = '';
      
      // Handle container output
      stream.on('data', (chunk: Buffer) => {
        try {
          const rawOutput = chunk.toString();
          const cleanOutput = this.sanitizeOutput(rawOutput);
          
          outputBuffer += cleanOutput;
          
          // Prevent excessive output
          if (outputBuffer.length > this.MAX_OUTPUT_LENGTH) {
            outputBuffer = outputBuffer.substring(outputBuffer.length - this.MAX_OUTPUT_LENGTH);
            socket.emit('output', { 
              type: 'warning', 
              data: '\n[Output truncated - too large]\n' 
            });
          }
          
          if (cleanOutput.trim()) {
            socket.emit('output', { 
              type: 'stdout', 
              data: cleanOutput 
            });
          }
        } catch (error) {
          console.error('Error processing container output:', error);
        }
      });

      // Handle container errors
      stream.on('error', (error: Error) => {
        console.error('Container stream error:', error);
        socket.emit('error', { message: 'Container execution error' });
        this.terminateSession(session.id);
      });

      // Handle container exit
      session.container.wait().then((result: { StatusCode: number }) => {
        const exitCode = result.StatusCode;
        socket.emit('execution-complete', { 
          sessionId: session.id,
          exitCode,
          message: `Program exited with code ${exitCode}`
        });
        this.terminateSession(session.id);
      }).catch((error: Error) => {
        console.error('Container wait error:', error);
        socket.emit('error', { message: 'Container monitoring error' });
        this.terminateSession(session.id);
      });

      // Store the stream for input handling
      (session as any).stream = stream;

    } catch (error) {
      console.error('Error in executeWithRealTimeIO:', error);
      socket.emit('error', { 
        message: error instanceof Error ? error.message : 'Execution failed'
      });
      await this.terminateSession(session.id);
    }
  }

  private async sendInputToContainer(session: ExecutionSession, input: string): Promise<void> {
    const stream = (session as any).stream;
    if (stream && session.isActive) {
      stream.write(input);
    }
  }

  private sanitizeOutput(output: string): string {
    // Remove ANSI escape codes and dangerous control characters
    let sanitized = this.sanitizer.stripAnsiCodes(output);
    sanitized = this.sanitizer.filterControlCharacters(sanitized);
    return sanitized;
  }

  private async terminateSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    session.isActive = false;

    try {
      // Close the stream if it exists
      const stream = (session as any).stream;
      if (stream) {
        stream.end();
      }

      // Stop and remove the container
      await session.container.kill().catch(() => {}); // Ignore errors
      await session.container.remove({ force: true }).catch(() => {}); // Ignore errors
      
    } catch (error) {
      console.error('Error terminating session:', error);
    } finally {
      this.activeSessions.delete(sessionId);
    }
  }

  private cleanupSocketSessions(socketId: string): void {
    // This would require tracking socket-to-session mapping
    // For now, we'll rely on the cleanup interval
  }

  private startCleanupInterval(): void {
    setInterval(async () => {
      const now = Date.now();
      const sessionsToCleanup: string[] = [];

      for (const [sessionId, session] of this.activeSessions) {
        if (now - session.startTime > this.MAX_SESSION_DURATION) {
          sessionsToCleanup.push(sessionId);
        }
      }

      for (const sessionId of sessionsToCleanup) {
        console.log(`Cleaning up expired session: ${sessionId}`);
        await this.terminateSession(sessionId);
      }
    }, 60000); // Check every minute
  }

  // Public methods for external API
  public getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  public async forceTerminateSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      await this.terminateSession(sessionId);
      return true;
    }
    return false;
  }

  public getSessionInfo(sessionId: string): any {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    return {
      id: session.id,
      language: session.language,
      startTime: session.startTime,
      isActive: session.isActive,
      duration: Date.now() - session.startTime
    };
  }
}

export default WebSocketExecutionService;
