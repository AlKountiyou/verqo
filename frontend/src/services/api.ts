import axios, { AxiosResponse } from 'axios';
import Cookies from 'js-cookie';
import { ApiResponse, LoginRequest, LoginResponse, Project, User, TestFlow, TestResult } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the failing request is the login call itself, don't redirect/refresh
    const urlPath = (originalRequest?.url as string) || '';
    if (error.response?.status === 401 && (urlPath.includes('/auth/login') || urlPath.includes('/auth/register'))) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = Cookies.get('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data.data.tokens;
          
          Cookies.set('accessToken', accessToken);
          Cookies.set('refreshToken', newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          Cookies.remove('accessToken');
          Cookies.remove('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'CLIENT' | 'DEV';
  }): Promise<ApiResponse<{ user: User }>> => {
    const response: AxiosResponse<ApiResponse<{ user: User }>> = await api.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    const response: AxiosResponse<ApiResponse<LoginResponse>> = await api.post('/auth/login', credentials);
    return response.data;
  },

  logout: async (refreshToken: string): Promise<ApiResponse<{ message: string }>> => {
    const response: AxiosResponse<ApiResponse<{ message: string }>> = await api.post('/auth/logout', {
      refreshToken,
    });
    return response.data;
  },

  getProfile: async (): Promise<ApiResponse<{ user: User }>> => {
    const response: AxiosResponse<ApiResponse<{ user: User }>> = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<ApiResponse<{ tokens: { accessToken: string; refreshToken: string } }>> => {
    const response: AxiosResponse<ApiResponse<{ tokens: { accessToken: string; refreshToken: string } }>> = await api.post('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  verifyEmail: async (token: string): Promise<ApiResponse<{ message: string }>> => {
    const response: AxiosResponse<ApiResponse<{ message: string }>> = await api.get(
      `/auth/verify-email?token=${encodeURIComponent(token)}`,
    );
    return response.data;
  },

  forgotPassword: async (email: string): Promise<ApiResponse<{ message: string }>> => {
    const response: AxiosResponse<ApiResponse<{ message: string }>> = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> => {
    const response: AxiosResponse<ApiResponse<{ message: string }>> = await api.post('/auth/reset-password', {
      token,
      newPassword,
    });
    return response.data;
  },

  // GitHub OAuth
  connectGitHub: async (): Promise<void> => {
    window.location.href = `${API_BASE_URL}/auth/github`;
  },

  getUserRepositories: async (): Promise<ApiResponse<{ connected: boolean; repositories?: unknown[]; githubUsername?: string }>> => {
    const response: AxiosResponse<ApiResponse<{ connected: boolean; repositories?: unknown[]; githubUsername?: string }>> = await api.get('/auth/github/repositories');
    return response.data;
  },

  disconnectGitHub: async (): Promise<ApiResponse<{ connected: boolean }>> => {
    const response: AxiosResponse<ApiResponse<{ connected: boolean }>> = await api.post('/auth/github/disconnect');
    return response.data;
  },

  linkGitHub: async (payload: { githubId: string; githubUsername: string; githubAvatarUrl?: string; accessToken: string }): Promise<ApiResponse<{ message: string }>> => {
    const response: AxiosResponse<ApiResponse<{ message: string }>> = await api.post('/auth/github/link', payload);
    return response.data;
  },
};

// Projects API
export const projectsApi = {
  getProjects: async (): Promise<ApiResponse<{ projects: Project[] }>> => {
    const response: AxiosResponse<ApiResponse<{ projects: Project[] }>> = await api.get('/projects');
    return response.data;
  },

  getProject: async (id: string): Promise<ApiResponse<{ project: Project }>> => {
    const response: AxiosResponse<ApiResponse<{ project: Project }>> = await api.get(`/projects/${id}`);
    return response.data;
  },

  createProject: async (project: Partial<Project>): Promise<ApiResponse<{ project: Project }>> => {
    const response: AxiosResponse<ApiResponse<{ project: Project }>> = await api.post('/projects', project);
    return response.data;
  },

  updateProject: async (id: string, updates: Partial<Project>): Promise<ApiResponse<{ project: Project }>> => {
    const response: AxiosResponse<ApiResponse<{ project: Project }>> = await api.put(`/projects/${id}`, updates);
    return response.data;
  },

  deleteProject: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    const response: AxiosResponse<ApiResponse<{ message: string }>> = await api.delete(`/projects/${id}`);
    return response.data;
  },

  assignDeveloper: async (projectId: string, data: { userId: string }): Promise<ApiResponse<{ message: string }>> => {
    const response: AxiosResponse<ApiResponse<{ message: string }>> = await api.post(`/projects/${projectId}/developers`, data);
    return response.data;
  },

  removeDeveloper: async (projectId: string, developerId: string): Promise<ApiResponse<{ message: string }>> => {
    const response: AxiosResponse<ApiResponse<{ message: string }>> = await api.delete(`/projects/${projectId}/developers/${developerId}`);
    return response.data;
  },
};

// Users API
export const userApi = {
  getUsers: async (): Promise<ApiResponse<{ users: User[] }>> => {
    const response: AxiosResponse<ApiResponse<{ users: User[] }>> = await api.get('/users');
    return response.data;
  },

  updateUser: async (id: string, data: Partial<User>): Promise<ApiResponse<{ user: User }>> => {
    const response: AxiosResponse<ApiResponse<{ user: User }>> = await api.put(`/users/${id}`, data);
    return response.data;
  },

  deleteUser: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    const response: AxiosResponse<ApiResponse<{ message: string }>> = await api.delete(`/users/${id}`);
    return response.data;
  },

  toggleUserStatus: async (id: string): Promise<ApiResponse<{ user: User }>> => {
    const response: AxiosResponse<ApiResponse<{ user: User }>> = await api.patch(`/users/${id}/toggle-status`);
    return response.data;
  },
};

// Test flows API
export const testFlowsApi = {
  getFlowsByProject: async (projectId: string): Promise<TestFlow[]> => {
    const response: AxiosResponse<ApiResponse<{ flows: TestFlow[] }>> = await api.get(`/projects/${projectId}/flows`);
    return response.data.data.flows;
  },

  createFlow: async (projectId: string, flowData: {
    name: string;
    description?: string;
    category: 'BACKEND' | 'FRONTEND' | 'PERFORMANCE' | 'UNIT';
    objective?: string;
    methods: string[];
  }): Promise<ApiResponse<{ flow: TestFlow }>> => {
    const response: AxiosResponse<ApiResponse<{ flow: TestFlow }>> = await api.post(`/projects/${projectId}/flows`, flowData);
    return response.data;
  },

  updateFlow: async (projectId: string, flowId: string, flowData: {
    name?: string;
    description?: string;
    category?: 'BACKEND' | 'FRONTEND' | 'PERFORMANCE' | 'UNIT';
    objective?: string;
    methods?: string[];
  }): Promise<ApiResponse<{ flow: TestFlow }>> => {
    const response: AxiosResponse<ApiResponse<{ flow: TestFlow }>> = await api.put(`/projects/${projectId}/flows/${flowId}`, flowData);
    return response.data;
  },

  deleteFlow: async (projectId: string, flowId: string): Promise<ApiResponse<{ message: string }>> => {
    const response: AxiosResponse<ApiResponse<{ message: string }>> = await api.delete(`/projects/${projectId}/flows/${flowId}`);
    return response.data;
  },

  runTest: async (projectId: string, flowId: string): Promise<ApiResponse<{ result: unknown }>> => {
    const response: AxiosResponse<ApiResponse<{ result: unknown }>> = await api.post(`/projects/${projectId}/flows/${flowId}/run`);
    return response.data;
  },

  getTestResults: async (projectId: string, flowId: string, page: number = 1, limit: number = 10): Promise<ApiResponse<{ results: TestResult[]; pagination: unknown }>> => {
    const response: AxiosResponse<ApiResponse<{ results: TestResult[]; pagination: unknown }>> = await api.get(`/projects/${projectId}/flows/${flowId}/results?page=${page}&limit=${limit}`);
    return response.data;
  },

  getTestResultDetail: async (projectId: string, flowId: string, resultId: string): Promise<ApiResponse<{ result: TestResult }>> => {
    const response: AxiosResponse<ApiResponse<{ result: TestResult }>> = await api.get(`/projects/${projectId}/flows/${flowId}/results/${resultId}`);
    return response.data;
  },

  getFlowStatus: async (projectId: string, flowId: string): Promise<ApiResponse<{ id: string; name: string; status: string; lastRun: string; duration: number; category: string; methods: string[] }>> => {
    const response: AxiosResponse<ApiResponse<{ id: string; name: string; status: string; lastRun: string; duration: number; category: string; methods: string[] }>> = await api.get(`/projects/${projectId}/flows/${flowId}`);
    return response.data;
  },

  getScreenshot: (filename: string): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    return `${baseUrl}/screenshots/${filename}`;
  },
};

export default api;
