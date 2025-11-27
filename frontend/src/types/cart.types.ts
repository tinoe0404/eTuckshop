export interface CartItem {
    id: number;
    productId: number;
    quantity: number;
    price: number;
    product: {
      id: number;
      name: string;
      description: string | null;
      price: number;
      stock: number;
      categoryId: number;
    };
  }
  
  export interface Cart {
    id: number;
    userId: number;
    items: CartItem[];
    totalItems: number;
    totalAmount: number;
  }
  
  export interface CartSummary {
    totalItems: number;
    totalAmount: number;
    items: CartItem[];
  }
  
  export interface AddToCartRequest {
    productId: number;
    quantity: number;
  }
  
  export interface UpdateCartRequest {
    productId: number;
    quantity: number;
  }