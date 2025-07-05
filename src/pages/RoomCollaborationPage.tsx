import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomService, codeEditorService } from '../services/codeEditorService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/CommonComponents';
import { toast } from 'react-hot-toast';
import type { Room, RoomParticipant, CodeSession } from '../types';

const RoomCollaborationPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [session, setSession] = useState<CodeSession | null>(null);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState('# Welcome to collaborative coding\nprint("Hello, Room!")');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const terminalWsRef = useRef<WebSocket | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Language templates
  const languageTemplates = {
    python: '# Collaborative Python coding\nprint("Hello from the room!")',
    javascript: '// Collaborative JavaScript coding\nconsole.log("Hello from the room!");',
    go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello from the room!")\n}',
    cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from the room!" << std::endl;\n    return 0;\n}',
    java: 'public class RoomCode {\n    public static void main(String[] args) {\n        System.out.println("Hello from the room!");\n    }\n}'
  };

  useEffect(() => {
    if (!roomId) {
      navigate('/rooms');
      return;
    }

    initializeRoom();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (terminalWsRef.current) {
        terminalWsRef.current.close();
      }
    };
  }, [roomId, navigate]);

  const initializeRoom = async () => {
    if (!roomId) return;

    setIsLoading(true);
    try {
      // Get room information
      const roomData = await roomService.getRoom(roomId);
      setRoom(roomData);
      
      // Set initial language to first available
      if (roomData.languages.length > 0) {
        setSelectedLanguage(roomData.languages[0]);
        setCode(languageTemplates[roomData.languages[0] as keyof typeof languageTemplates] || '');
      }

      // Join the room and get session
      const sessionData = await codeEditorService.joinRoom(roomId);
      setSession(sessionData);

      // Get room participants
      const participantsData = await roomService.getRoomUsers(roomId);
      setParticipants(participantsData);

      // Initialize WebSocket for real-time collaboration
      initializeWebSocket(sessionData.sessionId);
      
      toast.success('Successfully joined the room!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to join room');
      navigate('/rooms');
    } finally {
      setIsLoading(false);
    }
  };

  const initializeWebSocket = (sessionId: string) => {
    if (!roomId) return;

    // Code execution WebSocket
    const wsUrl = `ws://localhost:3000`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      setIsConnected(true);
      console.log('Code execution WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'execution_result' && message.sessionId === sessionId) {
        setIsExecuting(false);
        if (message.success) {
          setOutput(message.output || '');
          setError('');
          setExecutionTime(message.executionTime);
          toast.success('Code executed successfully!');
        } else {
          setError(message.error || 'Execution failed');
          setOutput('');
          toast.error('Code execution failed');
        }
      } else if (message.type === 'code_sync') {
        // Handle collaborative code synchronization
        if (message.userId !== user?.id) {
          setCode(message.code);
          setSelectedLanguage(message.language);
        }
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
      console.log('Code execution WebSocket disconnected');
    };

    // Terminal WebSocket for shared terminal access
    const terminalWsUrl = `ws://localhost:3000/terminal/${roomId}`;
    terminalWsRef.current = new WebSocket(terminalWsUrl);

    terminalWsRef.current.onopen = () => {
      console.log('Terminal WebSocket connected');
    };

    terminalWsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'output') {
        // Handle terminal output - you could display this in a terminal component
        console.log('Terminal output:', message.data);
      }
    };
  };

  const executeCode = async () => {
    if (!session) {
      toast.error('No active session');
      return;
    }

    setIsExecuting(true);
    setOutput('');
    setError('');
    setExecutionTime(null);

    try {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Use WebSocket for real-time execution
        wsRef.current.send(JSON.stringify({
          type: 'execute',
          sessionId: session.sessionId,
          code,
          language: selectedLanguage,
          filename: `main.${getFileExtension(selectedLanguage)}`,
        }));
      } else {
        // Fallback to HTTP API
        const result = await codeEditorService.executeCode(session.sessionId, {
          code,
          language: selectedLanguage,
          filename: `main.${getFileExtension(selectedLanguage)}`,
        });

        setIsExecuting(false);
        if (result.output) {
          setOutput(result.output);
          setError('');
          setExecutionTime(result.executionTime);
          toast.success('Code executed successfully!');
        }
        if (result.error) {
          setError(result.error);
          setOutput('');
          toast.error('Code execution failed');
        }
      }    } catch (error: any) {
      setIsExecuting(false);
      const errorMessage = error.message || 'Execution failed';
      setError(errorMessage);
      
      // Handle specific error cases with better user feedback
      if (errorMessage.includes('container stopped') || errorMessage.includes('container')) {
        toast.error('Container is not running. Please refresh the page and try again.');
      } else if (errorMessage.includes('409')) {
        toast.error('Code execution environment is not ready. Please try again in a moment.');
      } else {
        toast.error('Failed to execute code: ' + errorMessage);
      }
      
      console.error('Code execution error:', error);
    }
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setCode(languageTemplates[language as keyof typeof languageTemplates] || '');
    setOutput('');
    setError('');
    
    // Sync language change with other participants
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'language_change',
        language,
        userId: user?.id,
      }));
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    
    // Sync code changes with other participants (debounced)
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'code_sync',
        code: newCode,
        language: selectedLanguage,
        userId: user?.id,
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      executeCode();
    }
  };
  const getFileExtension = (language: string): string => {    const extensions = {
      python: 'py',
      javascript: 'js',
      go: 'go',
      cpp: 'cpp',
      java: 'java'
    };
    return extensions[language as keyof typeof extensions] || 'txt';
  };
  const refreshSession = async () => {
    toast.loading('Refreshing session...');
    try {
      // Close WebSocket connections
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (terminalWsRef.current) {
        terminalWsRef.current.close();
      }
      
      // Rejoin the room
      await initializeRoom();
      toast.dismiss();
      toast.success('Session refreshed successfully!');
    } catch (error: any) {
      toast.dismiss();
      toast.error('Failed to refresh session: ' + (error.message || 'Unknown error'));
    }
  };

  const leaveRoom = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (terminalWsRef.current) {
      terminalWsRef.current.close();
    }
    navigate('/rooms');
    toast.success('Left the room');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
        <span className="ml-3 text-gray-600">Joining room...</span>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">❌</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Room not found</h2>
        <p className="text-gray-600 mb-4">The room you're looking for doesn't exist or is no longer available.</p>
        <Button onClick={() => navigate('/rooms')}>Back to Rooms</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-gray-900">{room.roomName}</h1>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-500">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <p className="mt-2 text-gray-600">
            Collaborative coding room • {participants.length}/{room.maxUsers} participants
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => navigate('/rooms')}>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Rooms
          </Button>
          <Button variant="outline" onClick={leaveRoom}>
            Leave Room
          </Button>
        </div>
      </div>

      {/* Participants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Room Participants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {participants.map((participant) => (
              <div
                key={participant.userId}
                className="flex items-center space-x-2 bg-gray-50 rounded-full px-3 py-1"
              >
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-white">
                    {participant.username?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="text-sm text-gray-700">{participant.username}</span>
                {participant.isOwner && (
                  <span className="text-xs bg-yellow-100 text-yellow-800 rounded px-1">Owner</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Code Editor Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Code Execution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Programming Language
              </label>
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {room.languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </option>
                ))}
              </select>
            </div>            <div className="flex items-end space-x-2">
              <Button
                onClick={executeCode}
                isLoading={isExecuting}
                className="min-w-32"
              >
                {isExecuting ? 'Executing...' : 'Run Code'}
              </Button>
              <Button
                onClick={refreshSession}
                variant="outline"
                className="min-w-24"
                title="Refresh session if code execution fails"
              >
                🔄 Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Editor and Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Editor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Shared Code Editor</span>
              <span className="text-sm text-gray-500">Ctrl+Enter to run</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-96 p-4 font-mono text-sm border border-gray-300 rounded-md resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder={`Write your ${selectedLanguage} code here...`}
              style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace' }}
            />
          </CardContent>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Execution Output</span>
              {executionTime && (
                <span className="text-sm text-gray-500">
                  {executionTime}ms
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96 overflow-auto">
              {isExecuting ? (
                <div className="flex items-center justify-center h-full">
                  <LoadingSpinner />
                  <span className="ml-2 text-gray-500">Executing code...</span>
                </div>
              ) : (
                <>
                  {output && (
                    <div className="bg-gray-50 p-4 rounded-md mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Output:</h4>
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap font-mono">
                        {output}
                      </pre>
                    </div>
                  )}
                  
                  {error && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-md">
                      <h4 className="text-sm font-medium text-red-700 mb-2">Error:</h4>
                      <pre className="text-sm text-red-600 whitespace-pre-wrap font-mono">
                        {error}
                      </pre>
                    </div>
                  )}
                  
                  {!output && !error && !isExecuting && (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <div className="text-4xl mb-4">🚀</div>
                        <p>Run code to see the output here</p>
                        <p className="text-sm mt-2">Changes are shared with all room participants</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">💡</div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Collaboration Tips:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Code changes are synchronized in real-time with all participants</li>
                <li>• Press Ctrl+Enter to execute code</li>
                <li>• All participants can see the execution output</li>
                <li>• Language changes affect all participants in the room</li>
                <li>• Use the chat feature to communicate with team members</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoomCollaborationPage;
