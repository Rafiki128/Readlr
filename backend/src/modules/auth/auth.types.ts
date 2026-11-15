export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  adminInvitation?: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'learner' | 'teacher';
  guardianConfirmed?: boolean;
  consent?: boolean;
  consentVersion?: string;
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

export interface FacebookTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
}

export interface FacebookProfileResponse {
  id?: string;
  name?: string;
  email?: string;
}
