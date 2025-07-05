import { codeEditorApi } from './apiClient';
import type {
  CodeSession,
  ExecutionResult,
  SessionInitRequest,
  PaginatedResponse
} from '../types';

export class CodeEditorService {
  // Initialize a new session (solo or room)
  async initializeSession(request: SessionInitRequest): Promise<CodeSession> {
    const response = await codeEditorApi.post<{success: boolean, data: CodeSession}>('/sessions/init', request);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to initialize session');
  }

  // Get session information
  async getSession(sessionId: string): Promise<CodeSession> {
    const response = await codeEditorApi.get<{success: boolean, data: CodeSession}>(`/sessions/${sessionId}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Session not found');
  }

  // Execute code in a session
  async executeCode(sessionId: string, request: { code: string; language: string; filename?: string }): Promise<ExecutionResult> {
    const response = await codeEditorApi.post<{success: boolean, data: ExecutionResult}>(`/sessions/${sessionId}/execute`, request);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to execute code');
  }

  // Direct execution without session (legacy endpoint)
  async executeCodeDirect(request: { code: string; language: string; filename?: string }): Promise<ExecutionResult> {
    const response = await codeEditorApi.post<ExecutionResult>('/execute', request);
    return response;
  }
  // Get user's active sessions
  async getUserSessions(page = 1, limit = 10): Promise<PaginatedResponse<CodeSession>> {
    const response = await codeEditorApi.get<{success: boolean, data: {userId: string, activeSessions: number, sessions: CodeSession[]}}>('/sessions/user/active');
    
    if (!response.success || !response.data) {
      throw new Error('Failed to get user sessions');
    }
    
    // Client-side pagination since API doesn't support it
    const sessions = response.data.sessions;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedSessions = sessions.slice(startIndex, endIndex);
    
    return {
      data: paginatedSessions,
      total: sessions.length,
      page,
      limit,
      totalPages: Math.ceil(sessions.length / limit)
    };
  }

  // Terminate a session
  async terminateSession(sessionId: string): Promise<void> {
    const response = await codeEditorApi.delete<{success: boolean}>(`/sessions/${sessionId}`);
    if (!response.success) {
      throw new Error('Failed to terminate session');
    }
  }

  // Join an existing room
  async joinRoom(roomId: string): Promise<CodeSession> {
    const response = await codeEditorApi.post<{success: boolean, data: CodeSession}>(`/sessions/join/${roomId}`);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to join room');
  }

  // Get available languages
  async getAvailableLanguages(): Promise<{
    userTier: string;
    availableLanguages: {
      language: string;
      displayName: string;
      version: string;
      tier: string;
      description: string;
      extensions: string[];
    }[];
    totalLanguages: number;
  }> {
    const response = await codeEditorApi.get<{
      success: boolean;
      data: {
        userTier: string;
        availableLanguages: {
          language: string;
          displayName: string;
          version: string;
          tier: string;
          description: string;
          extensions: string[];
        }[];
        totalLanguages: number;
      };
    }>('/languages/available');
    
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Failed to get available languages');
  }
}

export class RoomService {
  // Get room information
  async getRoom(roomId: string): Promise<any> {
    try {
      const response = await codeEditorApi.get<{success: boolean, data: any}>(`/rooms/${roomId}`);
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.warn(`Room ${roomId} not found or error occurred:`, error);
      return null;
    }
  }

  // Get room users  
  async getRoomUsers(roomId: string): Promise<any[]> {
    try {
      const response = await codeEditorApi.get<{success: boolean, data: any[]}>(`/rooms/${roomId}/users`);
      return response.data;
    } catch (error) {
      console.warn(`Could not get users for room ${roomId}:`, error);
      return [];
    }
  }  // Get rooms list
  async getRooms(page = 1, limit = 10, search = ''): Promise<PaginatedResponse<any>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { search })
      });
      
      const response = await codeEditorApi.get<{success: boolean, data: {rooms: any[], pagination: any}}>(`/rooms?${params}`);
        // Map backend room format to frontend format
      const mappedRooms = response.data.rooms.map(room => ({
        id: room.id,
        roomId: room.id,
        roomName: room.name,
        languages: room.languages ? [...new Set(room.languages)] : [room.language],
        maxUsers: room.max_users,
        currentUsers: room.current_users,
        containerId: room.container_id,
        status: room.is_active ? 'active' : 'inactive',
        createdAt: room.created_at,
        lastActivity: room.created_at,
        createdBy: room.creator_id,
        expiresAt: room.expires_at,
        resourceTier: room.resource_tier
      }));
      
      return {
        data: mappedRooms,
        total: response.data.pagination.total,
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        totalPages: response.data.pagination.totalPages
      };
    } catch (error) {
      console.error('Failed to get rooms:', error);
      // Return empty list if API fails
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0
      };
    }
  }
  // Create room is done via session initialization
  async createRoom(roomData: {
    roomName: string;
    languages: string[];
    maxUsers: number;
    duration?: number;
    roomType?: string;
    isPublic?: boolean;
    description?: string;
    resourceTier?: string;
  }): Promise<{success: boolean, roomId: string}> {
    try {
      // Create a room by initializing a session
      const session = await codeEditorApi.post<{success: boolean, data: CodeSession}>('/sessions/init', {
        sessionType: 'room',
        roomName: roomData.roomName,
        languages: roomData.languages,
        maxUsers: roomData.maxUsers,
        duration: roomData.duration || 4,
        roomType: roomData.roomType || 'study',
        isPublic: roomData.isPublic || false,
        description: roomData.description || '',
        resourceTier: roomData.resourceTier || 'basic',
      });
      
      return {
        success: true,
        roomId: session.data.roomId || session.data.sessionId
      };
    } catch (error: any) {
      console.error('Failed to create room:', error);
      
      // Provide specific error messages based on error type
      if (!error.response) {
        throw new Error('Unable to connect to code editor service. Please ensure the backend is running.');
      } else if (error.response.status === 404) {
        throw new Error('Room creation endpoint not found. Please check if the code editor service is properly configured.');
      } else if (error.response.status === 500) {
        throw new Error('Server error occurred while creating room. Please try again later.');
      } else {
        throw new Error(error.response?.data?.error || error.message || 'Failed to create room');
      }
    }
  }

  // Join existing room
  async joinRoom(roomId: string): Promise<CodeSession> {
    try {
      const response = await codeEditorApi.post<{success: boolean, data: CodeSession}>(`/sessions/join/${roomId}`);
      return response.data;
    } catch (error: any) {
      console.error('Failed to join room:', error);
      throw new Error(error.response?.data?.error || 'Failed to join room');
    }
  }
}

export const codeEditorService = new CodeEditorService();
export const roomService = new RoomService();
