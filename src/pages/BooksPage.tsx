import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { bookService } from '../services/educationalService';
import { useAuth } from '../context/AuthContext';
import type { Book, BookCreate } from '../types';

// Generate thumbnail based on book title
const generateBookThumbnail = (title: string) => {
  const colors = [
    'from-blue-500 to-blue-700',
    'from-purple-500 to-purple-700', 
    'from-green-500 to-green-700',
    'from-red-500 to-red-700',
    'from-yellow-500 to-yellow-700',
    'from-indigo-500 to-indigo-700',
    'from-pink-500 to-pink-700',
    'from-teal-500 to-teal-700'
  ];
  
  const colorIndex = title.length % colors.length;
  const color = colors[colorIndex];
  const initials = title.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
  
  return { color, initials };
};

const BooksPage: React.FC = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [managingLinksBook, setManagingLinksBook] = useState<Book | null>(null);

  // Form state for books
  const [formData, setFormData] = useState<BookCreate>({
    title: '',
    copies_owned: 1,
    tags: '',
    file_path: ''
  });

  // Form state for link management
  const [linkFormData, setLinkFormData] = useState({
    file_path: ''
  });

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const response = await bookService.getBooks(1, 100);
      setBooks(response.data);
      
      // Show success message only on first load if there are books
      if (response.data.length > 0 && books.length === 0) {
        toast.success(`Loaded ${response.data.length} books successfully!`);
      }
    } catch (error: any) {
      console.error('Error loading books:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('Network Error') || error.code === 'ECONNREFUSED') {
        toast.error('Unable to connect to Educational Platform API. Please ensure all services are running.');
      } else if (error.response?.status === 500) {
        toast.error('Server error occurred. Please try again or contact support.');
      } else if (error.response?.status === 401) {
        toast.error('Authentication failed. Please refresh the page and try again.');
      } else {
        toast.error(error.message || 'Failed to load books. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.file_path.trim()) {
      toast.error('Title and file path are required');
      return;
    }

    try {
      setCreating(true);
      await bookService.createBook(formData);
      toast.success('Book created successfully!');
      setShowCreateModal(false);
      setFormData({
        title: '',
        copies_owned: 1,
        tags: '',
        file_path: ''
      });
      loadBooks();
    } catch (error) {
      toast.error('Failed to create book');
      console.error('Error creating book:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    setFormData({
      title: book.title,
      copies_owned: book.copies_owned,
      tags: book.tags || '',
      file_path: book.file_path || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook || !formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setUpdating(true);
      
      // Try to update via backend API first
      const updatedBook = await bookService.updateBook(editingBook.id, formData);

      // Update local state with response from backend
      setBooks(prevBooks => 
        prevBooks.map(book => 
          book.id === editingBook.id ? updatedBook : book
        )
      );

      toast.success('Book updated successfully!');
      setShowEditModal(false);
      setEditingBook(null);
      setFormData({
        title: '',
        copies_owned: 1,
        tags: '',
        file_path: ''
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update book');
      console.error('Error updating book:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    if (!window.confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(bookId);
      
      // Use the real API to delete the book
      await bookService.deleteBook(bookId);
      
      // Remove from local state after successful deletion
      setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
      
      toast.success('Book deleted successfully!');
    } catch (error: any) {
      console.error('Delete book error:', error);
      
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please refresh the page and try again, or check if you are properly logged in.');
      } else if (error.response?.status === 403) {
        toast.error('Permission denied. Only instructors and admins can delete books.');
      } else if (error.message.includes('active lendings')) {
        toast.error('Cannot delete book with active lendings');
      } else if (error.response?.status === 404) {
        toast.error('Book not found. It may have already been deleted.');
      } else if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        toast.error('Unable to connect to the server. Please check if all services are running.');
      } else {
        toast.error(error.response?.data?.detail || error.message || 'Failed to delete book');
      }
    } finally {
      setDeleting(null);
    }
  };

  const handleReadBook = (book: Book) => {
    // Check if file_path exists and is not empty
    if (!book.file_path || book.file_path.trim() === '') {
      // Show a more helpful error message for missing file paths
      toast.error(`"${book.title}" doesn't have a file path set. Please edit the book to add a file path.`, {
        duration: 4000,
        style: {
          background: '#FEF3C7',
          color: '#92400E',
          border: '1px solid #F59E0B'
        }
      });
      return;
    }

    try {
      let fileUrl: string;
      
      // Check if it's already a complete URL (starts with http)
      if (book.file_path.startsWith('http')) {
        fileUrl = book.file_path;
      } else {
        // For local files, use the Educational Platform API file serving endpoint
        fileUrl = `http://localhost:8000/api/v1/files/serve/${encodeURIComponent(book.file_path)}`;
      }
      
      // Add loading state and success feedback
      toast.loading(`Opening "${book.title}"...`, { duration: 2000 });
      
      // Open in new tab/window
      const newWindow = window.open(fileUrl, '_blank', 'noopener,noreferrer');
      
      // Check if popup was blocked
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        toast.error('Popup blocked! Please allow popups for this site or try again.');
        return;
      }
      
      // Success feedback
      setTimeout(() => {
        toast.success(`📖 Opened "${book.title}" in new tab`);
      }, 500);
      
    } catch (error: any) {
      console.error('Error opening book:', error);
      toast.error(`Failed to open "${book.title}". Please check if the file exists.`);
    }
  };

  const filteredBooks = books.filter(book =>
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (book.tags && book.tags.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categories = ['all', ...new Set(books.flatMap(book => 
    book.tags ? book.tags.split(',').map(tag => tag.trim()) : []
  ))];

  const categoryFilteredBooks = selectedCategory === 'all' 
    ? filteredBooks 
    : filteredBooks.filter(book => 
        book.tags?.split(',').map(tag => tag.trim()).includes(selectedCategory)
      );

  // PDF Link Management Functions
  const handleManageLinks = (book: Book) => {
    setManagingLinksBook(book);
    setLinkFormData({
      file_path: book.file_path || ''
    });
    setShowLinkModal(true);
  };

  const handleUpdateBookLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingLinksBook) return;

    if (!linkFormData.file_path.trim()) {
      toast.error('PDF link/path is required');
      return;
    }

    try {
      setUpdating(true);
      
      // Update only the file_path
      const updatedBook = await bookService.updateBook(managingLinksBook.id, {
        title: managingLinksBook.title,
        copies_owned: managingLinksBook.copies_owned,
        tags: managingLinksBook.tags || '',
        file_path: linkFormData.file_path
      });

      // Update local state
      setBooks(prevBooks => 
        prevBooks.map(book => 
          book.id === managingLinksBook.id ? updatedBook : book
        )
      );

      toast.success('PDF link updated successfully!');
      setShowLinkModal(false);
      setManagingLinksBook(null);
      setLinkFormData({ file_path: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update PDF link');
      console.error('Error updating book link:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleRemoveBookLink = async () => {
    if (!managingLinksBook) return;
    
    if (!confirm('Are you sure you want to remove the PDF link? Students will not be able to read this book.')) {
      return;
    }

    try {
      setUpdating(true);
      
      // Remove the file_path (set to empty)
      const updatedBook = await bookService.updateBook(managingLinksBook.id, {
        title: managingLinksBook.title,
        copies_owned: managingLinksBook.copies_owned,
        tags: managingLinksBook.tags || '',
        file_path: ''
      });

      // Update local state
      setBooks(prevBooks => 
        prevBooks.map(book => 
          book.id === managingLinksBook.id ? updatedBook : book
        )
      );

      toast.success('PDF link removed successfully!');
      setShowLinkModal(false);
      setManagingLinksBook(null);
      setLinkFormData({ file_path: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove PDF link');
      console.error('Error removing book link:', error);
    } finally {
      setUpdating(false);
    }
  };

  const testConnection = async () => {
    try {
      setTestingConnection(true);
      
      // Test Educational Platform API
      const response = await bookService.getBooks(1, 1);
      
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                📚 Books Management
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                {user?.role === 'instructor' || user?.role === 'admin' 
                  ? 'Manage your book collection and PDF links' 
                  : 'Discover and explore our book collection'}
              </p>
            </div>
            
            {user && (user.role === 'instructor' || user.role === 'admin') && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => setShowCreateModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl transform hover:scale-105 transition-all duration-200"
                >
                  ➕ Add Book
                </Button>
                <Button 
                  onClick={testConnection}
                  disabled={testingConnection}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 rounded-xl transform hover:scale-105 transition-all duration-200"
                >
                  {testingConnection ? '⏳' : '🔍'} Test Connection
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            {/* Check if any books have missing file paths and show a warning */}
            {books.some(book => !book.file_path || book.file_path.trim() === '') && (
              <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833-.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Notice:</strong> Some books don't have file paths set and cannot be opened. 
                      {user && (user.role === 'instructor' || user.role === 'admin') && (
                        <span> Please edit these books to add file paths.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
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
                    placeholder="Search books by title or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-3 border-2 border-gray-200 focus:border-blue-500 rounded-xl text-lg"
                  />
                </div>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title="Grid View"
                  aria-label="Switch to grid view"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 rounded-lg transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  title="List View"
                  aria-label="Switch to list view"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {category === 'all' ? '📚 All Books' : `🏷️ ${category}`}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg mb-4">Loading books...</p>
              <Button 
                onClick={loadBooks}
                disabled={loading}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm"
              >
                Cancel & Retry
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Books Display */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                {categoryFilteredBooks.map((book) => {
                  const thumbnail = generateBookThumbnail(book.title);
                  return (
                    <Card key={book.id} className="group overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 bg-white/90 backdrop-blur-sm border-0">
                      <div className="p-6 space-y-4">
                        {/* Book Thumbnail */}
                        <div className={`aspect-[3/4] rounded-xl overflow-hidden relative group-hover:scale-105 transition-transform duration-300 ${
                          book.file_path && book.file_path.trim() !== '' ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                        }`} 
                        onClick={book.file_path && book.file_path.trim() !== '' ? () => handleReadBook(book) : undefined} 
                        title={book.file_path && book.file_path.trim() !== '' ? `Click to read "${book.title}"` : 'No file path available'}>
                          <div className={`w-full h-full bg-gradient-to-br ${thumbnail.color} flex items-center justify-center text-white relative`}>
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-300"></div>
                            <div className="relative z-10 text-center transform group-hover:scale-110 transition-transform duration-300">
                              <div className="text-4xl font-bold mb-2">{thumbnail.initials}</div>
                              <div className="text-xs opacity-80">BOOK</div>
                            </div>
                            <div className="absolute bottom-2 right-2 bg-white/20 backdrop-blur-sm rounded-full p-2 group-hover:bg-white/30 transition-colors duration-300">
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253z" />
                              </svg>
                            </div>
                            {/* Hover overlay with play icon - only show if file path exists */}
                            {book.file_path && book.file_path.trim() !== '' && (
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </div>
                              </div>
                            )}
                            {/* Warning overlay for books without file path */}
                            {(!book.file_path || book.file_path.trim() === '') && (
                              <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                <div className="bg-red-500/80 backdrop-blur-sm rounded-full p-3">
                                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833-.192 2.5 1.732 2.5z" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Book Info */}
                        <div className="space-y-3">
                          <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-colors">
                            {book.title}
                          </h3>
                          
                          {book.tags && (
                            <div className="flex flex-wrap gap-1">
                              {book.tags.split(',').map((tag, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              {book.copies_owned} copies
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 space-y-2">
                            <Button 
                              className={`w-full rounded-lg py-3 px-4 transform transition-all duration-200 shadow-lg font-medium flex items-center justify-center gap-2 group ${
                                !book.file_path || book.file_path.trim() === '' 
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:scale-105 hover:shadow-xl'
                              }`}
                              onClick={() => handleReadBook(book)}
                              disabled={!book.file_path || book.file_path.trim() === ''}
                              aria-label={`Read ${book.title}`}
                              title={!book.file_path || book.file_path.trim() === '' ? 'No file path available - please edit book to add one' : `Click to read "${book.title}"`}
                            >
                              <span className={`text-lg ${!book.file_path || book.file_path.trim() === '' ? '' : 'group-hover:animate-bounce'}`}>
                                {!book.file_path || book.file_path.trim() === '' ? '⚠️' : '📖'}
                              </span>
                              <span>{!book.file_path || book.file_path.trim() === '' ? 'No File Path' : 'Read Now'}</span>
                              {book.file_path && book.file_path.trim() !== '' && (
                                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              )}
                            </Button>
                            
                            {user && (user.role === 'instructor' || user.role === 'admin') && (
                              <div className="space-y-2">
                                <Button 
                                  className="w-full bg-green-100 hover:bg-green-200 text-green-700 rounded-lg py-2 text-sm"
                                  onClick={() => handleManageLinks(book)}
                                  disabled={updating}
                                >
                                  🔗 Manage PDF Link
                                </Button>
                                <div className="flex space-x-2">
                                  <Button 
                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm"
                                    onClick={() => handleEditBook(book)}
                                    disabled={updating}
                                  >
                                    ✏️ Edit
                                  </Button>
                                  <Button 
                                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg py-2 text-sm"
                                    onClick={() => handleDeleteBook(book.id)}
                                    disabled={deleting === book.id}
                                  >
                                    {deleting === book.id ? '⏳' : '🗑️'} Delete
                                  </Button>
                                </div>
                              </div>
                            )}
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
                {categoryFilteredBooks.map((book) => {
                  const thumbnail = generateBookThumbnail(book.title);
                  return (
                    <Card key={book.id} className="p-6 hover:shadow-lg transition-all duration-200 bg-white/90 backdrop-blur-sm border-0">
                      <div className="flex items-center space-x-6">
                        {/* Thumbnail */}
                        <div className="w-16 h-20 rounded-lg overflow-hidden flex-shrink-0">
                          <div className={`w-full h-full bg-gradient-to-br ${thumbnail.color} flex items-center justify-center text-white`}>
                            <div className="text-lg font-bold">{thumbnail.initials}</div>
                          </div>
                        </div>
                        
                        {/* Book Info */}
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-xl mb-2">{book.title}</h3>
                          {book.tags && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {book.tags.split(',').map((tag, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="text-gray-500 text-sm">{book.copies_owned} copies available</p>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex space-x-3">
                          <Button 
                            className={`px-6 py-3 rounded-lg transform transition-all duration-200 shadow-lg hover:shadow-xl font-medium flex items-center gap-2 group ${
                              !book.file_path || book.file_path.trim() === '' 
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:scale-105'
                            }`}
                            onClick={() => handleReadBook(book)}
                            disabled={!book.file_path || book.file_path.trim() === ''}
                            aria-label={`Read ${book.title}`}
                            title={!book.file_path || book.file_path.trim() === '' ? 'No file path available - please edit book to add one' : `Click to read "${book.title}"`}
                          >
                            <span className={`text-lg ${!book.file_path || book.file_path.trim() === '' ? '' : 'group-hover:animate-bounce'}`}>
                              {!book.file_path || book.file_path.trim() === '' ? '⚠️' : '📖'}
                            </span>
                            <span>{!book.file_path || book.file_path.trim() === '' ? 'No File Path' : 'Read Now'}</span>
                            {book.file_path && book.file_path.trim() !== '' && (
                              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            )}
                          </Button>
                          
                          {user && (user.role === 'instructor' || user.role === 'admin') && (
                            <>
                              <Button 
                                className="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg"
                                onClick={() => handleManageLinks(book)}
                                disabled={updating}
                              >
                                🔗 Manage PDF Link
                              </Button>
                              <Button 
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
                                onClick={() => handleEditBook(book)}
                                disabled={updating}
                              >
                                ✏️ Edit
                              </Button>
                              <Button 
                                className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg"
                                onClick={() => handleDeleteBook(book.id)}
                                disabled={deleting === book.id}
                              >
                                {deleting === book.id ? '⏳ Processing...' : '🗑️ Delete'}
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

            {/* Empty State for Books */}
            {categoryFilteredBooks.length === 0 && (
              <div className="text-center py-20">
                <div className="text-8xl mb-4">📚</div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">No books found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery ? 'Try adjusting your search terms' : 'No books have been added yet'}
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  {user && (user.role === 'instructor' || user.role === 'admin') && (
                    <Button 
                      onClick={() => setShowCreateModal(true)}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl"
                    >
                      ➕ Add Your First Book
                    </Button>
                  )}
                  <Button 
                    onClick={testConnection}
                    disabled={testingConnection}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 rounded-xl transform hover:scale-105 transition-all duration-200"
                  >
                    {testingConnection ? '⏳ Testing...' : '🔍 Test API Connection'}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Manage PDF Link Modal */}
        {showLinkModal && managingLinksBook && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">
                  📚 Manage PDF Link for "{managingLinksBook.title}"
                </h2>
                <form onSubmit={handleUpdateBookLink} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PDF File Path or URL *
                    </label>
                    <Input
                      value={linkFormData.file_path}
                      onChange={(e) => setLinkFormData({file_path: e.target.value})}
                      placeholder="Enter PDF file path or URL (e.g., https://example.com/book.pdf)"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Supports local file paths or direct URLs to PDF files
                    </p>
                  </div>
                  
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Current Status:</h4>
                    <p className="text-sm text-blue-700">
                      {managingLinksBook.file_path ? 
                        `✅ PDF link is set: ${managingLinksBook.file_path.length > 50 ? 
                          managingLinksBook.file_path.substring(0, 50) + '...' : 
                          managingLinksBook.file_path}` : 
                        '❌ No PDF link set - students cannot read this book'
                      }
                    </p>
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowLinkModal(false);
                        setManagingLinksBook(null);
                        setLinkFormData({ file_path: '' });
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                      Cancel
                    </Button>
                    {managingLinksBook.file_path && (
                      <Button
                        type="button"
                        onClick={handleRemoveBookLink}
                        disabled={updating}
                        className="flex-1 bg-red-100 hover:bg-red-200 text-red-700"
                      >
                        {updating ? 'Removing...' : '🗑️ Remove Link'}
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={updating}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {updating ? 'Updating...' : '💾 Save Link'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}

        {/* Create Book Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Add New Book</h2>
                <form onSubmit={handleCreateBook} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter book title"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      File Path *
                    </label>
                    <Input
                      value={formData.file_path}
                      onChange={(e) => setFormData({...formData, file_path: e.target.value})}
                      placeholder="Enter file path or URL"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData({...formData, tags: e.target.value})}
                      placeholder="Enter tags separated by commas"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Copies Owned
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.copies_owned}
                      onChange={(e) => setFormData({...formData, copies_owned: parseInt(e.target.value) || 1})}
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
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {creating ? 'Creating...' : 'Create Book'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}

        {/* Edit Book Modal */}
        {showEditModal && editingBook && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Edit Book</h2>
                <form onSubmit={handleUpdateBook} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title *
                    </label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter book title"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      File Path
                    </label>
                    <Input
                      value={formData.file_path}
                      onChange={(e) => setFormData({...formData, file_path: e.target.value})}
                      placeholder="Enter file path or URL"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <Input
                      value={formData.tags}
                      onChange={(e) => setFormData({...formData, tags: e.target.value})}
                      placeholder="Enter tags separated by commas"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Copies Owned
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.copies_owned}
                      onChange={(e) => setFormData({...formData, copies_owned: parseInt(e.target.value) || 1})}
                    />
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingBook(null);
                        setFormData({
                          title: '',
                          copies_owned: 1,
                          tags: '',
                          file_path: ''
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
                      {updating ? 'Updating...' : 'Update Book'}
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}

        {/* Manage PDF Link Modal */}
        {showLinkModal && managingLinksBook && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">Manage PDF Link</h2>
                <form onSubmit={handleUpdateBookLink} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PDF Link/Path *
                    </label>
                    <Input
                      value={linkFormData.file_path}
                      onChange={(e) => setLinkFormData({...linkFormData, file_path: e.target.value})}
                      placeholder="Enter PDF file path or URL"
                      required
                    />
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      onClick={() => setShowLinkModal(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={updating}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {updating ? 'Updating...' : 'Update Link'}
                    </Button>
                  </div>
                </form>
                
                {/* Remove Link Button */}
                <div className="mt-4">
                  <Button
                    onClick={handleRemoveBookLink}
                    className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-2"
                  >
                    {updating ? '⏳' : '🗑️'} Remove PDF Link
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default BooksPage;
