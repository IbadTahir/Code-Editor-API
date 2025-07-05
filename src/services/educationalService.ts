import { educationalPlatformApi } from './apiClient';
import type {
  Book,
  BookCreate,
  Video,
  VideoCreate,
  AIEvaluation,
  AIEvaluationRequest,
  PaginatedResponse
} from '../types';

export class BookService {
  async getBooks(page = 1, limit = 10, _category?: string): Promise<PaginatedResponse<Book>> {
    const response = await educationalPlatformApi.get<{
      value: Book[];
      Count: number;
      page: number;
      limit: number;
      total_pages: number;
    }>(`/api/v1/books?page=${page}&limit=${limit}`);
    
    return {
      data: response.value,
      page: response.page,
      limit: response.limit,
      total: response.Count,
      totalPages: response.total_pages
    };
  }
  async getBook(bookId: number | string): Promise<Book> {
    // Get all books and find the specific one (since there's no individual book endpoint)
    const books = await educationalPlatformApi.get<Book[]>('/api/v1/books/available');
    const book = books.find(b => b.id === Number(bookId));
    if (!book) {
      throw new Error('Book not found');
    }
    return book;
  }

  async createBook(bookData: BookCreate): Promise<Book> {
    return await educationalPlatformApi.post<Book>('/api/v1/books/upload', bookData);
  }

  async updateBook(bookId: number | string, bookData: Partial<Book>): Promise<Book> {
    return await educationalPlatformApi.put<Book>(`/api/v1/books/${bookId}`, bookData);
  }

  async deleteBook(bookId: number | string): Promise<void> {
    await educationalPlatformApi.delete(`/api/v1/books/${bookId}`);
  }

  async searchBooks(query: string): Promise<Book[]> {
    return await educationalPlatformApi.get<Book[]>('/api/v1/books/search', { params: { query } });
  }

  async getActiveRentals(): Promise<any[]> {
    return await educationalPlatformApi.get<any[]>('/api/v1/books/active');
  }

  async getBookCategories(): Promise<string[]> {
    // Since API doesn't have a categories endpoint, return common categories
    return ['Programming', 'Mathematics', 'Science', 'Literature', 'History', 'Business'];
  }
}

export class VideoService {  async getVideos(page = 1, limit = 10, category?: string): Promise<PaginatedResponse<Video>> {
    const params: any = { page, limit };
    if (category) {
      params.subject = category; // API uses 'subject' instead of 'category'
    }
    
    const response = await educationalPlatformApi.get<{
      value: Video[];
      Count: number;
      page: number;
      limit: number;
      total_pages: number;
    }>('/api/v1/video-lectures', { params });
    
    return {
      data: response.value,
      page: response.page,
      limit: response.limit,
      total: response.Count,
      totalPages: response.total_pages
    };
  }

  async getVideo(videoId: number | string): Promise<Video> {
    return await educationalPlatformApi.get<Video>(`/api/v1/video-lectures/${videoId}`);
  }

  async createVideo(videoData: VideoCreate): Promise<Video> {
    return await educationalPlatformApi.post<Video>('/api/v1/video-lectures', videoData);
  }
  async updateVideo(videoId: number | string, videoData: Partial<Video>): Promise<Video> {
    return await educationalPlatformApi.put<Video>(`/api/v1/video-lectures/${videoId}`, videoData);
  }

  async deleteVideo(videoId: number | string): Promise<void> {
    try {
      await educationalPlatformApi.delete(`/api/v1/video-lectures/${videoId}`);
    } catch (error: any) {
      console.error('Delete video error:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Video not found or already deleted');
      } else if (error.response?.status === 403) {
        throw new Error('You can only delete videos that you created');
      } else if (error.response?.status === 401) {
        throw new Error('Authentication required to delete video');
      } else if (error.code === 'ECONNREFUSED' || !error.response) {
        throw new Error('Service endpoint not found. Please check if all services are running');
      } else {
        throw new Error(error.response?.data?.detail || error.message || 'Failed to delete video');
      }
    }
  }

  async getTeacherVideos(): Promise<Video[]> {
    return await educationalPlatformApi.get<Video[]>('/api/v1/video-lectures/teacher/lectures');
  }
  async getVideoCategories(): Promise<string[]> {
    // Since API doesn't have a categories endpoint, return common subjects
    return ['Programming', 'Web Development', 'Data Science', 'AI/ML', 'DevOps', 'Mobile Development'];
  }
}

export class AIEvaluationService {
  async createEvaluation(request: AIEvaluationRequest): Promise<AIEvaluation> {
    return await educationalPlatformApi.post<AIEvaluation>('/api/v1/evaluators/', request);
  }

