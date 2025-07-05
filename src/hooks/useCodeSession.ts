import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { codeEditorService } from '../services/codeEditorService';
import type { CodeSession, SessionInitRequest } from '../types';

export const useCodeSession = () => {
  const [session, setSession] = useState<CodeSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Load persisted session on mount
  useEffect(() => {
    loadPersistedSession();
  }, []);

  // Periodically validate session
  useEffect(() => {
    if (session) {
      const interval = setInterval(validateSession, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const loadPersistedSession = useCallback(async () => {
    const persistedSession = localStorage.getItem('currentCodeSession');
    if (persistedSession) {
      try {
        setIsValidating(true);
        const sessionData = JSON.parse(persistedSession);
        
        // Validate session is still active
        await codeEditorService.getSession(sessionData.sessionId);
        setSession(sessionData);
        toast.success('Previous session restored');
      } catch (error) {
        console.warn('Failed to restore session:', error);
        localStorage.removeItem('currentCodeSession');
      } finally {
        setIsValidating(false);
      }
    }
  }, []);

  const createSession = useCallback(async (language: string): Promise<CodeSession | null> => {
    if (!language) {
      toast.error('Please select a language first');
      return null;
    }

    try {
      setIsCreating(true);
      const request: SessionInitRequest = {
        sessionType: 'solo',
        language
      };
      
      const newSession = await codeEditorService.initializeSession(request);
      setSession(newSession);
      
      // Persist session to localStorage
      localStorage.setItem('currentCodeSession', JSON.stringify(newSession));
      toast.success(`${language} session created successfully!`);
      
      return newSession;
    } catch (error: any) {
      console.error('Error creating session:', error);
      
      if (error.response?.status === 503) {
        toast.error('Service temporarily unavailable. Please try again later.');
      } else if (error.response?.status === 400) {
        toast.error('Invalid session request. Please check your input.');
      } else {
        toast.error('Failed to create coding session. Please try again.');
      }
      return null;
    } finally {
      setIsCreating(false);
    }
  }, []);

  const validateSession = useCallback(async () => {
    if (!session) return true;

    try {
      await codeEditorService.getSession(session.sessionId);
      return true;
    } catch (error) {
      console.warn('Session validation failed:', error);
      setSession(null);
      localStorage.removeItem('currentCodeSession');
      toast('Session expired', { icon: '⚠️' });
      return false;
    }
  }, [session]);

  const terminateSession = useCallback(async (): Promise<boolean> => {
    if (!session) return true;

    try {
      await codeEditorService.terminateSession(session.sessionId);
      setSession(null);
      localStorage.removeItem('currentCodeSession');
      toast.success('Session terminated');
      return true;
    } catch (error: any) {
      console.error('Error terminating session:', error);
      
      // Even if termination fails on the server, clear local state
      setSession(null);
      localStorage.removeItem('currentCodeSession');
      
      if (error.response?.status === 404) {
        toast('Session was already terminated', { icon: 'ℹ️' });
      } else {
        toast.error('Failed to terminate session on server, but cleared locally');
      }
      return false;
    }
  }, [session]);

  const executeCode = useCallback(async (code: string, language: string, filename?: string) => {
    if (!session) {
      throw new Error('No active session. Please create a session first.');
    }

    if (!code.trim()) {
      throw new Error('Please enter some code to execute.');
    }

    try {
      const request = {
        code,
        language,
        filename
      };
      
      const result = await codeEditorService.executeCode(session.sessionId, request);
      return result;
    } catch (error: any) {
      console.error('Execution error:', error);
      
      // Handle session not found error specifically
      if (error.response?.status === 404 || error.message?.includes('session not found')) {
        setSession(null);
        localStorage.removeItem('currentCodeSession');
        throw new Error('Session not found. Please create a new session.');
      } else if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.error || 'Invalid request. Please check your code.';
        throw new Error(errorMessage);
      } else if (error.response?.status === 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error('Failed to execute code. Please try again.');
      }
    }
  }, [session]);

  return {
    session,
    isCreating,
    isValidating,
    createSession,
    terminateSession,
    validateSession,
    executeCode
  };
};
