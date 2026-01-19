export function useCart() { return { data: null, isLoading: false }; }
export function useCartSummary() { return { data: { totalItems: 0, totalAmount: 0 }, isLoading: false }; }
export function useCartCount() { return 0; }
export function useAddToCart() { return { mutate: () => { }, isPending: false }; }
export function useUpdateCartItem() { return { mutate: () => { }, isPending: false }; }
export function useRemoveFromCart() { return { mutate: () => { }, isPending: false }; }
export function useClearCart() { return { mutate: () => { }, isPending: false }; }