import { create } from 'zustand';
import { Customer } from './customers.types';

interface CustomerUIStore {
  // Search & Pagination
  searchQuery: string;
  currentPage: number;
  pageSize: number;

  // Dialog states
  viewingCustomer: Customer | null;
  deletingCustomerId: number | null;

  // Actions
  setSearchQuery: (query: string) => void;
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;

  openViewDialog: (customer: Customer) => void;
  closeViewDialog: () => void;

  openDeleteDialog: (id: number) => void;
  closeDeleteDialog: () => void;

  resetFilters: () => void;
}

export const useCustomerUIStore = create<CustomerUIStore>((set) => ({
  // Initial state
  searchQuery: '',
  currentPage: 1,
  pageSize: 10,
  viewingCustomer: null,
  deletingCustomerId: null,

  // Search & Pagination actions
  setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }), // Reset to page 1 on search
  setCurrentPage: (page) => set({ currentPage: page }),
  setPageSize: (size) => set({ pageSize: size, currentPage: 1 }),

  // Dialog actions
  openViewDialog: (customer) => set({ viewingCustomer: customer }),
  closeViewDialog: () => set({ viewingCustomer: null }),

  openDeleteDialog: (id) => set({ deletingCustomerId: id }),
  closeDeleteDialog: () => set({ deletingCustomerId: null }),

  // Reset
  resetFilters: () => set({ searchQuery: '', currentPage: 1, pageSize: 10 }),
}));
