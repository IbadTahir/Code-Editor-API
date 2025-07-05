import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { videoService } from '../services/educationalService';
import { useAuth } from '../context/AuthContext';
import type { Video, VideoCreate } from '../types';

// Generate video thumbnail based on title and subject
const generateVideoThumbnail = (title: string, subject?: string) => {
  const colors = [
    'from-red-500 to-red-700',
    'from-blue-500 to-blue-700',
    'from-green-500 to-green-700',
    'from-purple-500 to-purple-700',
    'from-yellow-500 to-yellow-700',
    'from-pink-500 to-pink-700',
    'from-indigo-500 to-indigo-700',
    'from-teal-500 to-teal-700'
  ];
  
  const colorIndex = (title.length + (subject?.length || 0)) % colors.length;
  const color = colors[colorIndex];
  
  // Create initials from title
  const initials = title.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
  
  // Determine video type icon based on subject
  const getVideoIcon = (subject?: string) => {
    if (!subject) return '🎬';
    const subjectLower = subject.toLowerCase();
    if (subjectLower.includes('math')) return '📐';
    if (subjectLower.includes('science')) return '🔬';
    if (subjectLower.includes('history')) return '📜';
    if (subjectLower.includes('english')) return '📝';
    if (subjectLower.includes('programming') || subjectLower.includes('code')) return '💻';
    if (subjectLower.includes('art')) return '🎨';
    if (subjectLower.includes('music')) return '🎵';
    return '🎬';
  };
  
  return { color, initials, icon: getVideoIcon(subject) };
};

