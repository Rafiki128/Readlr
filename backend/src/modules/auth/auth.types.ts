export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  role: 'learner' | 'teacher';
  name: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: number;
    email: string;
    role: 'learner' | 'teacher' | 'admin';
    name: string;
  };
}

export interface DecodedToken {
  id: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}
