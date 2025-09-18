export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'DEV' | 'CLIENT';
  isActive: boolean;
  emailVerified: boolean;
  githubId?: string;
  githubUsername?: string;
  githubAvatarUrl?: string;
  githubConnectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  githubUrl?: string;
  stagingUrl?: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: User;
  developers: ProjectDeveloper[];
}

export interface ProjectDeveloper {
  id: string;
  assignedAt: string;
  user: User;
}

export interface TestFlow {
  id: string;
  name: string;
  projectId: string;
  status: 'IDLE' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  lastRun?: string;
  duration?: number;
  description?: string;
}

export interface TestResult {
  id: string;
  flowId: string;
  status: 'SUCCESS' | 'FAILED';
  startedAt: string;
  completedAt: string;
  duration: number;
  logs?: string;
  errorMessage?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}
