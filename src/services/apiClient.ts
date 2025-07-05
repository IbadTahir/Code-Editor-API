import axios from 'axios';
import { toast } from 'react-hot-toast';

// Debounce error messages to prevent spam
let lastErrorToast = '';
let lastErrorTime = 0;
const ERROR_DEBOUNCE_TIME = 3000; // 3 seconds

function showDebouncedError(message: string) {
  const now = Date.now();
  if (message !== lastErrorToast || now - lastErrorTime > ERROR_DEBOUNCE_TIME) {
    toast.error(message);
    lastErrorToast = message;
    lastErrorTime = now;
  }
}

// Base API URLs - Updated to match actual backend ports and paths
const API_ENDPOINTS = {
  USER_MANAGEMENT: 'http://localhost:5000',      // API2 - User Management
  CODE_EDITOR: 'http://localhost:3003/api',      // API1 - Code Editor with /api prefix
  EDUCATIONAL_PLATFORM: 'http://localhost:8000'  // API3 - Educational Platform (Corrected to port 8000)
};

class ApiClient {
  private client: any;
  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 120000, // Increased timeout to 2 minutes for Docker container creation
      headers: {
        'Content-Type': 'application/json',
      },
    });    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config: any) => {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Add custom headers for Code Editor API (API1)
        if (this.client.defaults.baseURL === API_ENDPOINTS.CODE_EDITOR) {
          config.headers['x-user-id'] = user.username || user.email || 'demo-user';
          config.headers['x-user-tier'] = user.tier || 'pro'; // Temporarily set to pro to test more languages
        }
        
        return config;
      },
      (error: any) => {
        return Promise.reject(error);
      }
    );    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: any) => response,
      (error: any) => {
        // Log detailed error information for debugging
        if (error.response?.status === 401) {
          console.error('401 Unauthorized Error Details:', {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            baseURL: error.config?.baseURL,
            response: error.response?.data
          });
          
          const url = error.config?.url || '';
          const isAuthEndpoint = url.includes('/auth/') || url.includes('/login') || url.includes('/register');
          
          // Only redirect for actual authentication endpoints
          // For all other endpoints, let the calling code handle the error
          if (isAuthEndpoint) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
          }
          // For non-auth endpoints, just let the error propagate
        }
        
        // Show toast for network errors and 5xx server errors only
        // Don't show toasts for 4xx errors as these should be handled by the calling code
        if (!error.response) {
          // Network error - use debounced toast to prevent spam
          showDebouncedError('Network connection error. Please check if the backend services are running.');
        } else if (error.response?.status >= 500) {
          const errorMessage = error.response?.data?.error || error.message || 'Server error occurred';
          showDebouncedError(`Server error (${error.response.status}): ${errorMessage}`);
        } else if (error.response?.status === 404) {
          // Only show 404 errors for certain endpoints that indicate service issues
          const url = error.config?.url || '';
          if (url.includes('/api/') || url.includes('/sessions/') || url.includes('/evaluators/')) {
            showDebouncedError('Service endpoint not found. Please check if all services are running.');
          }
        } else if (error.response?.status === 401) {
          // Authentication errors - only show for non-auth endpoints
          const url = error.config?.url || '';
          const isAuthEndpoint = url.includes('/auth/') || url.includes('/login') || url.includes('/register');
          if (!isAuthEndpoint) {
            showDebouncedError('Authentication failed. Please refresh the page or check if the backend service is running properly.');
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, params?: any): Promise<T> {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.client.delete(url);
    return response.data;
  }
}

// Create API clients for each service
export const userManagementApi = new ApiClient(API_ENDPOINTS.USER_MANAGEMENT);
export const codeEditorApi = new ApiClient(API_ENDPOINTS.CODE_EDITOR);
export const educationalPlatformApi = new ApiClient(API_ENDPOINTS.EDUCATIONAL_PLATFORM);

export { API_ENDPOINTS };
