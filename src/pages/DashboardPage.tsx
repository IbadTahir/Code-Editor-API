import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { codeEditorService, roomService } from '../services/codeEditorService';
import { bookService, videoService, aiEvaluationService } from '../services/educationalService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/Card';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/CommonComponents';
import { formatDate } from '../utils';
import type { CodeSession, Room, Book, Video } from '../types';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    sessions: 0,
    rooms: 0,
    books: 0,
    videos: 0,
    evaluations: 0
  });
  const [recentSessions, setRecentSessions] = useState<CodeSession[]>([]);
  const [recentRooms, setRecentRooms] = useState<Room[]>([]);  const [recentBooks, setRecentBooks] = useState<Book[]>([]);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        console.log('Dashboard: Fetching data from all APIs...');
        const [sessionsData, roomsData, booksData, videosData, evaluationsData] = await Promise.allSettled([
          codeEditorService.getUserSessions(1, 3),
          roomService.getRooms(1, 3),
          bookService.getBooks(1, 3),
          videoService.getVideos(1, 3),
          aiEvaluationService.getEvaluations(1, 3)
        ]);

        console.log('Dashboard: API results:', {
          sessions: sessionsData.status,
          rooms: roomsData.status,
          books: booksData.status,
          videos: videosData.status,
          evaluations: evaluationsData.status
        });        // Update stats and recent items with safe fallbacks
        if (sessionsData.status === 'fulfilled' && sessionsData.value) {
          setStats(prev => ({ ...prev, sessions: sessionsData.value.total || 0 }));
          setRecentSessions(sessionsData.value.data || []);
          console.log('Dashboard: Sessions loaded successfully');
        } else {
          console.log('Dashboard: Sessions not available:', sessionsData.status === 'rejected' ? sessionsData.reason?.message : 'Unknown error');
          setStats(prev => ({ ...prev, sessions: 0 }));
          setRecentSessions([]);
        }
        
        if (roomsData.status === 'fulfilled' && roomsData.value) {
          setStats(prev => ({ ...prev, rooms: roomsData.value.total || 0 }));
          setRecentRooms(roomsData.value.data || []);
          console.log('Dashboard: Rooms loaded successfully');
        } else {
          console.log('Dashboard: Rooms not available:', roomsData.status === 'rejected' ? roomsData.reason?.message : 'Unknown error');
          setStats(prev => ({ ...prev, rooms: 0 }));
          setRecentRooms([]);
        }
        
        if (booksData.status === 'fulfilled' && booksData.value) {
          setStats(prev => ({ ...prev, books: booksData.value.total || 0 }));
          setRecentBooks(booksData.value.data || []);
          console.log('Dashboard: Books loaded successfully');
        } else {
          console.log('Dashboard: Books not available:', booksData.status === 'rejected' ? booksData.reason?.message : 'Unknown error');
          setStats(prev => ({ ...prev, books: 0 }));
          setRecentBooks([]);
        }
        
        if (videosData.status === 'fulfilled' && videosData.value) {
          setStats(prev => ({ ...prev, videos: videosData.value.total || 0 }));
          setRecentVideos(videosData.value.data || []);
          console.log('Dashboard: Videos loaded successfully');
        } else {
          console.log('Dashboard: Videos not available:', videosData.status === 'rejected' ? videosData.reason?.message : 'Unknown error');
          setStats(prev => ({ ...prev, videos: 0 }));
          setRecentVideos([]);
        }
        
        if (evaluationsData.status === 'fulfilled' && evaluationsData.value) {
          setStats(prev => ({ ...prev, evaluations: evaluationsData.value.total || 0 }));
          console.log('Dashboard: Evaluations loaded successfully');
        } else {
          console.log('Dashboard: Evaluations not available:', evaluationsData.status === 'rejected' ? evaluationsData.reason?.message : 'Unknown error');
          setStats(prev => ({ ...prev, evaluations: 0 }));
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);
  const getStatCardsForRole = () => {
    const baseCards = [
      { title: 'Code Sessions', value: stats.sessions, icon: '💻', href: '/code-editor' },
    ];

    if (user?.role === 'student') {
      return [
        ...baseCards,
        { title: 'Available Rooms', value: stats.rooms, icon: '👥', href: '/rooms' },
        { title: 'Books to Read', value: stats.books, icon: '📚', href: '/books' },
        { title: 'Videos to Watch', value: stats.videos, icon: '🎥', href: '/videos' },
        { title: 'Quizzes Available', value: stats.evaluations, icon: '📝', href: '/ai-evaluations' },
      ];
    } else if (user?.role === 'instructor' || user?.role === 'admin') {
      return [
        ...baseCards,
        { title: 'Managed Rooms', value: stats.rooms, icon: '👥', href: '/rooms' },
        { title: 'Books Library', value: stats.books, icon: '📚', href: '/books' },
        { title: 'Video Library', value: stats.videos, icon: '🎥', href: '/videos' },
        { title: 'Evaluations', value: stats.evaluations, icon: '🤖', href: '/ai-evaluations' },
      ];
    }

    return baseCards;
  };

  const statCards = getStatCardsForRole();

  if (isLoading) {
    return (
      <div className="container mx-auto px-6">
        <LoadingSpinner size="lg" className="mt-12" />
      </div>
    );
  }
  return (
    <div className="max-w-7xl mx-auto">      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name || user?.email}!
        </h1>
        <p className="text-gray-600 mt-2">
          {user?.role === 'student' 
            ? "Here's what's available for your learning journey today."
            : "Here's your teaching and management dashboard overview."
          }
        </p>
        <div className="mt-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
            {user?.role || 'User'} Account
          </span>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className="text-3xl">{stat.icon}</div>
              </div>
              <Link to={stat.href}>
                <Button variant="ghost" size="sm" className="mt-3 w-full">
                  View All
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Code Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2">💻</span>
              Recent Code Sessions
            </CardTitle>
            <CardDescription>Your latest coding activities</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSessions.length > 0 ? (
              <div className="space-y-4">                {recentSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{session.language}</p>
                      <p className="text-sm text-gray-500">{formatDate(session.createdAt)}</p>
                    </div>
                    <Link to={session.sessionType === 'room' && session.roomId ? `/rooms/${session.roomId}` : '/code-editor'}>
                      <Button variant="outline" size="sm">
                        {session.sessionType === 'room' ? 'Join Room' : 'Open'}
                      </Button>
                    </Link>
                  </div>
                ))}                <Link to="/sessions">
                  <Button variant="ghost" className="w-full">View All Room Sessions</Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">💻</div>
                <p className="text-gray-500 mb-4">No code sessions yet</p>
                <Link to="/code-editor">
                  <Button>Start Coding</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Rooms */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2">👥</span>
              Active Rooms
            </CardTitle>
            <CardDescription>Collaborative coding spaces</CardDescription>
          </CardHeader>
          <CardContent>
            {recentRooms.length > 0 ? (
              <div className="space-y-4">                {recentRooms.map((room) => (
                  <div key={room.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{room.roomName || room.name}</p>
                      <p className="text-sm text-gray-500">{room.currentUsers || room.participantCount} participants</p>
                    </div>
                    <Link to={`/rooms/${room.roomId || room.id}`}>
                      <Button variant="outline" size="sm">Join</Button>
                    </Link>
                  </div>
                ))}
                <Link to="/rooms">
                  <Button variant="ghost" className="w-full">View All Rooms</Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">👥</div>
                <p className="text-gray-500 mb-4">No active rooms</p>
                <Link to="/rooms">
                  <Button>Create Room</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Books */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2">📚</span>
              Latest Books
            </CardTitle>
            <CardDescription>Recently added learning materials</CardDescription>
          </CardHeader>
          <CardContent>
            {recentBooks.length > 0 ? (
              <div className="space-y-4">                {recentBooks.map((book) => (
                  <div key={book.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{book.title}</p>
                      <p className="text-sm text-gray-500">Tags: {book.tags}</p>
                    </div>                    <Link to="/books">
                      <Button variant="outline" size="sm">Read</Button>
                    </Link>
                  </div>
                ))}
                <Link to="/books">
                  <Button variant="ghost" className="w-full">View All Books</Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📚</div>
                <p className="text-gray-500 mb-4">No books available yet</p>
                <Link to="/books">
                  <Button>Browse Books</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Videos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="mr-2">🎥</span>
              Latest Videos
            </CardTitle>
            <CardDescription>New video content for learning</CardDescription>
          </CardHeader>
          <CardContent>
            {recentVideos.length > 0 ? (
              <div className="space-y-4">                {recentVideos.map((video) => (
                  <div key={video.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{video.title}</p>
                      <p className="text-sm text-gray-500">by {video.teacher_username || 'Unknown'}</p>
                    </div>                    <Link to="/videos">
                      <Button variant="outline" size="sm">Watch</Button>
                    </Link>
                  </div>
                ))}
                <Link to="/videos">
                  <Button variant="ghost" className="w-full">View All Videos</Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🎥</div>
                <p className="text-gray-500 mb-4">No videos available yet</p>
                <Link to="/videos">
                  <Button>Browse Videos</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
