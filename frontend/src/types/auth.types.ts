export interface User {
    id: number;
    name: string;
    email: string;
    role: "ADMIN" | "CUSTOMER";
    createdAt: string;
    updatedAt: string;
  }
  
  export interface LoginCredentials {
    email: string;
    password: string;
  }
  
  export interface RegisterData {
    name: string;
    email: string;
    password: string;
    role?: "CUSTOMER";
  }
  
  export interface AuthResponse {
    success: boolean;
    message: string;
    user: User;
    accessToken: string;
    refreshToken: string;
  }
  
  export interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
  }