  async getEvaluations(page = 1, limit = 10): Promise<PaginatedResponse<AIEvaluation>> {
    try {
      console.log('Fetching evaluations:', { page, limit, skip: (page - 1) * limit });
      
      const response = await educationalPlatformApi.get<{items: AIEvaluation[], total: number, skip: number, limit: number, has_more: boolean}>('/api/v1/evaluators/list', {
        params: { 
          skip: (page - 1) * limit, 
          limit 
        }
      });
      
      console.log('Evaluations API response:', response);
      
      return {
        data: response.items,
        page,
        limit,
        total: response.total,
        totalPages: Math.ceil(response.total / limit)
      };
    } catch (error) {
      console.error('Failed to fetch evaluations - Full error:', error);
      
      // More detailed error information
      if (error && typeof error === 'object') {
        const errorObj = error as any;
        console.error('Evaluation fetch error details:', {
          message: errorObj.message,
          status: errorObj.response?.status,
          statusText: errorObj.response?.statusText,
          data: errorObj.response?.data,
          config: errorObj.config
        });
      }
      
      throw error;
    }
  }

  async getEvaluation(evaluationId: number | string): Promise<AIEvaluation> {
    return await educationalPlatformApi.get<AIEvaluation>(`/api/v1/evaluators/${evaluationId}/view`);
  }

  async updateEvaluation(evaluationId: number | string, evaluationData: Partial<AIEvaluation>): Promise<AIEvaluation> {
    return await educationalPlatformApi.put<AIEvaluation>(`/api/v1/evaluators/${evaluationId}`, evaluationData);
  }

  async deleteEvaluation(evaluationId: number | string): Promise<void> {
    await educationalPlatformApi.delete(`/api/v1/evaluators/${evaluationId}`);
  }

  // New methods for auto-graded quiz management
  async deleteAutoGradedQuiz(evaluationId: number | string): Promise<{
    message: string;
    quiz_id: number;
    quiz_title: string;
    quiz_type: string;
    deleted_submissions: number;
    timestamp: string;
  }> {
    return await educationalPlatformApi.delete(`/api/v1/evaluators/${evaluationId}/auto-graded-quiz`);
  }

  async getAutoGradedQuizzes(params?: {
    skip?: number;
    limit?: number;
    search?: string;
    quiz_type?: string;
  }): Promise<{
    items: AIEvaluation[];
    total: number;
    skip: number;
    limit: number;
    has_more: boolean;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.skip !== undefined) queryParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.quiz_type) queryParams.append('quiz_type', params.quiz_type);

    const queryString = queryParams.toString();
    const url = `/api/v1/evaluators/auto-graded-quizzes${queryString ? '?' + queryString : ''}`;
    
    return await educationalPlatformApi.get(url);
  }

  async getEvaluationStatus(evaluationId: number | string): Promise<any> {
    return await educationalPlatformApi.get(`/api/v1/evaluators/${evaluationId}/status`);
  }

  async getEvaluationResult(evaluationId: number | string): Promise<any[]> {
    return await educationalPlatformApi.get(`/api/v1/evaluators/${evaluationId}/result`);
  }

  async submitEvaluation(evaluationId: number | string, submissionData: { submission_content: string }): Promise<any> {
    try {
      console.log('Submitting evaluation:', { evaluationId, submissionData });
      const response = await educationalPlatformApi.post(`/api/v1/evaluators/${evaluationId}/submit`, submissionData);
      console.log('Evaluation submission response:', response);
      return response;
    } catch (error) {
      console.error('Failed to submit evaluation:', error);
      throw error;
    }
  }

  async evaluateSubmission(evaluationId: number | string, answers: string[]): Promise<any> {
    return await educationalPlatformApi.post(`/api/v1/evaluators/${evaluationId}/evaluate`, {
      answers,
      evaluation_type: 'multiple_choice'
    });
  }

  async triggerAutoEvaluation(evaluationId: number | string, submissionId: number | string): Promise<any> {
    return await educationalPlatformApi.post(`/api/v1/evaluators/${evaluationId}/submissions/${submissionId}/evaluate`);
  }

  async gradeSubmission(evaluationId: number | string, submissionId: number | string, gradeData: any): Promise<any> {
    return await educationalPlatformApi.put(`/api/v1/evaluators/${evaluationId}/submissions/${submissionId}/grade`, gradeData);
  }

  async getSubmissions(evaluationId: number | string): Promise<any[]> {
    return await educationalPlatformApi.get(`/api/v1/evaluators/${evaluationId}/submissions`);
  }
}

export const bookService = new BookService();
export const videoService = new VideoService();
export const aiEvaluationService = new AIEvaluationService();
