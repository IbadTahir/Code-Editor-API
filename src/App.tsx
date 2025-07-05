import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CodeEditorPage from './pages/CodeEditorPage';
import RoomsPage from './pages/RoomsPage';
import RoomCollaborationPage from './pages/RoomCollaborationPage';
import SessionsPage from './pages/SessionsPage';
import BooksPage from './pages/BooksPage';
import VideosPage from './pages/VideosPage';
import AIEvaluationsPage from './pages/AIEvaluationsPage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* Protected routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <DashboardPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/code-editor" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CodeEditorPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/rooms" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <RoomsPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/rooms/:roomId" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <RoomCollaborationPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/sessions" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <SessionsPage />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/books" 
                element={
                  <Layout>
                    <BooksPage />
                  </Layout>
                } 
              />
              <Route 
                path="/videos" 
                element={
                  <Layout>
                    <VideosPage />
                  </Layout>
                } 
              />
              <Route 
                path="/ai-evaluations" 
                element={
                  <Layout>
                    <AIEvaluationsPage />
                  </Layout>
                } 
              />
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  style: {
                    background: '#10b981',
                  },
                },
                error: {
                  style: {
                    background: '#ef4444',
                  },
                },
              }}
            />
          </div>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
