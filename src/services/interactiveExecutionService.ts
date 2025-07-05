import io from 'socket.io-client';

interface ExecutionCallbacks {
  onOutput: (data: { type: string; data: string }) => void;
  onError: (error: { message: string; type?: string }) => void;
  onComplete: (data: { sessionId: string; exitCode: number; message: string }) => void;
  onSessionStarted: (data: { sessionId: string; language: string; message: string }) => void;
  onInputRequest?: () => void;
}

export class InteractiveExecutionService {
  private socket: ReturnType<typeof io> | null = null;
  private currentSessionId: string | null = null;
  private callbacks: ExecutionCallbacks | null = null;

  constructor() {
    this.connect();
  }

  private connect() {
    // Connect to the WebSocket execution service
    this.socket = io('http://localhost:3000/execution', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('Connected to interactive execution service');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from interactive execution service');
    });

    this.socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      if (this.callbacks?.onError) {
        this.callbacks.onError({
          message: error.message || 'Connection error',
          type: 'connection_error'
        });
      }
    });

    this.socket.on('session-started', (data: any) => {
      console.log('Session started:', data);
      this.currentSessionId = data.sessionId;
      if (this.callbacks?.onSessionStarted) {
        this.callbacks.onSessionStarted(data);
      }
    });

    this.socket.on('output', (data: any) => {
      if (this.callbacks?.onOutput) {
        this.callbacks.onOutput(data);
      }
    });

    this.socket.on('execution-complete', (data: any) => {
      console.log('Execution complete:', data);
      if (this.callbacks?.onComplete) {
        this.callbacks.onComplete(data);
      }
      this.currentSessionId = null;
    });

    this.socket.on('error', (error: any) => {
      console.error('Execution error:', error);
      if (this.callbacks?.onError) {
        this.callbacks.onError(error);
      }
    });
  }

  public executeCode(
    code: string,
    language: string,
    callbacks: ExecutionCallbacks
  ): void {
    if (!this.socket || !this.socket.connected) {
      callbacks.onError({
        message: 'Not connected to execution service. Please try again.',
        type: 'connection_error'
      });
      return;
    }

    this.callbacks = callbacks;

    // Start execution
    this.socket.emit('start-execution', {
      code,
      language,
      sessionId: this.generateSessionId()
    });
  }

  public sendInput(input: string): void {
    if (!this.socket || !this.currentSessionId) {
      console.error('No active session to send input to');
      return;
    }

    this.socket.emit('input', {
      sessionId: this.currentSessionId,
      input
    });
  }

  public terminateExecution(): void {
    if (!this.socket || !this.currentSessionId) {
      return;
    }

    this.socket.emit('terminate-session', {
      sessionId: this.currentSessionId
    });

    this.currentSessionId = null;
    this.callbacks = null;
  }

  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  public hasActiveSession(): boolean {
    return this.currentSessionId !== null;
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.currentSessionId = null;
    this.callbacks = null;
  }
}

// Singleton instance
export const interactiveExecutionService = new InteractiveExecutionService();
