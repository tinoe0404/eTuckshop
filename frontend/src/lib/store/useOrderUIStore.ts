// ============================================
// FILE: src/lib/store/useOrderUIStore.ts (REFACTORED)
// ============================================

import { create } from 'zustand';

/**
 * ✅ BEST PRACTICE: Zustand only stores UI state
 * 
 * ❌ REMOVED:
 * - viewingOrder (Order object) → Moved to React Query
 * 
 * ✅ KEPT:
 * - Filter states (searchQuery, statusFilter, etc.)
 * - Dialog open/close states (with IDs only)
 * - Pagination states
 */

export type OrderStatus = 'ALL' | 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';
export type PaymentType = 'ALL' | 'CASH' | 'PAYNOW';

interface OrderUIStore {
  // ===== CLIENT-SIDE SEARCH (COSMETIC) =====
  // ⚠️ This filters already-loaded orders for instant UX
  // For real search, add searchQuery to server params
  searchQuery: string;
  
  // ===== SERVER FILTERS (PASSED TO API) =====
  statusFilter: OrderStatus;
  paymentFilter: PaymentType;
  currentPage: number;
  pageSize: number;
  
  // ===== DIALOGS (STORE IDs, NOT FULL OBJECTS) =====
  viewingOrderId: number | null; // ✅ Store ID, fetch from React Query
  completingOrderId: number | null;
  rejectingOrderId: number | null;
  rejectReason: string;
  
  // ===== ACTIONS - FILTERS =====
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: OrderStatus) => void;
  setPaymentFilter: (payment: PaymentType) => void;
  setCurrentPage: (page: number) => void;
  
  // ===== ACTIONS - DIALOGS =====
  openViewDialog: (orderId: number) => void; // ✅ Takes ID only
  closeViewDialog: () => void;
  
  openCompleteDialog: (orderId: number) => void;
  closeCompleteDialog: () => void;
  
  openRejectDialog: (orderId: number) => void;
  closeRejectDialog: () => void;
  setRejectReason: (reason: string) => void;
  
  resetFilters: () => void;
}

const initialState = {
  searchQuery: '',
  statusFilter: 'ALL' as OrderStatus,
  paymentFilter: 'ALL' as PaymentType,
  currentPage: 1,
  pageSize: 10,
  viewingOrderId: null,
  completingOrderId: null,
  rejectingOrderId: null,
  rejectReason: '',
};

export const useOrderUIStore = create<OrderUIStore>((set) => ({
  // Initial state
  ...initialState,
  
  // Filter actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setStatusFilter: (status) => set({ 
    statusFilter: status, 
    currentPage: 1, // ✅ Reset page when filter changes
  }),
  
  setPaymentFilter: (payment) => set({ 
    paymentFilter: payment, 
    currentPage: 1, 
  }),
  
  setCurrentPage: (page) => set({ currentPage: page }),
  
  // Dialog actions
  openViewDialog: (orderId) => set({ viewingOrderId: orderId }), // ✅ Store ID only
  closeViewDialog: () => set({ viewingOrderId: null }),
  
  openCompleteDialog: (orderId) => set({ completingOrderId: orderId }),
  closeCompleteDialog: () => set({ completingOrderId: null }),
  
  openRejectDialog: (orderId) => set({ rejectingOrderId: orderId }),
  closeRejectDialog: () => set({ rejectingOrderId: null, rejectReason: '' }),
  
  setRejectReason: (reason) => set({ rejectReason: reason }),
  
  resetFilters: () => set({
    searchQuery: '',
    statusFilter: 'ALL',
    paymentFilter: 'ALL',
    currentPage: 1,
  }),
}));

/**
 * ✅ CORRECT USAGE PATTERN:
 * 
 * // Component:
 * const { viewingOrderId, openViewDialog, closeViewDialog } = useOrderUIStore();
 * const { data: orderData } = useOrder(viewingOrderId); // ✅ Fetch from React Query
 * const viewingOrder = orderData?.data;
 * 
 * // Open dialog:
 * <Button onClick={() => openViewDialog(order.id)}>View</Button>
 * 
 * // Dialog always shows fresh data from React Query:
 * <Dialog open={viewingOrderId !== null} onOpenChange={closeViewDialog}>
 *   {viewingOrder && <OrderDetails order={viewingOrder} />}
 * </Dialog>
 */