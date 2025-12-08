import { create } from 'zustand';
import { Order } from '@/types';

export type OrderStatus = 'ALL' | 'PENDING' | 'PAID' | 'COMPLETED' | 'CANCELLED';
export type PaymentType = 'ALL' | 'CASH' | 'PAYNOW';

interface OrderUIStore {
  // Filters
  searchQuery: string;
  statusFilter: OrderStatus;
  paymentFilter: PaymentType;
  currentPage: number;
  pageSize: number;
  
  // Dialogs
  viewingOrder: Order | null;
  completingOrderId: number | null;
  rejectingOrderId: number | null;
  rejectReason: string;
  
  // Actions - Filters
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: OrderStatus) => void;
  setPaymentFilter: (payment: PaymentType) => void;
  setCurrentPage: (page: number) => void;
  
  // Actions - Dialogs
  openViewDialog: (order: Order) => void;
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
  viewingOrder: null,
  completingOrderId: null,
  rejectingOrderId: null,
  rejectReason: '',
};

export const useOrderUIStore = create<OrderUIStore>((set) => ({
  // Initial state
  ...initialState,
  
  // Filter actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setStatusFilter: (status) => set({ statusFilter: status, currentPage: 1 }),
  
  setPaymentFilter: (payment) => set({ paymentFilter: payment, currentPage: 1 }),
  
  setCurrentPage: (page) => set({ currentPage: page }),
  
  // Dialog actions
  openViewDialog: (order) => set({ viewingOrder: order }),
  closeViewDialog: () => set({ viewingOrder: null }),
  
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