export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
  }
  
  export interface PaginatedResponse<T> {
    success: boolean;
    data: {
      items: T[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }
  
  export interface ApiError {
    success: false;
    message: string;
    error?: string;
  }