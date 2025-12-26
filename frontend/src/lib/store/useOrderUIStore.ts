// ============================================
// FILE: src/lib/store/orderUIStore.ts (REFACTORED)
// ============================================

import { create } from 'zustand';

/**
 * ✅ BEST PRACTICE: Zustand only stores UI state
 * 
 * ❌ REMOVED:
 * - viewingOrder (now from React Query via orderId)
 * 
 * ✅ KEPT:
 * - Filter states (searchQuery, statusFilter, etc.)
 * - Dialog open/close states
 * - Pagination states
 */

export type OrderStatus = 'ALL' | 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';
export type PaymentType = 'ALL' | 'CASH' | 'PAYNOW';

interface OrderUIStore {
  // ===== FILTERS (CLIENT-SIDE) =====
  // ⚠️ NOTE: Server-side filtering happens in useAdminOrders params
  // These are for additional client-side UX (instant feedback)
  searchQuery: string;
  
  // ===== SERVER FILTERS (PASSED TO API) =====
  // These map to React Query params
  statusFilter: OrderStatus;
  paymentFilter: PaymentType;
  currentPage: number;
  pageSize: number;
  
  // ===== DIALOGS (UI STATE ONLY) =====
  viewingOrderId: number | null; // ✅ Store ID, not full order
  completingOrderId: number | null;
  rejectingOrderId: number | null;
  rejectReason: string;
  
  // ===== ACTIONS - FILTERS =====
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: OrderStatus) => void;
  setPaymentFilter: (payment: PaymentType) => void;
  setCurrentPage: (page: number) => void;
  
  // ===== ACTIONS - DIALOGS =====
  openViewDialog: (orderId: number) => void; // ✅ Takes ID, not full order
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
    currentPage: 1, // ✅ Reset page on filter change
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
 * ✅ USAGE EXAMPLE:
 * 
 * // In OrdersPage component:
 * const { viewingOrderId, openViewDialog } = useOrderUIStore();
 * const { data: viewingOrder } = useOrder(viewingOrderId); // ✅ Fetch from React Query
 * 
 * // Open dialog with ID:
 * <Button onClick={() => openViewDialog(order.id)}>View</Button>
 * 
 * // Render dialog:
 * {viewingOrder && <OrderDialog order={viewingOrder} />}
 */