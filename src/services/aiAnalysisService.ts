// AI Analysis Service for Editron Platform
// This service provides client-side AI assistance and integrates with backend AI evaluation

import { educationalPlatformApi } from './apiClient';

export interface AIAnalysis {
  suggestions: string[];
  estimatedScore: number;
  confidence: number;
  keyPoints: string[];
  wordCount: number;
  complexity: 'low' | 'medium' | 'high';
  readability: number;
}

export interface AIFeedback {
  score: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
}

export interface BackendAIEvaluation {
  score: number;
  feedback: string;
}

export interface AIGeneratedQuiz {
  title: string;
  description: string;
  language: string;
  difficulty: string;
  questions: QuizQuestion[];
  estimated_duration: number;
  total_points: number;
}

export interface QuizQuestion {
  id: number;
  type: 'mcq' | 'theoretical';
  question: string;
  options?: string[];
  correct_answer?: string;
  sample_answer?: string;
  explanation?: string;
  points: number;
}

export interface QuizGenerationRequest {
  language: 'python' | 'javascript' | 'java' | 'go';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  question_count: number;
  include_mcq: boolean;
  include_theoretical: boolean;
  topic?: string;
}

export class AIAnalysisService {
  
  /**
   * Analyze text content and provide AI insights
   */
  async analyzeContent(content: string, evaluationType: string): Promise<AIAnalysis> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const words = content.split(/\s+/).filter(word => word.length > 0);
        const wordCount = words.length;
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 0;
        
        // Technical keywords for different evaluation types
        const techKeywords = {
          code: ['algorithm', 'function', 'variable', 'loop', 'condition', 'array', 'object', 'class', 'method'],
          quiz: ['because', 'therefore', 'however', 'although', 'example', 'definition', 'concept'],
          assignment: ['analysis', 'research', 'conclusion', 'evidence', 'argument', 'discuss', 'evaluate']
        };
        
        const relevantKeywords = techKeywords[evaluationType as keyof typeof techKeywords] || [];
        const keywordCount = relevantKeywords.filter(keyword => 
          content.toLowerCase().includes(keyword)
        ).length;
        
        // Calculate estimated score (0-100)
        let estimatedScore = Math.min(100, Math.max(0, wordCount * 1.5));
        if (keywordCount > 0) estimatedScore += Math.min(20, keywordCount * 3);
        if (content.length > 500) estimatedScore += 10;
        if (avgWordsPerSentence > 8 && avgWordsPerSentence < 20) estimatedScore += 5;
        
        // Determine complexity
        let complexity: 'low' | 'medium' | 'high' = 'low';
        if (avgWordsPerSentence > 15 || keywordCount > 3) complexity = 'high';
        else if (avgWordsPerSentence > 10 || keywordCount > 1) complexity = 'medium';
        
        // Generate suggestions
        const suggestions = this.generateSuggestions(content, wordCount, keywordCount, evaluationType);
        
        // Extract key points
        const keyPoints = this.extractKeyPoints(content);
        
        // Calculate confidence (based on content quality indicators)
        let confidence = 0.7; // Base confidence
        if (wordCount > 50) confidence += 0.1;
        if (keywordCount > 0) confidence += 0.1;
        if (sentences.length > 3) confidence += 0.1;
        confidence = Math.min(1.0, confidence);
        
