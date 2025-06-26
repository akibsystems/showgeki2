import { getOrCreateUid } from './uid';
import { validateSchema } from './schemas';
import { ErrorType } from '@/types';
import type {
  HttpMethod,
  ApiRequestConfig,
  ApiResponse,
  AppError,
  Workspace,
  Story,
  Video,
  CreateWorkspaceRequest,
  CreateStoryRequest,
  UpdateStoryRequest,
  GenerateScriptResponse,
  GenerateVideoResponse,
  VideoStatusResponse,
  StoriesListResponse,
  ApiErrorResponse,
} from '@/types';

// ================================================================
// Configuration
// ================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

// ================================================================
// Error Classes
// ================================================================

export class ApiClientError extends Error implements AppError {
  public type: ErrorType;
  public statusCode?: number;
  public details?: Record<string, any>;
  public timestamp: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL,
    statusCode?: number,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

// ================================================================
// Utility Functions
// ================================================================

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Network errors, timeout, or 5xx status codes
  return (
    !error.statusCode ||
    error.statusCode >= 500 ||
    error.type === ErrorType.NETWORK
  );
}

/**
 * Extract error info from response
 */
async function extractErrorFromResponse(response: Response): Promise<{
  message: string;
  type: ErrorType;
  details?: any;
}> {
  let errorData: any = {};
  
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      errorData = await response.json();
    } else {
      errorData = { error: await response.text() };
    }
  } catch {
    errorData = { error: 'Unknown error occurred' };
  }

  const message = errorData.error || errorData.message || 'API request failed';
  let type = ErrorType.INTERNAL;

  // Map status codes to error types
  switch (response.status) {
    case 400:
      type = ErrorType.VALIDATION;
      break;
    case 401:
      type = ErrorType.AUTHENTICATION;
      break;
    case 403:
      type = ErrorType.AUTHORIZATION;
      break;
    case 404:
      type = ErrorType.NOT_FOUND;
      break;
    case 429:
      type = ErrorType.RATE_LIMIT;
      break;
    case 502:
    case 503:
    case 504:
      type = ErrorType.EXTERNAL_API;
      break;
    default:
      type = ErrorType.INTERNAL;
  }

  return {
    message,
    type,
    details: errorData.details,
  };
}

