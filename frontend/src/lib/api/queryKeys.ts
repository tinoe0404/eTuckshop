export const queryKeys = {
    // Categories
    categories: {
      all: ['categories'] as const,
      lists: () => [...queryKeys.categories.all, 'list'] as const,
      list: (filters?: Record<string, any>) => 
        [...queryKeys.categories.lists(), { filters }] as const,
      details: () => [...queryKeys.categories.all, 'detail'] as const,
      detail: (id: number) => [...queryKeys.categories.details(), id] as const,
      stats: () => [...queryKeys.categories.all, 'stats'] as const,
    },
    
    // Products (for reference)
    products: {
      all: ['products'] as const,
      lists: () => [...queryKeys.products.all, 'list'] as const,
      list: (filters?: Record<string, any>) => 
        [...queryKeys.products.lists(), { filters }] as const,
    },
    
    // Add other resources as needed
  } as const;
  