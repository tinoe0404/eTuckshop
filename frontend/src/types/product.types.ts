export interface Product {
    id: number;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    categoryId: number;
    category: Category;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface ProductWithStockLevel extends Product {
    stockLevel: "LOW" | "MEDIUM" | "HIGH";
  }
  
  export interface Category {
    id: number;
    name: string;
    description: string | null;
    createdAt: string;
    updatedAt?: string;
  }
  
  export interface CategoryWithCount extends Category {
    productCount: number;
  }
  
  export interface ProductFilters {
    categoryId?: number;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: "name" | "price" | "createdAt";
    sortOrder?: "asc" | "desc";
  }