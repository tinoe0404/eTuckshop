export function useProducts() { return { data: [], isLoading: false }; }
export function useAdminProducts() { return { data: [], isLoading: false }; }
export function useProduct(id: number) { return { data: null, isLoading: false }; }
export function useProductsByCategory(id: number) { return { data: [], isLoading: false }; }
export function useSearchProducts(query: string) { return { data: [], isLoading: false }; }

// Admin mutations
export function useCreateProduct() { return { mutate: () => { }, isPending: false }; }
export function useUpdateProduct() { return { mutate: () => { }, isPending: false }; }
export function useDeleteProduct() { return { mutate: () => { }, isPending: false }; }
export function useBulkDeleteProducts() { return { mutate: () => { }, isPending: false }; }