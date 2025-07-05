import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import { cn } from '../utils';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getNavigationForRole = () => {
    const baseNavigation = [
      { name: 'Dashboard', href: '/dashboard', icon: '🏠' },
    ];

    if (user?.role === 'student') {
      return [
        ...baseNavigation,
        { name: 'Code Editor', href: '/code-editor', icon: '💻' },
        { name: 'Study Rooms', href: '/rooms', icon: '👥' },
        { name: 'My Room Sessions', href: '/sessions', icon: '📂' },
        { name: 'Browse Books', href: '/books', icon: '📚' },
        { name: 'Browse Videos', href: '/videos', icon: '🎥' },
        { name: 'Take Quizzes', href: '/ai-evaluations', icon: '📝' },
      ];
    } else if (user?.role === 'instructor' || user?.role === 'admin') {
      return [
        ...baseNavigation,
        { name: 'Code Editor', href: '/code-editor', icon: '💻' },
        { name: 'Manage Rooms', href: '/rooms', icon: '👥' },
        { name: 'My Room Sessions', href: '/sessions', icon: '📂' },
        { name: 'Manage Books', href: '/books', icon: '📚' },
        { name: 'Manage Videos', href: '/videos', icon: '🎥' },
        { name: 'Manage Evaluations', href: '/ai-evaluations', icon: '🤖' },
      ];
    }

    // Default navigation for any other role
    return baseNavigation;
  };

  const navigation = getNavigationForRole();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header for non-authenticated users */}
        <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">🎓</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Editron
                  </h1>
                  <p className="text-xs text-gray-500 -mt-1">Learn • Code • Collaborate</p>
                </div>
              </Link>
              
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center transform hover:scale-105 transition-transform duration-200">
                  <span className="text-white font-bold text-lg">🎓</span>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Editron
                  </h1>
                  <p className="text-xs text-gray-500 -mt-1">Learn • Code • Collaborate</p>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center space-x-2',
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    )}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {/* User Info */}
                <div className="hidden sm:block text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.role === 'student' ? '👨‍🎓 Student' : 
                     user?.role === 'instructor' ? '👨‍🏫 Instructor' : '👨‍💼 Admin'}
                  </div>
                </div>
                
                {/* Avatar */}
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                </div>
                
                {/* Logout Button */}
                <Button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  🚪 Logout
                </Button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 rounded-xl text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden" onClick={() => setIsSidebarOpen(false)}>
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Navigation</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <nav className="px-4 py-4 space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      'flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                    )}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-gray-200 mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🎓</span>
              <div>
                <p className="text-sm font-medium text-gray-900">Editron</p>
                <p className="text-xs text-gray-500">Empowering education through technology</p>
              </div>
            </div>
            
            <div className="text-sm text-gray-500 text-center sm:text-right">
              <p>© 2025 Editron. All rights reserved.</p>
              <p className="mt-1">Built with ❤️ for educators and learners</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export { Layout };
