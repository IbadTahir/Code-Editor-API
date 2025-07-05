import { userManagementApi } from './apiClient';
import type {
  User,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  ApiResponse,
  PaginatedResponse
} from '../types';

export class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await userManagementApi.post<AuthResponse>('/api/auth/login', credentials);
    if (response.accessToken) {
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  }

  async register(userData: RegisterRequest): Promise<User> {
    // Transform the frontend data to match backend API expectations
    const backendData = {
      name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      email: userData.email,
      password: userData.password,
      role: userData.role || 'student'
    };
    
    const response = await userManagementApi.post<AuthResponse>('/api/auth/register', backendData);
    return response.user;
  }

  async logout(): Promise<void> {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    await userManagementApi.post('/api/auth/logout');
  }
  async refreshToken(): Promise<AuthResponse> {
    const response = await userManagementApi.post<AuthResponse>('/api/auth/refresh-token');
    if (response.accessToken) {
      localStorage.setItem('token', response.accessToken);
    }
    return response;
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}

export class UserService {
  async getUsers(page = 1, limit = 10): Promise<PaginatedResponse<User>> {
    return await userManagementApi.get<PaginatedResponse<User>>('/users', { page, limit });
  }

  async getUserById(id: string): Promise<User> {
    const response = await userManagementApi.get<ApiResponse<User>>(`/users/${id}`);
    return response.data;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const response = await userManagementApi.put<ApiResponse<User>>(`/users/${id}`, userData);
    return response.data;
  }

  async deleteUser(id: string): Promise<void> {
    await userManagementApi.delete(`/users/${id}`);
  }

  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await userManagementApi.put<ApiResponse<User>>('/users/profile', userData);
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await userManagementApi.post('/users/change-password', {
      currentPassword,
      newPassword
    });
  }
}

export const authService = new AuthService();
export const userService = new UserService();
