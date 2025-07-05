import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { roomService, codeEditorService } from '../services/codeEditorService';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { LoadingSpinner } from '../components/CommonComponents';
import { toast } from 'react-hot-toast';
import type { Room } from '../types';

// Role-based room creation limits
const ROOM_LIMITS = {
  student: {
    maxUsers: 8,
    maxDuration: 8, // 8 hours
    maxActiveRooms: 2,
    allowedTypes: ['study', 'project'],
    resourceTier: 'basic',
    canMakePublic: false,
    maxLanguages: 3,
  },
  instructor: {
    maxUsers: 30,
    maxDuration: 168, // 1 week
    maxActiveRooms: 5,
    allowedTypes: ['study', 'class', 'project'],
    resourceTier: 'pro',
    canMakePublic: true,
    maxLanguages: 10,
  },
  admin: {
    maxUsers: 50,
    maxDuration: 720, // 1 month
    maxActiveRooms: 10,
    allowedTypes: ['study', 'class', 'project'],
    resourceTier: 'enterprise',
    canMakePublic: true,
    maxLanguages: 999,
  }
};

interface LanguageInfo {
  language: string;
  displayName: string;
  version: string;
  tier: string;
  description: string;
  extensions: string[];
}

const RoomsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableLanguages, setAvailableLanguages] = useState<LanguageInfo[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [newRoom, setNewRoom] = useState({
    roomName: '',
    languages: ['python'],
    maxUsers: 5,
    duration: 4, // Hours - default for students
    roomType: 'study' as 'study' | 'class' | 'project',
    isPublic: false,
    description: '',
  });

  useEffect(() => {
    fetchRooms();
    loadAvailableLanguages();
    
    // Set default room settings based on user role
    if (user?.role === 'student') {
      setNewRoom(prev => ({
        ...prev,
        maxUsers: 4,
        duration: 4,
        roomType: 'study',
        isPublic: false
      }));
    } else if (user?.role === 'instructor' || user?.role === 'admin') {
      setNewRoom(prev => ({
        ...prev,
        maxUsers: 20,
        duration: 24,
        roomType: 'class',
        isPublic: true
      }));
    }
  }, [user]);

  // Helper functions for role-based restrictions
  const getUserLimits = () => {
    if (!user?.role) return ROOM_LIMITS.student;
    return ROOM_LIMITS[user.role as keyof typeof ROOM_LIMITS] || ROOM_LIMITS.student;
  };

  const getMaxUsersOptions = () => {
    const limits = getUserLimits();
    const maxUsers = limits.maxUsers;
    const options = [];
    
    for (let i = 2; i <= Math.min(maxUsers, 20); i += (i < 10 ? 1 : 2)) {
      options.push(i);
    }
    
    if (maxUsers > 20) {
      options.push(25, 30);
      if (maxUsers > 30) {
        options.push(40, 50);
      }
    }
    
    return options;
  };

  const getDurationOptions = () => {
    const limits = getUserLimits();
    const options = [
      { value: 2, label: '2 hours' },
      { value: 4, label: '4 hours' },
      { value: 8, label: '8 hours' },
    ];
    
    if (limits.maxDuration >= 24) {
      options.push(
        { value: 24, label: '1 day' },
        { value: 72, label: '3 days' }
      );
    }
    
    if (limits.maxDuration >= 168) {
      options.push({ value: 168, label: '1 week' });
    }
    
    if (limits.maxDuration >= 720) {
      options.push({ value: 720, label: '1 month' });
    }
    
    return options.filter(option => option.value <= limits.maxDuration);
  };

  const validateRoomCreation = () => {
    const limits = getUserLimits();
    const errors = [];

    if (!newRoom.roomName.trim()) {
      errors.push('Room name is required');
    }

    if (newRoom.roomName.length > 50) {
      errors.push('Room name must be less than 50 characters');
    }

    if (newRoom.languages.length === 0) {
      errors.push('At least one programming language is required');
    }

    if (newRoom.languages.length > limits.maxLanguages) {
      errors.push(`Maximum ${limits.maxLanguages} languages allowed for ${user?.role}s`);
    }

    if (newRoom.maxUsers > limits.maxUsers) {
      errors.push(`Maximum ${limits.maxUsers} users allowed for ${user?.role}s`);
    }

    if (newRoom.duration > limits.maxDuration) {
      errors.push(`Maximum ${limits.maxDuration} hours duration allowed for ${user?.role}s`);
    }

    if (!limits.allowedTypes.includes(newRoom.roomType)) {
      errors.push(`Room type '${newRoom.roomType}' not allowed for ${user?.role}s`);
    }

    if (newRoom.isPublic && !limits.canMakePublic) {
      errors.push(`${user?.role}s cannot create public rooms`);
    }

    return errors;
  };
  const loadAvailableLanguages = async () => {
    setIsLoadingLanguages(true);
    setServiceStatus('checking');
    try {
      const response = await codeEditorService.getAvailableLanguages();
      setAvailableLanguages(response.availableLanguages);
      setServiceStatus('online');
      
      // Set first 2 languages as default selection for room creation
      const defaultLanguages = response.availableLanguages.slice(0, 2).map(lang => lang.language);
      setNewRoom(prev => ({
        ...prev,
        languages: defaultLanguages
      }));
    } catch (error: any) {
      console.error('Failed to load available languages:', error);
      setServiceStatus('offline');
      
      // Fallback to basic languages when service is offline
      const fallbackLanguages = [
        { language: 'python', displayName: 'Python', version: 'latest', tier: 'low', description: 'Python runtime', extensions: ['.py'] },
        { language: 'javascript', displayName: 'JavaScript (Node.js)', version: 'latest', tier: 'low', description: 'JavaScript runtime', extensions: ['.js'] },
        { language: 'go', displayName: 'Go', version: 'latest', tier: 'low', description: 'Go runtime', extensions: ['.go'] },
        { language: 'cpp', displayName: 'C++', version: 'latest', tier: 'medium', description: 'C++ runtime', extensions: ['.cpp'] },
        { language: 'java', displayName: 'Java', version: 'latest', tier: 'medium', description: 'Java runtime', extensions: ['.java'] }
      ];
      setAvailableLanguages(fallbackLanguages);
      
      // Set first 2 fallback languages as default selection
      setNewRoom(prev => ({
        ...prev,
        languages: ['python', 'javascript']
      }));
    } finally {
      setIsLoadingLanguages(false);
    }
  };  const fetchRooms = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching rooms...', { searchTerm });
      const response = await roomService.getRooms(1, 20, searchTerm);
      console.log('Rooms response:', response);
      setRooms(response.data);
    } catch (error: any) {
      console.error('Failed to fetch rooms:', error);
        // Add mock data for testing if API fails
      const mockRooms = [
        {
          id: 'mock-room-1',
          roomId: 'mock-room-1',
          roomName: 'Python Study Group',
          name: 'Python Study Group',
          languages: ['python', 'javascript'],
          maxUsers: 5,
          currentUsers: 2,
          containerId: 'container-1',
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          createdBy: 'user-1',
          isActive: true,
          participantCount: 2,
          description: 'A collaborative Python learning room',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          resourceTier: 'pro'
        },
        {
          id: 'mock-room-2',
          roomId: 'mock-room-2',
          roomName: 'JavaScript Workshop',
          name: 'JavaScript Workshop',
          languages: ['javascript', 'typescript'],
          maxUsers: 8,
          currentUsers: 3,
          containerId: 'container-2',
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString(),
          createdBy: 'user-2',
          isActive: true,
          participantCount: 3,
          description: 'JavaScript and TypeScript workshop',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          resourceTier: 'pro'
        }
      ];
      
      // Show mock data when API fails (for testing)
      if (import.meta.env.DEV) {
        console.log('Using mock rooms for development');
        setRooms(mockRooms);
        toast.error('API connection failed, showing mock data');
      } else {
        setRooms([]);
        toast.error('Failed to fetch rooms');
      }
    } finally {
      setIsLoading(false);
    }
  };  const createRoom = async () => {
    // Validate room creation
    const validationErrors = validateRoomCreation();
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => toast.error(error));
      return;
    }

    setIsCreatingRoom(true);
    try {
      const limits = getUserLimits();
      
      const result = await roomService.createRoom({
        roomName: newRoom.roomName,
        languages: newRoom.languages,
        maxUsers: newRoom.maxUsers,
        duration: newRoom.duration,
        roomType: newRoom.roomType,
        isPublic: newRoom.isPublic,
        description: newRoom.description,
        resourceTier: limits.resourceTier,
      });

      if (result.success) {
        toast.success(`Room created successfully! Duration: ${newRoom.duration} hours`);
        setShowCreateModal(false);
        
        // Reset room state with role-appropriate defaults
        const defaultLanguages = availableLanguages.slice(0, 2).map(lang => lang.language);
        setNewRoom({
          roomName: '',
          languages: defaultLanguages,
          maxUsers: user?.role === 'student' ? 4 : 20,
          duration: user?.role === 'student' ? 4 : 24,
          roomType: user?.role === 'student' ? 'study' : 'class',
          isPublic: user?.role !== 'student',
          description: '',
        });
        
        // Refresh the rooms list
        fetchRooms();
      }
    } catch (error: any) {
      console.error('Room creation error:', error);
      const errorMessage = error.message || 'Failed to create room';
      
      // Provide helpful error messages based on error type
      if (errorMessage.includes('Unable to connect') || errorMessage.includes('Network connection error')) {
        toast.error('Backend service is not running. Please start the code editor service (API1) on port 3003.');
      } else if (errorMessage.includes('Docker')) {
        toast.error('Docker is not running or not properly configured. Please ensure Docker Desktop is running.');
      } else if (errorMessage.includes('endpoint not found')) {
        toast.error('Room creation service is not available. Please check if the code editor API is properly configured.');
      } else if (errorMessage.includes('Server error')) {
        toast.error('Server error occurred. Please try again in a few moments.');
      } else if (errorMessage.includes('limit')) {
        toast.error(`Room creation failed: ${errorMessage}`);
      } else {
        toast.error(errorMessage);
      }
      
      // Show additional help for common issues
      if (errorMessage.includes('Unable to connect') || !navigator.onLine) {
        setTimeout(() => {
          toast('💡 Tip: Make sure to run "START_SERVICES.bat" or check README.md for setup instructions', {
            duration: 5000,
            icon: '💡'
          });
        }, 2000);
      }
    } finally {
      setIsCreatingRoom(false);
    }
  };  const resetRoomForm = () => {
    const defaultLanguages = availableLanguages.slice(0, 2).map(lang => lang.language);
    const limits = getUserLimits();
    
    setNewRoom({
      roomName: '',
      languages: defaultLanguages,
      maxUsers: user?.role === 'student' ? 4 : Math.min(20, limits.maxUsers),
      duration: user?.role === 'student' ? 4 : 24,
      roomType: user?.role === 'student' ? 'study' : 'class',
      isPublic: limits.canMakePublic ? false : false,
      description: '',
    });
  };

  const handleJoinRoom = async (roomId: string) => {    try {
      toast.loading('Joining room...');
      await roomService.joinRoom(roomId);
      toast.dismiss();
      toast.success('Successfully joined room!');
      
      // Navigate to the room collaboration page
      navigate(`/rooms/${roomId}`);
    } catch (error: any) {
      toast.dismiss();
      console.error('Failed to join room:', error);
      toast.error(error.message || 'Failed to join room');
    }
  };
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // Debounce the search to avoid too many API calls
    setTimeout(() => {
      if (value === searchTerm) {
        fetchRooms();
      }
    }, 500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
        <span className="ml-3 text-gray-600">Loading rooms...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Service Status Banner */}
      {serviceStatus === 'offline' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Backend Service Offline
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  The code editor service is not running. Room creation and execution features may not work properly.
                </p>
                <div className="mt-3">
                  <strong>To fix this, run one of these commands:</strong>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li><code className="bg-yellow-100 px-1 rounded text-xs">START_SERVICES.bat</code> (Windows)</li>
                    <li><code className="bg-yellow-100 px-1 rounded text-xs">./start-all.bat</code> (Alternative)</li>
                    <li>Or see <code className="bg-yellow-100 px-1 rounded text-xs">README.md</code> for manual setup</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="ml-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 text-xs px-3 py-1 rounded transition-colors"
              >
                🔄 Recheck
              </button>
            </div>
          </div>
        </div>
      )}

      {serviceStatus === 'online' && (
        <div className="bg-green-50 border border-green-200 rounded-md p-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                ✅ All services are online and ready for room creation and code execution
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.role === 'student' ? 'Collaboration Rooms' : 'Manage Collaboration Rooms'}
          </h1>
          <p className="mt-2 text-gray-600">
            {user?.role === 'student' 
              ? 'Create study groups or join coding rooms to collaborate with others'
              : 'Create and manage coding rooms for collaborative learning'}
          </p>
          {user?.role === 'student' && (
            <div className="mt-2 text-sm text-blue-600">
              💡 As a student, you can create study groups (max {getUserLimits().maxUsers} users, {getUserLimits().maxDuration}h duration)
            </div>
          )}
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          disabled={serviceStatus === 'offline'}
          className={serviceStatus === 'offline' ? 'opacity-50 cursor-not-allowed' : ''}
          title={serviceStatus === 'offline' ? 'Backend service is offline. Please start the services first.' : ''}
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {user?.role === 'student' ? 'Create Study Group' : 'Create Room'}
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">              <Input
                placeholder="Search rooms..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>
            <Button variant="outline" onClick={fetchRooms}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>      {/* Rooms Grid */}
      {rooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room: any) => (
            <Card key={room.roomId} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{room.roomName}</CardTitle>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        room.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {room.status}
                      </span>
                      <span className="text-sm text-gray-500">
                        {room.currentUsers}/{room.maxUsers} users
                      </span>
                      {room.roomType && (
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          room.roomType === 'study' 
                            ? 'bg-purple-100 text-purple-800' 
                            : room.roomType === 'class' 
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {room.roomType === 'study' ? '📚 Study' : 
                           room.roomType === 'class' ? '🏫 Class' : '💼 Project'}
                        </span>
                      )}
                    </div>
                    {room.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{room.description}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Languages */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Languages:</h4>
                    <div className="flex flex-wrap gap-1">
                      {room.languages.map((lang: string) => (
                        <span
                          key={lang}
                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Button 
                      className="flex-1" 
                      size="sm"
                      disabled={room.currentUsers >= room.maxUsers}
                      onClick={() => handleJoinRoom(room.roomId)}
                    >
                      {room.currentUsers >= room.maxUsers ? 'Full' : 'Join Room'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(room.roomId);
                        toast.success('Room ID copied to clipboard!');
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
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No rooms found' : 'No rooms available'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchTerm 
                  ? 'No rooms match your search criteria. Try different keywords.' 
                  : user?.role === 'student'
                    ? 'Create a study group or wait for rooms to be available!'
                    : 'Be the first to create a collaboration room!'
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowCreateModal(true)}>
                  {user?.role === 'student' ? 'Create Study Group' : 'Create Your First Room'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-start justify-center z-50 p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md my-2 sm:my-4 min-h-0 max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)] flex flex-col">
            {/* Fixed Header */}
            <div className="p-3 sm:p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-medium text-gray-900 truncate">Create New Room</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {user?.role === 'student' 
                    ? `Max ${getUserLimits().maxUsers} users, ${getUserLimits().maxDuration}h`
                    : `Max ${getUserLimits().maxUsers} users, ${getUserLimits().maxDuration}h`
                  }
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetRoomForm();
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-3 sm:p-4 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-3">
                {serviceStatus === 'offline' && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="flex">
                      <svg className="flex-shrink-0 h-4 w-4 text-red-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-2">
                        <p className="text-xs text-red-700">
                          <strong>Warning:</strong> Backend service is offline. Room creation will not work until services are started.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                <Input
                  label="Room Name"
                  value={newRoom.roomName}
                  onChange={(e) => setNewRoom({ ...newRoom, roomName: e.target.value })}
                  placeholder="Enter room name"
                  maxLength={50}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room Type
                  </label>
                  <select
                    value={newRoom.roomType}
                    onChange={(e) => setNewRoom({ ...newRoom, roomType: e.target.value as any })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    {getUserLimits().allowedTypes.map(type => (
                      <option key={type} value={type}>
                        {type === 'study' ? '📚 Study Group' : 
                         type === 'class' ? '🏫 Class/Workshop' : 
                         '💼 Project Collaboration'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Languages (Max {getUserLimits().maxLanguages})
                  </label>
                  <div className="space-y-1 max-h-20 overflow-y-auto border rounded-md p-2 bg-gray-50">
                    {isLoadingLanguages ? (
                      <div className="text-xs text-gray-500">Loading...</div>
                    ) : (
                      availableLanguages.slice(0, 5).map((lang) => (
                        <label key={lang.language} className="flex items-center space-x-2 text-xs">
                          <input
                            type="checkbox"
                            checked={newRoom.languages.includes(lang.language)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (newRoom.languages.length < getUserLimits().maxLanguages) {
                                  setNewRoom({
                                    ...newRoom,
                                    languages: [...newRoom.languages, lang.language]
                                  });
                                } else {
                                  toast.error(`Max ${getUserLimits().maxLanguages} languages`);
                                }
                              } else {
                                setNewRoom({
                                  ...newRoom,
                                  languages: newRoom.languages.filter(l => l !== lang.language)
                                });
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                            disabled={!newRoom.languages.includes(lang.language) && newRoom.languages.length >= getUserLimits().maxLanguages}
                          />
                          <span className={`${!newRoom.languages.includes(lang.language) && newRoom.languages.length >= getUserLimits().maxLanguages ? 'text-gray-400' : 'text-gray-700'}`}>
                            {lang.displayName}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Selected: {newRoom.languages.length}/{getUserLimits().maxLanguages}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Users
                    </label>
                    <select
                      value={newRoom.maxUsers}
                      onChange={(e) => setNewRoom({ ...newRoom, maxUsers: parseInt(e.target.value) })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      {getMaxUsersOptions().map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration
                    </label>
                    <select
                      value={newRoom.duration}
                      onChange={(e) => setNewRoom({ ...newRoom, duration: parseInt(e.target.value) })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      {getDurationOptions().map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Input
                  label="Description (Optional)"
                  value={newRoom.description}
                  onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                  placeholder="What will you work on?"
                  maxLength={200}
                />

                {getUserLimits().canMakePublic && (
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={newRoom.isPublic}
                      onChange={(e) => setNewRoom({ ...newRoom, isPublic: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                    />
                    <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                      Make room publicly visible
                      <span className="block text-xs text-gray-500">
                        Public rooms can be discovered by anyone
                      </span>
                    </label>
                  </div>
                )}

                {user?.role === 'student' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                    <div className="flex">
                      <svg className="flex-shrink-0 h-4 w-4 text-blue-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-2">
                        <p className="text-xs text-blue-700">
                          <strong>Student limits:</strong> Max {getUserLimits().maxUsers} users, {getUserLimits().maxDuration}h duration
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="p-3 sm:p-4 border-t border-gray-200 flex-shrink-0">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetRoomForm();
                  }}
                  className="flex-1 text-sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={createRoom}
                  isLoading={isCreatingRoom}
                  disabled={!newRoom.roomName.trim() || newRoom.languages.length === 0 || validateRoomCreation().length > 0 || serviceStatus === 'offline'}
                  className="flex-1 text-sm"
                  title={serviceStatus === 'offline' ? 'Cannot create room while backend service is offline' : ''}
                >
                  {serviceStatus === 'offline' ? 'Service Offline' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomsPage;
