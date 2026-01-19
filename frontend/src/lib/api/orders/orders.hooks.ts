export function useUserOrders() { return { data: [], isLoading: false }; }
export function useOrder() { return { data: null, isLoading: false }; }
export function useCheckout() { return { mutate: () => { }, isPending: false }; }

// Admin
export function useAdminOrders() { return { data: [], isLoading: false }; }
export function useOrderStats() { return { data: null, isLoading: false }; }
export function useCompleteOrder() { return { mutate: () => { }, isPending: false }; }
export function useRejectOrder() { return { mutate: () => { }, isPending: false }; }
export function useScanQRCode() { return { mutate: () => { }, isPending: false }; }