        resolve({
          suggestions,
          estimatedScore: Math.round(estimatedScore),
          confidence,
          keyPoints,
          wordCount,
          complexity,
          readability: Math.round(100 - (avgWordsPerSentence * 2))
        });
      }, 800 + Math.random() * 400); // Simulate processing time
    });
  }

  /**
   * Generate smart suggestions based on content analysis
   */
  generateSuggestions(content: string, wordCount: number, keywordCount: number, evaluationType: string): string[] {
    const suggestions: string[] = [];
    
    // Length-based suggestions
    if (wordCount < 30) {
      suggestions.push("Consider expanding your answer with more details and examples");
    } else if (wordCount > 300) {
      suggestions.push("Your answer is comprehensive. Make sure all points are relevant");
    }
    
    // Keyword-based suggestions
    if (keywordCount === 0) {
      if (evaluationType === 'code') {
        suggestions.push("Include technical terminology like 'algorithm', 'function', or 'variable'");
      } else {
        suggestions.push("Use more specific terminology related to the topic");
      }
    }
    
    // Structure suggestions
    if (!content.includes('example') && !content.includes('for instance')) {
      suggestions.push("Add concrete examples to illustrate your points");
    }
    
    // Code-specific suggestions
    if (evaluationType === 'code') {
      if (!content.includes('//') && !content.includes('/*')) {
        suggestions.push("Add comments to explain your code logic");
      }
      if (!content.includes('edge case') && !content.includes('error')) {
        suggestions.push("Consider discussing edge cases and error handling");
      }
    }
    
    // Writing quality suggestions
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 3) {
      suggestions.push("Break your response into multiple sentences for better clarity");
    }
    
    return suggestions.slice(0, 4); // Limit to top 4 suggestions
  }

  /**
   * Extract key points from content
   */
  extractKeyPoints(content: string): string[] {
    const sentences = content.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 150);
    
    // Simple scoring based on sentence characteristics
    const scoredSentences = sentences.map(sentence => {
      let score = 0;
      
      // Prefer sentences with important keywords
      const importantWords = ['because', 'therefore', 'however', 'function', 'algorithm', 'method', 'approach'];
      importantWords.forEach(word => {
        if (sentence.toLowerCase().includes(word)) score += 2;
      });
      
      // Prefer sentences that are not too short or too long
      if (sentence.length > 30 && sentence.length < 100) score += 1;
      
      // Prefer sentences with numbers or technical terms
      if (/\d/.test(sentence)) score += 1;
      if (/[A-Z]{2,}/.test(sentence)) score += 1;
      
      return { sentence, score };
    });
    
    return scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.sentence);
  }

  /**
   * Generate AI feedback preview
   */
  async getAIFeedbackPreview(content: string): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
        let feedback = "AI Preview: ";
        
        if (wordCount < 20) {
          feedback += "Your answer appears brief. Consider adding more detail and examples.";
        } else if (wordCount > 200) {
          feedback += "Good comprehensive answer! Ensure all points directly address the question.";
        } else {
          feedback += "Your answer length looks appropriate. Focus on clarity and accuracy.";
        }
        
        resolve(feedback);
      }, 300);
    });
  }

  /**
   * Generate smart suggestions for specific questions
   */
  generateSmartSuggestions(questionText: string, currentAnswer: string): string[] {
    const suggestions: string[] = [];
    const questionLower = questionText.toLowerCase();
    const answerLower = currentAnswer.toLowerCase();
    
    // Algorithm-related questions
    if (questionLower.includes('algorithm')) {
      if (!answerLower.includes('time complexity')) {
        suggestions.push("Consider discussing time complexity (Big O notation)");
      }
      if (!answerLower.includes('space')) {
        suggestions.push("Mention space complexity if relevant");
      }
    }
    
    // Code-related questions
    if (questionLower.includes('code') || questionLower.includes('program')) {
      if (!answerLower.includes('comment')) {
        suggestions.push("Include code comments for clarity");
      }
      if (!answerLower.includes('edge case')) {
        suggestions.push("Consider edge cases in your solution");
      }
    }
    
    // General academic questions
    if (questionLower.includes('explain') || questionLower.includes('describe')) {
      if (!answerLower.includes('example')) {
        suggestions.push("Add examples to illustrate your points");
      }
    }
    
    // Length-based suggestions
    if (currentAnswer.length < 100) {
      suggestions.push("Expand your answer with more detailed explanations");
    }
    
    return suggestions.slice(0, 3);
  }

  /**
   * Analyze code quality (basic client-side analysis)
   */
  analyzeCodeQuality(code: string, language: string = 'javascript'): {
    score: number;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 80; // Start with base score
    
    // Check for comments
    const hasComments = code.includes('//') || code.includes('/*') || code.includes('#');
    if (!hasComments) {
      issues.push("No comments found");
      suggestions.push("Add comments to explain your code logic");
      score -= 10;
    }
    
    // Check for proper indentation (basic check)
    const lines = code.split('\n');
    const inconsistentIndentation = lines.some((line, index) => {
      if (index > 0 && line.trim() && !line.startsWith(' ') && !line.startsWith('\t')) {
        return line.length > 0;
      }
      return false;
    });
    
    if (inconsistentIndentation) {
      issues.push("Inconsistent indentation detected");
      suggestions.push("Use consistent indentation for better readability");
      score -= 5;
    }
    
    // Language-specific checks
    if (language === 'javascript' || language === 'js') {
      if (!code.includes('const') && !code.includes('let') && code.includes('var')) {
        suggestions.push("Consider using 'const' or 'let' instead of 'var'");
        score -= 5;
      }
    }
    
    // Check for function definitions
    const hasFunctions = /function\s+\w+|=>\s*{|def\s+\w+/.test(code);
    if (hasFunctions && !hasComments) {
      suggestions.push("Document your functions with comments");
    }
    
    return {
      score: Math.max(0, Math.min(100, score)),
      issues,
      suggestions
    };
  }

  /**
   * Generate evaluation templates for instructors
   */
  generateEvaluationTemplate(type: 'quiz' | 'assignment', subject: string): {
    title: string;
    description: string;
    suggestions: string[];
  } {
    const templates = {
      quiz: {
        title: `${subject} Knowledge Assessment`,
        description: `This quiz evaluates your understanding of key ${subject} concepts. Please provide clear, detailed answers demonstrating your knowledge of the subject matter.`,
        suggestions: [
          "Include multiple choice questions for quick assessment",
          "Add open-ended questions for deeper understanding",
          "Consider time limits for realistic evaluation"
        ]
      },
      assignment: {
        title: `${subject} Practical Assignment`,
        description: `This assignment tests your ability to apply ${subject} concepts in practical scenarios. Submit your solution with clear explanations and documentation.`,
        suggestions: [
          "Require students to show their work/process",
          "Include rubric for consistent grading",
          "Allow multiple submission formats (text, code, etc.)"
        ]
      }
    };
    
    return templates[type];
  }
  
  /**
   * Call backend AI evaluation for quiz content
   */
  async evaluateWithBackend(
    quizContent: string,
    studentAnswer: string,
    evaluationType: 'quiz' | 'multiple_choice' | 'code' = 'quiz',
    language?: string
  ): Promise<BackendAIEvaluation> {
    try {
      let response;
      
      switch (evaluationType) {
        case 'quiz':
          // Call the gemini_utils evaluate_quiz function via a temporary endpoint
          response = await educationalPlatformApi.post('/api/v1/ai/evaluate-quiz', {
            quiz_content: quizContent,
            student_answer: studentAnswer,
            max_points: 100
          });
          break;
          
        case 'code':
          response = await educationalPlatformApi.post('/api/v1/ai/evaluate-code', {
            problem_description: quizContent,
            student_code: studentAnswer,
            language: language || 'python',
            test_cases: []
          });
          break;
          
        case 'multiple_choice':
          // quizContent should contain the correct answers and studentAnswer should contain student answers
          // Both should be JSON strings with arrays
          const correctAnswers = JSON.parse(quizContent);
          const studentAnswers = JSON.parse(studentAnswer);
          response = await educationalPlatformApi.post('/api/v1/ai/evaluate-multiple-choice', {
            correct_answers: correctAnswers,
            student_answers: studentAnswers
          });
          break;
          
        default:
          throw new Error(`Unsupported evaluation type: ${evaluationType}`);
      }
      
      return {
        score: (response as any).score || 0,
        feedback: (response as any).feedback || 'No feedback available'
      };
    } catch (error) {
      console.warn('Backend AI evaluation failed, falling back to client-side analysis:', error);
      // Fall back to client-side analysis
      const analysis = await this.analyzeContent(studentAnswer, evaluationType);
      return {
        score: analysis.estimatedScore,
        feedback: `Client-side analysis: ${analysis.suggestions.join(' ')}`
      };
    }
  }

  /**
   * Enhanced analyze content that combines client-side and backend AI
   */
  async analyzeContentEnhanced(content: string, evaluationType: string): Promise<AIAnalysis> {
    // Run client-side analysis first for immediate feedback
    const clientAnalysis = await this.analyzeContent(content, evaluationType);
    
    try {
      // Try to get backend AI evaluation for more accurate scoring
      const backendEval = await this.evaluateWithBackend(content, content, 'quiz');
      
      // Merge client analysis with backend evaluation
      return {
        ...clientAnalysis,
        estimatedScore: backendEval.score,
        confidence: 0.9, // Higher confidence when using real AI
        suggestions: [
          ...clientAnalysis.suggestions,
          `AI Feedback: ${backendEval.feedback.substring(0, 100)}...`
        ]
      };
    } catch (error) {
      // If backend fails, return client analysis
      console.warn('Backend AI evaluation not available, using client-side analysis');
      return clientAnalysis;
    }
  }

  /**
   * Check if backend AI is available
   */
  async checkAIStatus(): Promise<{ available: boolean; service: string }> {
    try {
      const status = await educationalPlatformApi.get('/api/v1/ai/status');
      return status as { available: boolean; service: string };
    } catch (error) {
      return { available: false, service: 'Offline' };
    }
  }

  /**
   * Generate an AI-powered quiz
   */
  async generateQuiz(request: QuizGenerationRequest): Promise<AIGeneratedQuiz> {
    try {
      const response = await educationalPlatformApi.post('/api/v1/ai/generate-quiz', request);
      return response as AIGeneratedQuiz;
    } catch (error) {
      console.error('Failed to generate AI quiz:', error);
      throw new Error('Failed to generate quiz. Please try again.');
    }
  }

  /**
   * Generate quiz and create evaluator
   */
  async generateQuizAndCreateEvaluator(request: QuizGenerationRequest): Promise<{
    evaluator_id: number;
    quiz: AIGeneratedQuiz;
    message: string;
    auto_evaluation_enabled: boolean;
  }> {
    try {
      console.log('Sending request to AI quiz API:', request);
      console.log('API URL:', '/api/v1/ai/create-from-ai-quiz');
      
      const response = await educationalPlatformApi.post('/api/v1/ai/create-from-ai-quiz', request);
      
      console.log('AI quiz API response:', response);
      return response as any;
    } catch (error) {
      console.error('Failed to create quiz evaluator - Full error:', error);
      
      // More detailed error information
      if (error && typeof error === 'object') {
        const errorObj = error as any;
        console.error('Error details:', {
          message: errorObj.message,
          status: errorObj.response?.status,
          statusText: errorObj.response?.statusText,
          data: errorObj.response?.data,
          config: errorObj.config
        });
        
        // Provide more specific error messages
        if (errorObj.response?.status === 422) {
          throw new Error('Invalid quiz parameters. Please check your inputs.');
        } else if (errorObj.response?.status === 500) {
          throw new Error('Server error while generating quiz. Please try again later.');
        } else if (errorObj.response?.status === 401) {
          throw new Error('Authentication required. Please log in and try again.');
        } else if (errorObj.response?.status === 403) {
          throw new Error('Access denied. You may not have permission to create quizzes.');
        } else if (errorObj.code === 'NETWORK_ERROR' || errorObj.message?.includes('Network Error')) {
          throw new Error('Network connection error. Please check if the AI service is running.');
        }
      }
      
      throw new Error('Failed to create quiz. Please try again.');
    }
  }
  
  /**
   * Evaluate multiple choice questions using Gemini AI
   */
  async evaluateMultipleChoice(
    correctAnswers: string[],
    studentAnswers: string[],
    pointsPerQuestion?: number
  ): Promise<BackendAIEvaluation> {
    try {
      const response = await educationalPlatformApi.post('/api/v1/ai/evaluate-multiple-choice', {
        correct_answers: correctAnswers,
        student_answers: studentAnswers,
        points_per_question: pointsPerQuestion
      });
      
      return {
        score: (response as any).score || 0,
        feedback: (response as any).feedback || 'No feedback available'
      };
    } catch (error) {
      console.warn('Backend MCQ evaluation failed:', error);
      
      // Fallback to simple scoring
      const totalQuestions = correctAnswers.length;
      const correctCount = correctAnswers.filter((correct, index) => 
        correct.toLowerCase().trim() === studentAnswers[index]?.toLowerCase().trim()
      ).length;
      
      const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
      const feedback = `Simple evaluation: ${correctCount}/${totalQuestions} correct answers (${score}%). Enable Gemini AI for detailed analysis.`;
      
      return { score, feedback };
    }
  }
}

export const aiAnalysisService = new AIAnalysisService();
