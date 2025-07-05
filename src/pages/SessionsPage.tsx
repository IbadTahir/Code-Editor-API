import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { codeEditorService } from '../services/codeEditorService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LoadingSpinner } from '../components/CommonComponents';
import { toast } from 'react-hot-toast';
import { formatDate } from '../utils';
import type { CodeSession } from '../types';

const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<CodeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const response = await codeEditorService.getUserSessions(1, 50);
      // Filter to only include room sessions
      const roomSessions = response.data.filter(session => session.sessionType === 'room');
      setSessions(roomSessions);
    } catch (error: any) {
      console.error('Failed to fetch sessions:', error);
      toast.error('Failed to load room sessions');
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      await codeEditorService.terminateSession(sessionId);
      toast.success('Session terminated successfully');
      fetchSessions(); // Refresh the list
    } catch (error: any) {
      toast.error('Failed to terminate session');
    }
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (session.roomName && session.roomName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || session.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getSessionIcon = (sessionType: string) => {
    return sessionType === 'room' ? '👥' : '💻';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'terminated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLanguageColor = (language: string) => {    const colors = {
      python: 'bg-blue-100 text-blue-800',
      javascript: 'bg-yellow-100 text-yellow-800',
      go: 'bg-cyan-100 text-cyan-800',
      cpp: 'bg-purple-100 text-purple-800',
      java: 'bg-orange-100 text-orange-800'
    };
    return colors[language as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
        <span className="ml-3 text-gray-600">Loading sessions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Room Sessions</h1>
          <p className="mt-2 text-gray-600">
            View and manage your collaborative room sessions
          </p>
        </div>
        <div className="flex space-x-3">
          <Link to="/rooms">
            <Button>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Join Room
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search room sessions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={fetchSessions} className="w-full">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions List */}
      {filteredSessions.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredSessions.length} room session{filteredSessions.length !== 1 ? 's' : ''}
            </p>
          </div>
          {filteredSessions.map((session) => (
            <Card key={session.sessionId} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="text-3xl">
                      {getSessionIcon(session.sessionType)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {session.sessionType === 'room' && session.roomName 
                            ? session.roomName 
                            : `${session.sessionType === 'solo' ? 'Solo' : 'Room'} Session`
                          }
                        </h3>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                          {session.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <span>Language:</span>
                          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLanguageColor(session.language)}`}>
                            {session.language}
                          </span>
                        </div>
                        
                        {session.sessionType === 'room' && (
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                            </svg>
                            <span>{session.currentUsers || 1}/{session.maxUsers || 1}</span>
                          </div>
                        )}
                        
                        <div>
                          Created: {formatDate(session.createdAt)}
                        </div>
                      </div>
                      
                      {session.languages && session.languages.length > 1 && (
                        <div className="mt-2">
                          <span className="text-sm text-gray-600">Supported languages: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {session.languages.map((lang) => (
                              <span
                                key={lang}
                                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getLanguageColor(lang)}`}
                              >
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {session.sessionType === 'room' && session.status === 'active' ? (
                      <Link to={`/rooms/${session.roomId}`}>
                        <Button size="sm">
                          Join Room
                        </Button>
                      </Link>
                    ) : session.sessionType === 'solo' && session.status === 'active' ? (
                      <Link to="/code-editor">
                        <Button size="sm">
                          Resume
                        </Button>
                      </Link>
                    ) : null}
                    
                    {session.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => terminateSession(session.sessionId)}
                      >
                        Terminate
                      </Button>
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(session.sessionId);
                        toast.success('Session ID copied to clipboard!');
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <div className="text-6xl mb-4">📂</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterStatus !== 'all' 
                  ? 'No room sessions match your filters' 
                  : 'No room sessions yet'
                }
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || filterStatus !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Join a collaborative room to start coding with others!'
                }
              </p>
              {(!searchTerm && filterStatus === 'all') && (
                <div className="flex justify-center space-x-3">
                  <Link to="/rooms">
                    <Button>
                      Join a Room
                    </Button>
                  </Link>
                  <Link to="/rooms">
                    <Button variant="outline">
                      Browse Rooms
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      {sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {sessions.length}
                </div>
                <div className="text-sm text-gray-600">Total Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {sessions.filter(s => s.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Active Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {sessions.filter(s => s.sessionType === 'room').length}
                </div>
                <div className="text-sm text-gray-600">Room Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {new Set(sessions.map(s => s.language)).size}
                </div>
                <div className="text-sm text-gray-600">Languages Used</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SessionsPage;
