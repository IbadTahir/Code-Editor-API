import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { AIQuizGenerator } from '../components/AIQuizGenerator';
import { aiEvaluationService } from '../services/educationalService';
import { aiAnalysisService } from '../services/aiAnalysisService';
import type { AIAnalysis } from '../services/aiAnalysisService';
import { useAuth } from '../context/AuthContext';
import type { AIEvaluation, AIEvaluationRequest } from '../types';

interface QuizQuestion {
  question: string;
  options: string[];
}

interface QuizData {
  questions: QuizQuestion[];
  correct_answers: string[];
}

interface Submission {
  id: number;
  evaluator_id: number;
  student_username: string;
  submission_content: string;
  submission_date: string;
  provisional_grade: number | null;
  final_grade: number | null;
  feedback: string | null;
  status: string;
}

const AIEvaluationsPage: React.FC = () => {
  const auth = useAuth();
  const user = auth?.user || null; // Handle case where useAuth returns undefined
  const [evaluations, setEvaluations] = useState<AIEvaluation[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionStatuses, setSubmissionStatuses] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTakeModal, setShowTakeModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showQuizGenerator, setShowQuizGenerator] = useState(false);
  const [showQuizManager, setShowQuizManager] = useState(false);
  const [autoGradedQuizzes, setAutoGradedQuizzes] = useState<AIEvaluation[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [deletingQuizId, setDeletingQuizId] = useState<number | null>(null);
  const [selectedEvaluation, setSelectedEvaluation] = useState<AIEvaluation | null>(null);
  const [currentAnswers, setCurrentAnswers] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  
  // Form state
  const [formData, setFormData] = useState<AIEvaluationRequest>({
    title: '',
    description: '',
    type: 'quiz',
    submission_type: 'text',
    is_auto_eval: true,
    max_attempts: 1,
    quiz_type: 'multiple_choice'
  });
  useEffect(() => {
    loadEvaluations();
  }, []);  const loadEvaluations = async () => {
    try {
      setLoading(true);
      console.log('Starting to load evaluations...');
      
      const response = await aiEvaluationService.getEvaluations(1, 100);
      console.log('Evaluations loaded successfully:', response);
      setEvaluations(response.data);
      
      // Load submission statuses for each evaluation if user is logged in
      if (user) {
        console.log('User is logged in, loading submission statuses...');
        const statuses: Record<number, any> = {};
        for (const evaluation of response.data) {
          try {
            const status = await checkSubmissionStatus(evaluation.id);
            if (status) {
              statuses[evaluation.id] = status;
            }
          } catch (error: any) {
            // Ignore errors for individual status checks (including auth errors)
            console.warn(`Failed to get status for evaluation ${evaluation.id}:`, error);
            
            // If it's a 401 error, the user might not have access to this specific evaluation
            // but we shouldn't redirect them away from the page
            if (error.response?.status === 401) {
              console.log(`No access to evaluation ${evaluation.id} status - this is normal for public evaluations`);
            }
          }
        }
        setSubmissionStatuses(statuses);
        console.log('Submission statuses loaded:', statuses);
      } else {
        console.log('User not logged in, skipping submission status checks');
      }
    } catch (error) {
      console.error('Error loading evaluations - Full details:', error);
      
      // More user-friendly error message based on error type
      if (error && typeof error === 'object') {
        const errorObj = error as any;
        if (errorObj.response?.status === 500) {
          toast.error('Server error while loading evaluations. Please try again later.');
        } else if (errorObj.code === 'NETWORK_ERROR' || errorObj.message?.includes('Network Error')) {
          toast.error('Network connection error. Please check if the service is running.');
        } else {
          toast.error('Failed to load evaluations. Please refresh the page.');
        }
      } else {
        toast.error('Failed to load evaluations');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkSubmissionStatus = async (evaluationId: number) => {
    if (!user) return null;
    
    try {
      const status = await aiEvaluationService.getEvaluationStatus(evaluationId);
      return status;
    } catch (error: any) {
      // If status check fails, assume not submitted
      return null;
    }
  };

  const handleTakeEvaluation = (evaluation: AIEvaluation) => {
    if (!user) {
      toast.error('Please log in to take evaluations');
      // Optionally redirect to login
      // window.location.href = '/login';
      return;
    }
    
    setSelectedEvaluation(evaluation);
    if (evaluation.type === 'quiz' && evaluation.quiz_data) {
      try {
        const quizData = typeof evaluation.quiz_data === 'string' 
          ? JSON.parse(evaluation.quiz_data) 
          : evaluation.quiz_data;
        setCurrentAnswers(new Array(quizData.questions?.length || 0).fill(''));
      } catch (error) {
        console.error('Error parsing quiz data:', error);
        setCurrentAnswers([]);
      }
    }
    setTextAnswer('');
    setShowTakeModal(true);
  };  const handleSubmitEvaluation = async () => {
    return handleSubmitEvaluationWithAI();
  };const handleViewResults = async (evaluation: AIEvaluation) => {
    if (!user) {
      toast.error('Please log in to view results');
      return;
    }
      try {
      setSelectedEvaluation(evaluation);
      // Use getEvaluationResults which calls the /result endpoint for student's own results
      const results = await aiEvaluationService.getEvaluationResult(evaluation.id);
      console.log('Loaded results:', results);
      console.log('Current user:', user);
      setSubmissions(results);
      setShowResultsModal(true);
    } catch (error: any) {
      console.log('Error loading results:', error);
      if (error?.response?.status === 403) {
        toast.error('You can only view results for evaluations you have submitted.');
      } else if (error?.response?.status === 401) {
        toast.error('Please log in to view results.');
      } else if (error?.response?.status === 404) {
        toast.error('No results found. You may not have submitted this evaluation yet.');
      } else {
        const errorMessage = error?.response?.data?.detail || 'Failed to load results';
        toast.error(errorMessage);
        console.error('Error loading results:', error);
      }
    }
  };  const handleViewSubmissions = async (evaluation: AIEvaluation) => {
    if (!user) {
      toast.error('Please log in to view submissions');
      return;
    }
    
    try {
      setSelectedEvaluation(evaluation);
      // Use getSubmissions which calls the /submissions endpoint
      const submissionData = await aiEvaluationService.getSubmissions(evaluation.id);
      setSubmissions(submissionData);
      setShowSubmissionsModal(true);
    } catch (error: any) {
      console.log('Error loading submissions:', error);
      if (error?.response?.status === 403) {
        toast.error('You do not have permission to view submissions for this evaluation.');
      } else if (error?.response?.status === 401) {
        toast.error('Please log in to view submissions.');
      } else {
        const errorMessage = error?.response?.data?.detail || 'Failed to load submissions';
        toast.error(errorMessage);
        console.error('Error loading submissions:', error);
      }
    }
  };
  const handleCreateEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title.trim() || formData.title.trim().length < 3) {
      toast.error('Title must be at least 3 characters long');
      return;
    }
    
    if (!formData.description.trim() || formData.description.trim().length < 10) {
      toast.error('Description must be at least 10 characters long');
      return;
    }

    // Validate quiz requirements
    if (formData.type === 'quiz' && formData.is_auto_eval && !formData.quiz_type) {
      toast.error('Quiz type is required for auto-evaluated quizzes');
      return;
    }

    try {
      setCreating(true);
      await aiEvaluationService.createEvaluation(formData);
      toast.success('Evaluation created successfully');
      setShowCreateModal(false);
      resetForm();
      loadEvaluations();
    } catch (error: any) {
      console.error('Error creating evaluation:', error);
      const errorMessage = error?.response?.data?.detail || 
                          error?.response?.data?.error?.message || 
                          error?.message || 
                          'Failed to create evaluation';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };
  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'assignment',
      submission_type: 'text',
      is_auto_eval: false,
      max_attempts: 1,
      quiz_type: undefined
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'assignment': return '📋';
      case 'quiz': return '❓';
      default: return '📝';
    }
  };

  const getSubmissionTypeColor = (type: string) => {
    switch (type) {
      case 'code': return 'text-purple-600 bg-purple-100';
      case 'video': return 'text-red-600 bg-red-100';
      case 'image': return 'text-green-600 bg-green-100';
      default: return 'text-blue-600 bg-blue-100';
    }  };

  // AI-powered helper functions
  const analyzeContent = async (content: string, evaluationType: string): Promise<AIAnalysis> => {
    return aiAnalysisService.analyzeContentEnhanced(content, evaluationType);
  };

  const generateSmartSuggestions = (questionText: string, currentAnswer: string): string[] => {
    return aiAnalysisService.generateSmartSuggestions(questionText, currentAnswer);
  };
  // const getAIFeedbackPreview = async (content: string): Promise<string> => {
  //   return aiAnalysisService.getAIFeedbackPreview(content);
  // };

  // Enhanced submission handler with AI analysis
  const handleSubmitEvaluationWithAI = async () => {
    if (!selectedEvaluation) return;

    if (!user) {
      toast.error('Please log in to submit evaluations');
      setShowTakeModal(false);
      return;
    }

    // Check if user has a valid token
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication required. Please log in again.');
      setShowTakeModal(false);
      return;
    }

    console.log('User attempting submission:', user);
    console.log('Token present:', !!token);

    try {
      setSubmitting(true);
      
      let submissionContent = '';
      if (selectedEvaluation.type === 'quiz') {
        submissionContent = JSON.stringify({ answers: currentAnswers });
      } else {
        submissionContent = textAnswer;
      }

      // Perform AI analysis before submission
      if (submissionContent.length > 10) {
        setAnalyzing(true);
        try {
          const analysis = await analyzeContent(submissionContent, selectedEvaluation.type);
          setAiAnalysis(analysis);
          setConfidence(analysis.confidence);
          
          // Show analysis to user
          toast.success(`AI Analysis Complete! Estimated Score: ${analysis.estimatedScore}%`, {
            duration: 3000
          });
        } catch (analysisError) {
          console.warn('AI analysis failed:', analysisError);
        } finally {
          setAnalyzing(false);
        }
      }

      const result = await aiEvaluationService.submitEvaluation(selectedEvaluation.id, {
        submission_content: submissionContent
      });

      // If auto-evaluation is enabled, trigger it
      if (selectedEvaluation.is_auto_eval && result.id) {
        try {
          const autoEvalResult = await aiEvaluationService.triggerAutoEvaluation(
            selectedEvaluation.id, 
            result.id
          );
          toast.success(`🎉 Submitted and auto-evaluated! Score: ${autoEvalResult.provisional_grade || 'Pending'}%`, {
            duration: 5000
          });
        } catch (autoEvalError: any) {
          console.error('Auto-evaluation error during submission:', autoEvalError);
          const errorMessage = autoEvalError.response?.data?.detail || autoEvalError.message || 'Auto-evaluation failed';
          toast.success('✅ Submitted successfully!');
          toast.error(`Auto-evaluation failed: ${errorMessage}`);
        }
      } else {
        toast.success('✅ Submitted successfully! Awaiting manual review.');
      }

      setShowTakeModal(false);
      setSelectedEvaluation(null);
      setCurrentAnswers([]);
      setTextAnswer('');
      setAiAnalysis(null);
    } catch (error: any) {
      console.log('Full error object:', error);
      
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        const detail = error?.response?.data?.detail || 'Authentication required';
        toast.error(`🔒 Authentication Error: ${detail}`);
        setShowTakeModal(false);
      } else {
        const errorMessage = error?.response?.data?.detail || 
                           error?.response?.data?.error?.message || 
                           error?.response?.data?.message ||
                           error.message ||
                           'Failed to submit evaluation';
        toast.error(`❌ Submission Error: ${errorMessage}`);
        console.error('Error submitting evaluation:', error);
      }
    } finally {
      setSubmitting(false);
      setAnalyzing(false);
    }
  };  const handleQuizCreated = async (evaluatorId: number) => {
    console.log('Quiz created with evaluator ID:', evaluatorId);
    toast.success('🎉 AI Quiz created successfully!');
    await loadEvaluations(); // Refresh the evaluations list
    setShowQuizGenerator(false);
  };

  // Quiz management functions
  const loadAutoGradedQuizzes = async () => {
    try {
      setLoadingQuizzes(true);
      const response = await aiEvaluationService.getAutoGradedQuizzes();
      setAutoGradedQuizzes(response.items);
    } catch (error: any) {
      console.error('Failed to load auto-graded quizzes:', error);
      toast.error('Failed to load auto-graded quizzes');
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const handleDeleteAutoGradedQuiz = async (quizId: number) => {
    if (!window.confirm('Are you sure you want to delete this auto-graded quiz? This will also delete all submissions.')) {
      return;
    }

    try {
      setDeletingQuizId(quizId);
      const result = await aiEvaluationService.deleteAutoGradedQuiz(quizId);
      toast.success(`Quiz "${result.quiz_title}" deleted successfully`);
      await loadAutoGradedQuizzes(); // Refresh the list
      await loadEvaluations(); // Refresh the main evaluations list too
    } catch (error: any) {
      console.error('Failed to delete auto-graded quiz:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete quiz');
    } finally {
      setDeletingQuizId(null);
    }
  };

  // Load auto-graded quizzes when quiz manager opens
  React.useEffect(() => {
    if (showQuizManager && user?.role !== 'student') {
      loadAutoGradedQuizzes();
    }
  }, [showQuizManager, user?.role]);

  return (
    <div className="space-y-8 min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{/* AI-Enhanced Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl p-6 md:p-8 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl md:text-4xl">🤖</span>
              <h1 className="text-2xl md:text-3xl font-bold">
                {user?.role === 'student' ? 'AI-Powered Learning Hub' : 'AI Evaluations Management'}
              </h1>
            </div>
            <p className="text-blue-100 text-sm md:text-base max-w-3xl leading-relaxed">
              {user?.role === 'student' 
                ? 'Experience intelligent assessments with instant AI feedback, personalized suggestions, and detailed performance analysis to accelerate your learning journey.'
                : 'Create sophisticated evaluations with AI-powered auto-grading, detailed analytics, and intelligent content analysis to enhance student learning outcomes.'
              }
            </p>
          </div>
          <div className="flex md:block">
            <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-xl p-4 md:p-6 text-center">
              <div className="text-2xl md:text-3xl font-bold">{evaluations.length}</div>
              <div className="text-xs md:text-sm text-blue-100 font-medium">
                {user?.role === 'student' ? 'Available' : 'Created'}
              </div>
            </div>
          </div>
        </div>
        
        {/* AI Features Preview */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-lg p-3 md:p-4 text-center hover:bg-opacity-25 transition-all duration-200">
            <div className="text-lg md:text-xl mb-1">⚡</div>
            <div className="text-xs md:text-sm font-medium">Instant Scoring</div>
          </div>
          <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-lg p-3 md:p-4 text-center hover:bg-opacity-25 transition-all duration-200">
            <div className="text-lg md:text-xl mb-1">📝</div>
            <div className="text-xs md:text-sm font-medium">Smart Feedback</div>
          </div>
          <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-lg p-3 md:p-4 text-center hover:bg-opacity-25 transition-all duration-200">
            <div className="text-lg md:text-xl mb-1">💡</div>
            <div className="text-xs md:text-sm font-medium">AI Suggestions</div>
          </div>
          <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-lg p-3 md:p-4 text-center hover:bg-opacity-25 transition-all duration-200">
            <div className="text-lg md:text-xl mb-1">📊</div>
            <div className="text-xs md:text-sm font-medium">Analytics</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {user?.role === 'student' ? 'Available Assessments' : 'Evaluation Management'}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {!user 
              ? "Browse AI-powered evaluations (login to take them)"
              : user.role === 'student'
                ? "Take AI-powered quizzes and assignments with instant feedback"
                : "Create and manage intelligent evaluations with automated grading"
            }
          </p>
        </div>        {user && (user.role === 'instructor' || user.role === 'admin') && (
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <div className="flex items-center gap-2">
                <span>🤖</span>
                <span>Create AI Evaluation</span>
              </div>
            </Button>
            
            <Button 
              onClick={() => setShowQuizGenerator(true)}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700"
            >
              <div className="flex items-center gap-2">
                <span>⚡</span>
                <span>AI Quiz Generator</span>
              </div>
            </Button>
            
            <Button 
              onClick={() => setShowQuizManager(true)}
              className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
            >
              <div className="flex items-center gap-2">
                <span>🗑️</span>
                <span>Manage Quizzes</span>
              </div>
            </Button>
          </div>
        )}
      </div>      {/* Evaluations Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-blue-600 absolute top-0"></div>
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">Loading AI Evaluations</h3>
            <p className="text-gray-500">Preparing your intelligent assessments...</p>
          </div>
        </div>
      ) : (<>
          {/* Add some visual improvements */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                {evaluations.length} evaluation{evaluations.length !== 1 ? 's' : ''} available
              </div>
              {evaluations.filter(e => e.is_auto_eval).length > 0 && (
                <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  <span>🤖</span>
                  <span>{evaluations.filter(e => e.is_auto_eval).length} AI-powered</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {evaluations.map((evaluation) => (
              <Card key={evaluation.id} className="group relative overflow-hidden hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border-0 ring-1 ring-gray-200 hover:ring-2 hover:ring-blue-400 bg-white rounded-xl">
                {/* Card Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-purple-50/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative p-6 space-y-5 h-full flex flex-col">
                  {/* Header Section with Better Layout */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl transform group-hover:scale-110 transition-transform duration-300 filter group-hover:drop-shadow-lg">
                        {getTypeIcon(evaluation.type)}
                      </div>
                      {evaluation.is_auto_eval && (
                        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg group-hover:shadow-xl transition-shadow duration-300">
                          <span className="text-lg animate-pulse">🤖</span>
                          <span>AI-Powered</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Tags Section */}
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 justify-end">
                        <span className={`px-3 py-1.5 text-xs rounded-full font-bold uppercase tracking-wide shadow-sm transition-all duration-200 hover:scale-105 ${getSubmissionTypeColor(evaluation.submission_type)}`}>
                          {evaluation.submission_type}
                        </span>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <span className={`px-3 py-1.5 text-xs rounded-full font-semibold shadow-sm transition-all duration-200 hover:scale-105 ${evaluation.is_auto_eval ? 'text-emerald-700 bg-emerald-100 border border-emerald-200' : 'text-slate-700 bg-slate-100 border border-slate-200'}`}>
                          {evaluation.is_auto_eval ? '⚡ Auto-Eval' : '👤 Manual'}
                        </span>
                      </div>
                      {evaluation.quiz_type && (
                        <div className="flex justify-end">
                          <span className="px-3 py-1.5 text-xs rounded-full font-semibold text-violet-700 bg-violet-100 border border-violet-200 shadow-sm transition-all duration-200 hover:scale-105">
                            {evaluation.quiz_type.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                    {/* Content Section */}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold text-gray-900 line-clamp-2 group-hover:text-blue-700 transition-colors duration-200">
                        {evaluation.title}
                      </h3>
                      <p className="text-gray-600 line-clamp-3 leading-relaxed">
                        {evaluation.description}
                      </p>
                    </div>
                    
                    {/* AI Features Highlight - Enhanced */}
                    {evaluation.is_auto_eval && (
                      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl p-4 space-y-3 group-hover:shadow-md transition-shadow duration-300">
                        <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
                          <span className="text-lg">🧠</span>
                          <span>AI Evaluation Features</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2 text-xs font-medium text-blue-700 bg-white/60 rounded-lg px-2 py-1">
                            <span className="text-sm">⚡</span>
                            <span>Instant Scoring</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-blue-700 bg-white/60 rounded-lg px-2 py-1">
                            <span className="text-sm">📝</span>
                            <span>Smart Feedback</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-blue-700 bg-white/60 rounded-lg px-2 py-1">
                            <span className="text-sm">💡</span>
                            <span>AI Suggestions</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-blue-700 bg-white/60 rounded-lg px-2 py-1">
                            <span className="text-sm">🎯</span>
                            <span>Analysis</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Metadata Section */}
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📋</span>
                          <span className="text-gray-600">
                            {evaluation.type.charAt(0).toUpperCase() + evaluation.type.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">🔄</span>
                          <span className="text-gray-600">
                            {evaluation.max_attempts} attempt{evaluation.max_attempts !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      
                      {evaluation.deadline && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-orange-400">⏰</span>
                          <span className="text-orange-600 font-medium">
                            Due: {new Date(evaluation.deadline).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="text-gray-400">📅</span>
                        <span>Created: {new Date(evaluation.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>                  {/* Action Buttons - Enhanced Interactive Design */}
                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    {/* Primary Action Button */}
                    <Button 
                      size="md"
                      onClick={() => handleTakeEvaluation(evaluation)}
                      className={`w-full py-3 font-semibold text-sm transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl ${
                        evaluation.is_auto_eval 
                          ? 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white' 
                          : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white'
                      }`}
                      disabled={!user}
                    >
                      <div className="flex items-center justify-center gap-2">
                        {evaluation.is_auto_eval && <span className="text-lg animate-bounce">🤖</span>}
                        <span>
                          {user 
                            ? `${evaluation.is_auto_eval ? '🚀 Take AI-Powered' : '📝 Take'} ${evaluation.type === 'quiz' ? 'Quiz' : 'Assignment'}`
                            : '🔒 Login to Take'
                          }
                        </span>
                        {evaluation.is_auto_eval && (
                          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                            INSTANT
                          </span>
                        )}
                      </div>
                    </Button>

                    {/* Secondary Actions */}
                    <div className="flex gap-2">
                      {/* Results Button */}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleViewResults(evaluation)}
                        disabled={!user}
                        className="flex-1 py-2 border-2 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-center gap-2">
                          {evaluation.is_auto_eval && submissionStatuses[evaluation.id] && (
                            <span className="group-hover:scale-110 transition-transform duration-200">📊</span>
                          )}
                          <span className="text-xs font-medium">
                            {!user 
                              ? '🔒 Login' 
                              : submissionStatuses[evaluation.id] 
                                ? `${evaluation.is_auto_eval ? '🤖 AI' : '📋'} Results` 
                                : evaluation.is_auto_eval ? '🤖 AI Results' : '📋 Results'
                            }
                          </span>
                          {submissionStatuses[evaluation.id] && (
                            <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-xs font-bold">
                              {submissionStatuses[evaluation.id].status?.toUpperCase() || 'DONE'}
                            </span>
                          )}
                        </div>
                      </Button>

                      {/* Submissions Button - Only for instructors/admins */}
                      {user && (user.role === 'instructor' || user.role === 'admin') && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewSubmissions(evaluation)}
                          className="flex-1 py-2 border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 group"
                        >
                          <div className="flex items-center justify-center gap-1">
                            <span className="group-hover:scale-110 transition-transform duration-200">👥</span>
                            <span className="text-xs font-medium text-purple-700">Submissions</span>
                          </div>
                        </Button>
                      )}
                    </div>                  </div>
                </div>
              </Card>
            ))}
          </div>          {evaluations.length === 0 && (
            <div className="text-center py-20">
              <div className="flex justify-center mb-6">
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-full p-8">
                  <div className="text-6xl">🤖</div>
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No AI Evaluations Yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                {user?.role === 'student' 
                  ? "No evaluations are currently available. Check back later for new AI-powered assessments!"
                  : "Get started by creating your first AI-powered evaluation with intelligent grading and feedback."
                }
              </p>
              {user && (user.role === 'instructor' || user.role === 'admin') && (
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => setShowCreateModal(true)}
                >
                  <div className="flex items-center gap-2">
                    <span>🚀</span>
                    <span>Create Your First AI Evaluation</span>
                  </div>
                </Button>
              )}
            </div>
          )}        </>
      )}

      {/* Floating Action Button for Instructors */}
      {user && (user.role === 'instructor' || user.role === 'admin') && evaluations.length > 0 && (
        <div className="fixed bottom-8 right-8 z-40">
          <Button
            onClick={() => setShowCreateModal(true)}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-110"
            title="Create New AI Evaluation"
          >
            <div className="flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
          </Button>
        </div>
      )}{/* Create Modal */}      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <h2 className="text-lg font-semibold">Create New Evaluation</h2>
                <div className="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-blue-600 text-white px-3 py-1 rounded-full text-sm">
                  <span>🤖</span>
                  <span>AI-Enhanced</span>
                </div>
              </div>
              
              <form onSubmit={handleCreateEvaluation} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="Title"
                      required
                      minLength={3}
                      placeholder="e.g., 'JavaScript Fundamentals Quiz' (minimum 3 characters)"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.title.length}/3 characters minimum
                    </p>
                  </div>
                  
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <button
                        type="button"
                        className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
                        onClick={() => {
                          const aiSuggestion = `This ${formData.type} will test your understanding of ${formData.type === 'quiz' ? 'key concepts' : 'practical skills'}. Please provide detailed answers and explanations where appropriate.`;
                          setFormData({ ...formData, description: aiSuggestion });
                        }}
                      >
                        <span>✨</span>
                        <span>AI Suggest</span>
                      </button>
                    </div>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={4}
                      required
                      minLength={10}
                      placeholder="Describe what students will be evaluated on... (minimum 10 characters)"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.description.length}/10 characters minimum
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as 'quiz' | 'assignment' })}
                    >
                      <option value="quiz">📝 Quiz</option>
                      <option value="assignment">📋 Assignment</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Submission Type
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.submission_type}
                      onChange={(e) => setFormData({ ...formData, submission_type: e.target.value as any })}
                    >
                      <option value="text">📄 Text Response</option>
                      <option value="code">💻 Code Submission</option>
                      <option value="image">🖼️ Image Upload</option>
                      <option value="video">🎥 Video Upload</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Max Attempts"
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={formData.max_attempts}
                    onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 1 })}
                  />
                  
                  {formData.type === 'quiz' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quiz Type
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={formData.quiz_type || 'multiple_choice'}
                        onChange={(e) => setFormData({ ...formData, quiz_type: e.target.value as any })}
                      >
                        <option value="multiple_choice">🔘 Multiple Choice</option>
                        <option value="open_ended">✍️ Open Ended</option>
                        <option value="code_evaluation">💻 Code Evaluation</option>
                      </select>
                    </div>
                  )}
                </div>
                
                {/* AI Auto-Evaluation Section */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🤖</span>
                    <span className="font-medium text-blue-800">AI Auto-Evaluation</span>
                  </div>
                    <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      id="is_auto_eval"
                      checked={formData.is_auto_eval}
                      onChange={(e) => setFormData({ ...formData, is_auto_eval: e.target.checked })}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="is_auto_eval" className="text-sm font-medium text-blue-700">
                      Enable AI Auto-Evaluation ⚡
                    </label>
                  </div>
                  
                  {formData.is_auto_eval && (
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <div className="text-sm text-blue-600 space-y-1">
                        <div className="font-medium mb-2">🧠 AI Features Enabled:</div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>✓ Instant scoring</div>
                          <div>✓ Detailed feedback</div>
                          <div>✓ Improvement suggestions</div>
                          <div>✓ Writing analysis</div>
                          <div>✓ Code evaluation</div>
                          <div>✓ Performance insights</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Show quiz type field only for quizzes */}
                {formData.type === 'quiz' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quiz Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={formData.quiz_type || ''}
                      onChange={(e) => setFormData({ ...formData, quiz_type: e.target.value as any })}
                      required
                    >
                      <option value="">Select quiz type...</option>
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="open_ended">Open Ended</option>
                      <option value="code_evaluation">Code Evaluation</option>
                      <option value="essay">Essay</option>
                      <option value="coding">Coding</option>
                    </select>
                  </div>
                )}
                  <div className="flex gap-3 pt-6 border-t">
                  <Button 
                    type="submit" 
                    className={`flex-1 ${formData.is_auto_eval ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' : ''}`}
                    disabled={creating}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {creating && <span className="animate-spin">⚡</span>}
                      {formData.is_auto_eval && !creating && <span>🤖</span>}
                      <span>
                        {creating ? 'Creating...' : formData.is_auto_eval ? 'Create AI-Powered Evaluation' : 'Create Evaluation'}
                      </span>
                    </div>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Take Evaluation Modal */}
      {showTakeModal && selectedEvaluation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {selectedEvaluation.type === 'quiz' ? 'Take Quiz' : 'Submit Assignment'}: {selectedEvaluation.title}
                </h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowTakeModal(false);
                    setSelectedEvaluation(null);
                    setCurrentAnswers([]);
                    setTextAnswer('');
                  }}
                >
                  ✕
                </Button>
              </div>
              
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <p className="text-sm text-blue-800">{selectedEvaluation.description}</p>
                <div className="mt-2 text-xs text-blue-600">
                  Max Attempts: {selectedEvaluation.max_attempts} | 
                  {selectedEvaluation.is_auto_eval ? ' Auto-Graded' : ' Manual Review'}
                </div>
              </div>

              {selectedEvaluation.type === 'quiz' && selectedEvaluation.quiz_data ? (
                <div className="space-y-4">
                  {(() => {
                    try {
                      const quizData: QuizData = typeof selectedEvaluation.quiz_data === 'string' 
                        ? JSON.parse(selectedEvaluation.quiz_data) 
                        : selectedEvaluation.quiz_data;
                      
                      return quizData.questions?.map((question, qIndex) => (
                        <div key={qIndex} className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-medium mb-3">
                            {qIndex + 1}. {question.question}
                          </h3>
                          
                          {selectedEvaluation.quiz_type === 'multiple_choice' && question.options ? (
                            <div className="space-y-2">
                              {question.options.map((option, oIndex) => (
                                <label key={oIndex} className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`question-${qIndex}`}
                                    value={option}
                                    checked={currentAnswers[qIndex] === option}
                                    onChange={(e) => {
                                      const newAnswers = [...currentAnswers];
                                      newAnswers[qIndex] = e.target.value;
                                      setCurrentAnswers(newAnswers);
                                    }}
                                    className="text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm">{option}</span>
                                </label>
                              ))}
                            </div>
                          ) : (
                            <textarea
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={3}
                              placeholder="Enter your answer..."
                              value={currentAnswers[qIndex] || ''}
                              onChange={(e) => {
                                const newAnswers = [...currentAnswers];
                                newAnswers[qIndex] = e.target.value;
                                setCurrentAnswers(newAnswers);
                              }}
                            />
                          )}
                        </div>
                      ));
                    } catch (error) {
                      return <div className="text-red-600">Error loading quiz data</div>;
                    }
                  })()}
                </div>              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Your {selectedEvaluation.submission_type === 'code' ? 'Code' : 'Response'}:
                    </label>
                    {selectedEvaluation.is_auto_eval && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAIAssistant(!showAIAssistant)}
                          className="text-xs"
                        >
                          🤖 AI Assistant
                        </Button>
                        {textAnswer.length > 50 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setAnalyzing(true);
                              try {
                                const analysis = await analyzeContent(textAnswer, selectedEvaluation.type);
                                setAiAnalysis(analysis);
                                setAiSuggestions(analysis.suggestions);
                                toast.success(`AI Analysis: ${analysis.estimatedScore}% estimated score`);
                              } catch (error) {
                                toast.error('AI analysis failed');
                              }
                              setAnalyzing(false);
                            }}
                            disabled={analyzing}
                            className="text-xs"
                          >
                            {analyzing ? '🔄 Analyzing...' : '🔍 Analyze'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* AI Assistant Panel */}
                  {showAIAssistant && (
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🤖</span>
                        <h3 className="font-medium text-blue-800">AI Writing Assistant</h3>
                      </div>
                      
                      {textAnswer.length > 10 && (
                        <div className="space-y-2 mb-3">
                          <div className="text-sm text-blue-700">
                            <strong>Live Analysis:</strong>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-white rounded px-2 py-1">
                              📝 Words: {textAnswer.split(' ').length}
                            </div>
                            <div className="bg-white rounded px-2 py-1">
                              📊 Est. Score: {Math.min(100, textAnswer.split(' ').length * 2)}%
                            </div>
                            <div className="bg-white rounded px-2 py-1">
                              ⏱️ Length: {textAnswer.length > 500 ? 'Good' : 'Expand'}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {aiSuggestions.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-blue-700">💡 AI Suggestions:</div>
                          {aiSuggestions.map((suggestion, index) => (
                            <div key={index} className="text-xs bg-white rounded px-2 py-1 text-blue-600">
                              • {suggestion}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {selectedEvaluation.submission_type === 'code' && (
                        <div className="mt-3 text-xs text-blue-600">
                          💻 <strong>Code Tips:</strong> Include comments, handle edge cases, consider time complexity
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* AI Analysis Results */}
                  {aiAnalysis && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">📊</span>
                        <h3 className="font-medium text-green-800">AI Analysis Results</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-green-700 font-medium">Estimated Score</div>
                          <div className="text-2xl font-bold text-green-600">{aiAnalysis.estimatedScore}%</div>
                        </div>
                        <div>
                          <div className="text-green-700 font-medium">Confidence</div>
                          <div className="text-lg font-semibold text-green-600">
                            {Math.round(aiAnalysis.confidence * 100)}%
                          </div>
                        </div>
                      </div>
                      {aiAnalysis.keyPoints.length > 0 && (
                        <div className="mt-3">
                          <div className="text-sm font-medium text-green-700 mb-1">Key Points Detected:</div>
                          {aiAnalysis.keyPoints.map((point, index) => (
                            <div key={index} className="text-xs text-green-600 bg-white rounded px-2 py-1 mb-1">
                              • {point}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="relative">
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={selectedEvaluation.submission_type === 'code' ? 15 : 8}
                      placeholder={selectedEvaluation.submission_type === 'code' 
                        ? "// Write your code here...\n// Consider edge cases and add comments for clarity" 
                        : "Write your response here...\n\nTip: Be specific and provide examples to support your answer."}
                      value={textAnswer}
                      onChange={(e) => {
                        setTextAnswer(e.target.value);
                        // Real-time suggestions
                        if (selectedEvaluation.is_auto_eval && e.target.value.length > 10) {
                          const suggestions = generateSmartSuggestions(
                            selectedEvaluation.description || '',
                            e.target.value
                          );
                          setAiSuggestions(suggestions);
                        }
                      }}
                      style={selectedEvaluation.submission_type === 'code' ? { fontFamily: 'monospace' } : {}}
                    />
                    
                    {/* Character count and AI feedback */}
                    <div className="absolute bottom-2 right-2 flex items-center gap-2">
                      <span className="text-xs text-gray-400 bg-white px-2 py-1 rounded shadow">
                        {textAnswer.length} chars
                      </span>
                      {textAnswer.length > 100 && selectedEvaluation.is_auto_eval && (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded shadow">
                          ✓ AI Ready
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Real-time word count and progress */}
                  {textAnswer.length > 0 && (
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>Words: {textAnswer.split(' ').filter(w => w.length > 0).length}</span>
                        <span>Characters: {textAnswer.length}</span>
                        {selectedEvaluation.submission_type === 'code' && (
                          <span>Lines: {textAnswer.split('\n').length}</span>
                        )}
                      </div>
                      {selectedEvaluation.is_auto_eval && (
                        <div className="flex items-center gap-1">
                          <span className="text-blue-600">AI will evaluate this submission</span>
                          <span className="text-lg">🤖</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}              <div className="flex gap-3 pt-6 border-t mt-6">
                {/* AI Preview Section */}
                {selectedEvaluation.is_auto_eval && textAnswer.length > 50 && !submitting && (
                  <div className="w-full mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🔮</span>
                      <span className="text-sm font-medium text-purple-700">AI Preview</span>
                    </div>
                    <div className="text-xs text-purple-600">
                      Your submission will be automatically evaluated by AI. Expected features:
                      • Instant scoring and detailed feedback
                      • Strengths and improvement suggestions
                      • Comparison with model answers
                    </div>
                    {confidence > 0 && (
                      <div className="mt-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span>Confidence Level:</span>
                          <div className="flex-1 bg-purple-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${confidence * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-purple-700 font-medium">{Math.round(confidence * 100)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-3 w-full">
                  <Button 
                    onClick={handleSubmitEvaluation} 
                    className="flex-1 relative" 
                    disabled={submitting || analyzing || !user}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {submitting && <span className="animate-spin">⚡</span>}
                      {analyzing && <span className="animate-pulse">🤖</span>}
                      <span>
                        {submitting ? 'Submitting & AI Evaluating...' : 
                         analyzing ? 'AI Analyzing...' :
                         !user ? 'Login to Submit' : 
                         selectedEvaluation.is_auto_eval ? '🚀 Submit for AI Evaluation' : 'Submit'}
                      </span>
                      {selectedEvaluation.is_auto_eval && !submitting && !analyzing && (
                        <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">AI</span>
                      )}
                    </div>
                  </Button>
                  
                  {!user && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => window.location.href = '/login'}
                    >
                      Go to Login
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowTakeModal(false);
                      setSelectedEvaluation(null);
                      setCurrentAnswers([]);
                      setTextAnswer('');
                      setAiAnalysis(null);
                      setAiSuggestions([]);
                      setConfidence(0);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && selectedEvaluation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Results: {selectedEvaluation.title}</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResultsModal(false)}
                >
                  ✕
                </Button>
              </div>              <div className="space-y-4">
                {submissions.length > 0 ? (
                  submissions
                    .filter(sub => user?.email === sub.student_username || user?.role === 'instructor')
                    .map((submission) => (
                    <div key={submission.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Submission #{submission.id}</span>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            submission.status === 'auto_graded' ? 'text-green-600 bg-green-100' :
                            submission.status === 'manually_graded' ? 'text-blue-600 bg-blue-100' :
                            'text-yellow-600 bg-yellow-100'
                          }`}>
                            {submission.status.replace('_', ' ')}
                          </span>
                          {(submission.final_grade !== null || submission.provisional_grade !== null) && (
                            <span className="px-2 py-1 text-xs rounded text-purple-600 bg-purple-100">
                              Score: {submission.final_grade || submission.provisional_grade || 'N/A'}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        Submitted: {new Date(submission.submission_date).toLocaleString()}
                        {user?.role === 'instructor' && (
                          <span className="ml-4">By: {submission.student_username}</span>
                        )}
                      </div>

                      {submission.feedback && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-md">
                          <div className="font-medium text-sm text-blue-800 mb-1">Feedback:</div>
                          <div className="text-sm text-blue-700">{submission.feedback}</div>
                        </div>
                      )}

                      <div className="mt-3">
                        <div className="font-medium text-sm text-gray-700 mb-1">Submission:</div>
                        <div className="text-sm bg-gray-50 p-3 rounded-md max-h-32 overflow-y-auto">
                          {submission.submission_content}
                        </div>
                      </div>
                    </div>                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500 mb-2">
                      No results found for this evaluation
                    </div>
                    <div className="text-sm text-gray-400">
                      {user 
                        ? "You may not have submitted this evaluation yet, or results are still being processed." 
                        : "Please log in to view your results."
                      }
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Submissions Management Modal (For Instructors) */}
      {showSubmissionsModal && selectedEvaluation && user?.role === 'instructor' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Manage Submissions: {selectedEvaluation.title}</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSubmissionsModal(false)}
                >
                  ✕
                </Button>
              </div>

              <div className="space-y-4">
                {submissions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {submissions.map((submission) => (
                          <tr key={submission.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm">{submission.student_username}</td>
                            <td className="px-4 py-2 text-sm">
                              {new Date(submission.submission_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 text-xs rounded ${
                                submission.status === 'auto_graded' ? 'text-green-600 bg-green-100' :
                                submission.status === 'manually_graded' ? 'text-blue-600 bg-blue-100' :
                                'text-yellow-600 bg-yellow-100'
                              }`}>
                                {submission.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {submission.final_grade || submission.provisional_grade || 'Ungraded'}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    // Show submission details
                                    toast.success('Viewing submission: ' + submission.submission_content.substring(0, 50) + '...');
                                  }}
                                >
                                  View
                                </Button>
                                {selectedEvaluation.is_auto_eval && !submission.provisional_grade && (
                                  <Button
                                    size="sm"
                                    onClick={async () => {                                      try {
                                        const result = await aiEvaluationService.triggerAutoEvaluation(
                                          selectedEvaluation.id,
                                          submission.id
                                        );
                                        toast.success(`Auto-evaluation completed! Score: ${result.provisional_grade}`);
                                        // Reload submissions to see updated grades
                                        const updatedSubmissions = await aiEvaluationService.getSubmissions(selectedEvaluation.id);
                                        setSubmissions(updatedSubmissions);
                                      } catch (error: any) {
                                        console.error('Auto-evaluation error:', error);
                                        const errorMessage = error.response?.data?.detail || error.message || 'Auto-evaluation failed';
                                        toast.error(`Auto-evaluation failed: ${errorMessage}`);
                                      }
                                    }}
                                  >
                                    Auto-Grade
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-500 mb-2">
                      No submissions found for this evaluation
                    </div>
                    <div className="text-sm text-gray-400">
                      Students haven't submitted any responses yet, or you may need instructor permissions to view submissions.
                    </div>
                  </div>
                )}              </div>
            </div>
          </Card>
        </div>
      )}
      
      {/* AI Quiz Generator Modal */}
      <AIQuizGenerator
        isOpen={showQuizGenerator}
        onClose={() => setShowQuizGenerator(false)}
        onQuizCreated={handleQuizCreated}
      />

      {/* Quiz Management Modal */}
      {showQuizManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Manage Auto-Graded Quizzes</h2>
                <button
                  onClick={() => setShowQuizManager(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mt-2">View and manage your auto-graded quizzes</p>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {loadingQuizzes ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading quizzes...</span>
                </div>
              ) : autoGradedQuizzes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Auto-Graded Quizzes</h3>
                  <p className="text-gray-600">You haven't created any auto-graded quizzes yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {autoGradedQuizzes.map((quiz) => (
                    <div key={quiz.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900">{quiz.title}</h4>
                          <p className="text-gray-600 text-sm mt-1">{quiz.description}</p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <span className="text-blue-500">📝</span>
                              Type: {quiz.quiz_type || 'N/A'}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-green-500">📊</span>
                              Submissions: {(quiz as any).submission_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="text-purple-500">📅</span>
                              Created: {new Date(quiz.created_at).toLocaleDateString()}
                            </span>
                            {quiz.deadline && (
                              <span className="flex items-center gap-1">
                                <span className="text-red-500">⏰</span>
                                Deadline: {new Date(quiz.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            onClick={() => handleDeleteAutoGradedQuiz(quiz.id)}
                            disabled={deletingQuizId === quiz.id}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 text-sm"
                          >
                            {deletingQuizId === quiz.id ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Deleting...</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <span>🗑️</span>
                                <span>Delete</span>
                              </div>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      </div>
    </div>
  );
};

export default AIEvaluationsPage;