const VideosPage: React.FC = () => {
  const { user } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  
  // Edit and delete state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Form state
  const [formData, setFormData] = useState<VideoCreate>({
    title: '',
    description: '',
    video_url: '',
    subject: '',
    topic: '',
    notes_url: ''
  });

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const response = await videoService.getVideos(1, 100);
      setVideos(response.data);
    } catch (error) {
      toast.error('Failed to load videos');
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.video_url.trim() || !formData.subject.trim()) {
      toast.error('Title, video URL, and subject are required');
      return;
    }

    try {
      setCreating(true);
      await videoService.createVideo(formData);
      toast.success('Video created successfully!');
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        video_url: '',
        subject: '',
        topic: '',
        notes_url: ''
      });
      loadVideos();
    } catch (error) {
      toast.error('Failed to create video');
      console.error('Error creating video:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      description: video.description || '',
      video_url: video.video_url,
      subject: video.subject,
      topic: video.topic || '',
      notes_url: video.notes_url || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVideo) return;

    if (!formData.title.trim() || !formData.video_url.trim() || !formData.subject.trim()) {
      toast.error('Title, video URL, and subject are required');
      return;
    }

    try {
      setUpdating(true);
      
      // Use the real API to update the video
      const updatedVideo = await videoService.updateVideo(editingVideo.id, formData);

      // Update local state with response from backend
      setVideos(prevVideos => 
        prevVideos.map(video => 
          video.id === editingVideo.id ? updatedVideo : video
        )
      );

      toast.success('Video updated successfully!');
      setShowEditModal(false);
      setEditingVideo(null);
      setFormData({
        title: '',
        description: '',
        video_url: '',
        subject: '',
        topic: '',
        notes_url: ''
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update video');
      console.error('Error updating video:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    const videoToDelete = videos.find(v => v.id === videoId);
    const videoTitle = videoToDelete?.title || 'this video';
    
    if (!confirm(`Are you sure you want to delete "${videoTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(videoId);
      await videoService.deleteVideo(videoId);
      
      // Remove from local state
      setVideos(prevVideos => prevVideos.filter(video => video.id !== videoId));
      toast.success(`Video "${videoTitle}" deleted successfully!`);
    } catch (error: any) {
      console.error('Error deleting video:', error);
      
      // Handle specific error messages from the service
      if (error.message.includes('Service endpoint not found')) {
        toast.error('Backend services are not running. Please start all services first.');
      } else if (error.message.includes('Authentication required')) {
        toast.error('Please log in again to delete videos.');
      } else if (error.message.includes('only delete videos that you created')) {
        toast.error('You can only delete videos that you created.');
      } else if (error.message.includes('Video not found')) {
        toast.error('Video has already been deleted.');
        // Remove from local state if it was already deleted
        setVideos(prevVideos => prevVideos.filter(video => video.id !== videoId));
      } else {
        toast.error(`Failed to delete video: ${error.message}`);
      }
    } finally {
      setDeleting(null);
    }
  };

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const subjects = ['all', ...new Set(videos.map(video => video.subject))];

  const subjectFilteredVideos = selectedSubject === 'all' 
    ? filteredVideos 
    : filteredVideos.filter(video => video.subject === selectedSubject);

  const handlePlayVideo = (videoUrl: string) => {
    // Extract video ID from YouTube URL
    const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (videoIdMatch) {
      setPlayingVideo(videoIdMatch[1]);
    } else {
      toast.error('Invalid YouTube URL');
    }
  };

  const testConnection = async () => {
    try {
      setTestingConnection(true);
      
      // Test Educational Platform API
      const response = await videoService.getVideos(1, 1);
      
      toast.success('✅ Connection to Educational Platform API successful!');
      console.log('Connection test passed:', response);
      
    } catch (error: any) {
      console.error('Connection test failed:', error);
      
      if (error.message?.includes('Network Error') || error.code === 'ECONNREFUSED') {
        toast.error('❌ Connection failed: Educational Platform API is not accessible. Please check if the service is running on port 8000.');
      } else if (error.response?.status === 500) {
        toast.error('❌ Connection failed: Server error. The API is running but encountered an error.');
      } else {
        toast.error(`❌ Connection failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent">
                🎬 Video Library
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                {user?.role === 'student' 
                  ? 'Watch and learn from educational videos' 
                  : 'Manage and organize educational videos'}
              </p>
            </div>
            {user && (user.role === 'instructor' || user.role === 'admin') && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  ➕ Add New Video
                </Button>
                
                <Button
                  onClick={testConnection}
                  disabled={testingConnection}
                  className={`${
                    testingConnection 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700'
                  } text-white px-6 py-3 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200`}
                >
                  {testingConnection ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Testing...
                    </>
                  ) : (
                    <>
                      🔗 Test Connection
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <Input
                    placeholder="Search videos by title, subject, or topic..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-3 border-2 border-gray-200 focus:border-red-500 rounded-xl text-lg"
                  />
                </div>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  title="Switch to grid view"
                  className={`p-3 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="Switch to list view"
                  className={`p-3 rounded-lg transition-all ${viewMode === 'list' ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Subject Filter */}
            <div className="mt-4 flex flex-wrap gap-2">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedSubject === subject
                      ? 'bg-red-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {subject === 'all' ? '🎬 All Videos' : `📚 ${subject}`}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading amazing videos...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Videos Display */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {subjectFilteredVideos.map((video) => {
                  const thumbnail = generateVideoThumbnail(video.title, video.subject);
                  return (
                    <Card key={video.id} className="group overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white/90 backdrop-blur-sm border-0">
                      <div className="p-6 space-y-4">
                        {/* Video Thumbnail */}
                        <div className="aspect-video rounded-xl overflow-hidden relative cursor-pointer"
                             onClick={() => handlePlayVideo(video.video_url)}>
                          <div className={`w-full h-full bg-gradient-to-br ${thumbnail.color} flex items-center justify-center text-white relative group-hover:scale-105 transition-transform duration-300`}>
                            <div className="absolute inset-0 bg-black/20"></div>
                            <div className="relative z-10 text-center">
                              <div className="text-6xl mb-2">{thumbnail.icon}</div>
                              <div className="text-2xl font-bold">{thumbnail.initials}</div>
                            </div>
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                            </div>
                            <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 text-xs">
                              {video.subject}
                            </div>
                          </div>
                        </div>
                        
                        {/* Video Info */}
                        <div className="space-y-3">
                          <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-red-600 transition-colors">
                            {video.title}
                          </h3>
                          
                          {video.description && (
                            <p className="text-gray-600 text-sm line-clamp-2">
                              {video.description}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
                              </svg>
                              {video.subject}
                            </span>
                            {video.topic && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                {video.topic}
                              </span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 space-y-2">
                            <Button 
                              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg py-2 transform hover:scale-105 transition-all duration-200"
                              onClick={() => handlePlayVideo(video.video_url)}
                            >
                              ▶️ Watch Now
                            </Button>
                            
                            <div className="flex space-x-2">
                              {video.notes_url && (
                                <Button 
                                  className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg py-2 text-sm"
                                  onClick={() => window.open(video.notes_url, '_blank')}
                                >
                                  📝 Notes
                                </Button>
                              )}
                              
                              {user && (user.role === 'instructor' || user.role === 'admin') && (
                                <>
                                  <Button 
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm"
                                    onClick={() => handleEditVideo(video)}
                                    disabled={updating}
                                  >
                                    {updating && editingVideo?.id === video.id ? '⏳ Updating...' : '✏️ Edit'}
                                  </Button>
                                  <Button 
                                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg py-2 text-sm"
                                    onClick={() => handleDeleteVideo(video.id)}
                                    disabled={deleting === video.id}
                                  >
                                    {deleting === video.id ? '⏳ Deleting...' : '🗑️ Delete'}
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              // List View
              <div className="space-y-4">
                {subjectFilteredVideos.map((video) => {
                  const thumbnail = generateVideoThumbnail(video.title, video.subject);
                  return (
                    <Card key={video.id} className="p-6 hover:shadow-lg transition-all duration-200 bg-white/90 backdrop-blur-sm border-0">
                      <div className="flex items-center space-x-6">
                        {/* Thumbnail */}
                        <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer"
                             onClick={() => handlePlayVideo(video.video_url)}>
                          <div className={`w-full h-full bg-gradient-to-br ${thumbnail.color} flex items-center justify-center text-white relative group hover:scale-105 transition-transform duration-300`}>
                            <div className="text-2xl">{thumbnail.icon}</div>
                            <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                        
                        {/* Video Info */}
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-xl mb-2">{video.title}</h3>
                          {video.description && (
                            <p className="text-gray-600 text-sm mb-2 line-clamp-2">{video.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>📚 {video.subject}</span>
                            {video.topic && <span>📖 {video.topic}</span>}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex space-x-3">
                          <Button 
                            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-2 rounded-lg"
                            onClick={() => handlePlayVideo(video.video_url)}
                          >
                            ▶️ Watch Now
                          </Button>
                          
                          {video.notes_url && (
                            <Button 
                              className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg"
                              onClick={() => window.open(video.notes_url, '_blank')}
                            >
                              📝 Notes
                            </Button>
                          )}
                          
                          {user && (user.role === 'instructor' || user.role === 'admin') && (
                            <>
                              <Button 
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
                                onClick={() => handleEditVideo(video)}
                                disabled={updating}
                              >
                                {updating && editingVideo?.id === video.id ? '⏳ Updating...' : '✏️ Edit'}
                              </Button>
                              <Button 
                                className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg"
                                onClick={() => handleDeleteVideo(video.id)}
                                disabled={deleting === video.id}
                              >
                                {deleting === video.id ? '⏳ Deleting...' : '🗑️ Delete'}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Empty State */}
            {subjectFilteredVideos.length === 0 && (
              <div className="text-center py-20">
                <div className="text-8xl mb-4">🎬</div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">No videos found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery ? 'Try adjusting your search terms' : 'No videos have been added yet'}
                </p>
                {user && (user.role === 'instructor' || user.role === 'admin') && (
                  <Button 
                    onClick={() => setShowCreateModal(true)}
                    className="bg-gradient-to-r from-red-600 to-blue-600 hover:from-red-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl"
                  >
                    ➕ Add Your First Video
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        {/* Video Player Modal */}
        {playingVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg w-full max-w-4xl">
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-lg font-semibold">Video Player</h3>
                <button
                  onClick={() => setPlayingVideo(null)}
                  title="Close video player"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${playingVideo}?autoplay=1`}
                    title="Video Player"
                    className="w-full h-full rounded-lg"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Video Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Add New Video</h2>
                <form onSubmit={handleCreateVideo} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter video title"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Video URL *
                    </label>
                    <Input
                      value={formData.video_url}
                      onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                      placeholder="Enter YouTube URL"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      placeholder="Enter subject"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Topic
                    </label>
                    <Input
                      value={formData.topic}
                      onChange={(e) => setFormData({...formData, topic: e.target.value})}
                      placeholder="Enter topic"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Enter description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes URL
                    </label>
                    <Input
                      value={formData.notes_url}
                      onChange={(e) => setFormData({...formData, notes_url: e.target.value})}
                      placeholder="Enter notes URL (optional)"
                    />
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={creating}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    >
                      {creating ? 'Creating...' : 'Create Video'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}

        {/* Edit Video Modal */}
        {showEditModal && editingVideo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Edit Video</h2>
                <form onSubmit={handleUpdateVideo} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter video title"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Video URL *
                    </label>
                    <Input
                      value={formData.video_url}
                      onChange={(e) => setFormData({...formData, video_url: e.target.value})}
                      placeholder="Enter YouTube URL"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject *
                    </label>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                      placeholder="Enter subject"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Topic
                    </label>
                    <Input
                      value={formData.topic}
                      onChange={(e) => setFormData({...formData, topic: e.target.value})}
                      placeholder="Enter topic"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Enter description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes URL
                    </label>
                    <Input
                      value={formData.notes_url}
                      onChange={(e) => setFormData({...formData, notes_url: e.target.value})}
                      placeholder="Enter notes URL (optional)"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingVideo(null);
                        setFormData({
                          title: '',
                          description: '',
                          video_url: '',
                          subject: '',
                          topic: '',
                          notes_url: ''
                        });
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updating}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {updating ? 'Updating...' : 'Update Video'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideosPage;
