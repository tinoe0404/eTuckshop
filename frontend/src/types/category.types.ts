export interface Category {
    id: number;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt?: string;
  }
  
  export interface CategoryWithProducts extends Category {
    productCount: number;
    _count?: {
      products: number;
    };
  }