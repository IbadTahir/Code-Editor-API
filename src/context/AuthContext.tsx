import React, { createContext, useContext, useReducer, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/userService';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
};

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check if user is already authenticated on app load
    const checkAuth = () => {
      try {
        const user = authService.getCurrentUser();
        const isAuthenticated = authService.isAuthenticated();
        
        if (isAuthenticated && user) {
          dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        } else {
          dispatch({ type: 'LOGIN_FAILURE' });
        }
      } catch (error) {
        dispatch({ type: 'LOGIN_FAILURE' });
      }
    };

    checkAuth();
  }, []);
  const login = async (email: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authService.login({ email, password });
      dispatch({ type: 'LOGIN_SUCCESS', payload: response.user });
    } catch (error: any) {
      dispatch({ type: 'LOGIN_FAILURE' });
      console.error('Login error:', error);
      
      // Provide more specific error messages
      if (error.response?.status === 401) {
        throw new Error('Invalid credentials. Please check your email and password.');
      } else if (error.response?.status === 404) {
        throw new Error('User not found. Please check your email or register a new account.');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else if (!error.response) {
        throw new Error('Network error. Please check your internet connection.');
      } else {
        throw new Error(error.response?.data?.message || error.message || 'Login failed. Please try again.');
      }
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Even if logout fails on the server, clear local state
      console.error('Logout failed:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const updateUser = (user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