// ================================================================
// Main API Client Class
// ================================================================

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;

  constructor(
    baseUrl: string = API_BASE_URL,
    options: {
      timeout?: number;
      defaultHeaders?: Record<string, string>;
    } = {}
  ) {
    this.baseUrl = baseUrl;
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.defaultHeaders,
    };
  }

  /**
   * Make HTTP request with automatic UID injection and error handling
   */
  private async request<T>(
    config: ApiRequestConfig,
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    const {
      method,
      url,
      data,
      params,
      headers = {},
      timeout = this.timeout,
    } = config;

    // Build URL with query parameters
    const fullUrl = new URL(url, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        fullUrl.searchParams.set(key, value);
      });
    }

    // Prepare headers with automatic UID injection
    const requestHeaders = {
      ...this.defaultHeaders,
      ...headers,
    };

    // Add UID to headers if in browser environment
    if (typeof window !== 'undefined') {
      const uid = getOrCreateUid();
      if (uid) {
        requestHeaders['x-uid'] = uid;
      }
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: requestHeaders,
      signal: AbortSignal.timeout(timeout),
    };

    // Add body for non-GET requests
    if (data && method !== 'GET') {
      requestOptions.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(fullUrl.toString(), requestOptions);

      // Handle non-successful responses
      if (!response.ok) {
        const errorInfo = await extractErrorFromResponse(response);
        throw new ApiClientError(
          errorInfo.message,
          errorInfo.type,
          response.status,
          errorInfo.details
        );
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      let responseData: T;

      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = (await response.text()) as unknown as T;
      }

      // Convert headers to object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      };

    } catch (error: any) {
      // Handle network errors
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        throw new ApiClientError(
          'Request timeout',
          ErrorType.NETWORK,
          408
        );
      }

      if (error instanceof ApiClientError) {
        // Retry logic for retryable errors
        if (isRetryableError(error) && retryCount < RETRY_ATTEMPTS) {
          await sleep(RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
          return this.request<T>(config, retryCount + 1);
        }
        throw error;
      }

      // Unknown error
      throw new ApiClientError(
        error.message || 'Network error occurred',
        ErrorType.NETWORK
      );
    }
  }

  // ================================================================
  // HTTP Method Helpers
  // ================================================================

  async get<T>(url: string, params?: Record<string, string>): Promise<T> {
    const response = await this.request<T>({ method: 'GET', url, params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response = await this.request<T>({ method: 'POST', url, data });
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.request<T>({ method: 'PUT', url, data });
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response = await this.request<T>({ method: 'DELETE', url });
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    const response = await this.request<T>({ method: 'PATCH', url, data });
    return response.data;
  }

  // ================================================================
  // Workspace API Methods
  // ================================================================

  async getWorkspaces(): Promise<Workspace[]> {
    return this.get<Workspace[]>('/api/workspaces');
  }

  async getWorkspace(id: string): Promise<Workspace> {
    return this.get<Workspace>(`/api/workspaces/${id}`);
  }

  async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    return this.post<Workspace>('/api/workspaces', data);
  }

  async updateWorkspace(id: string, data: Partial<CreateWorkspaceRequest>): Promise<Workspace> {
    return this.put<Workspace>(`/api/workspaces/${id}`, data);
  }

  async deleteWorkspace(id: string): Promise<void> {
    await this.delete<void>(`/api/workspaces/${id}`);
  }

  // ================================================================
  // Story API Methods
  // ================================================================

  async getStories(params?: {
    workspace_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<StoriesListResponse> {
    const queryParams = params ? Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    ) : undefined;
    
    return this.get<StoriesListResponse>('/api/stories', queryParams);
  }

  async getStory(id: string): Promise<Story> {
    return this.get<Story>(`/api/stories/${id}`);
  }

  async createStory(data: CreateStoryRequest): Promise<Story> {
    return this.post<Story>('/api/stories', data);
  }

  async updateStory(id: string, data: UpdateStoryRequest): Promise<Story> {
    return this.put<Story>(`/api/stories/${id}`, data);
  }

  async deleteStory(id: string): Promise<void> {
    await this.delete<void>(`/api/stories/${id}`);
  }

  // ================================================================
  // Script Generation API Methods
  // ================================================================

  async generateScript(storyId: string): Promise<GenerateScriptResponse> {
    return this.post<GenerateScriptResponse>(`/api/stories/${storyId}/generate-script`);
  }

  // ================================================================
  // Video API Methods
  // ================================================================

  async generateVideo(storyId: string): Promise<GenerateVideoResponse> {
    return this.post<GenerateVideoResponse>(`/api/stories/${storyId}/generate-video`);
  }

  async getVideoStatus(videoId: string): Promise<VideoStatusResponse> {
    return this.get<VideoStatusResponse>(`/api/videos/${videoId}/status`);
  }

  async getVideos(params?: {
    story_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Video[]> {
    const queryParams = params ? Object.fromEntries(
      Object.entries(params).map(([key, value]) => [key, String(value)])
    ) : undefined;
    
    return this.get<Video[]>('/api/videos', queryParams);
  }

  async deleteVideo(videoId: string): Promise<void> {
    await this.delete<void>(`/api/videos/${videoId}`);
  }

  // ================================================================
  // Utility Methods
  // ================================================================

  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get<{ status: string; timestamp: string }>('/api/health');
  }

  /**
   * Get current user info (based on UID)
   */
  async getCurrentUser(): Promise<{ uid: string; workspaces: Workspace[] }> {
    return this.get<{ uid: string; workspaces: Workspace[] }>('/api/user/me');
  }

  /**
   * Validate data with schema before sending
   */
  async validateAndPost<T, U>(
    url: string,
    data: T,
    schema: any
  ): Promise<U> {
    const validation = validateSchema(schema, data);
    if (!validation.success) {
      throw new ApiClientError(
        'Validation failed',
        ErrorType.VALIDATION,
        400,
        { errors: validation.errors }
      );
    }
    
    return this.post<U>(url, validation.data);
  }
}

// ================================================================
// Singleton Instance
// ================================================================

export const apiClient = new ApiClient();

// ================================================================
// Export Types and Utilities
// ================================================================

export type { ApiRequestConfig, ApiResponse };
export { ApiClientError as ApiError };