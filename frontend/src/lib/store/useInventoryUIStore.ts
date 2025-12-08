import { create } from 'zustand';

export type StockFilter = 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'OUT_OF_STOCK';
export type SortBy = 'name' | 'stock-low' | 'stock-high';

interface InventoryUIStore {
  // Filter states
  searchQuery: string;
  categoryFilter: string;
  stockFilter: StockFilter;
  sortBy: SortBy;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (categoryId: string) => void;
  setStockFilter: (filter: StockFilter) => void;
  setSortBy: (sort: SortBy) => void;
  
  resetFilters: () => void;
}

const initialState = {
  searchQuery: '',
  categoryFilter: 'all',
  stockFilter: 'ALL' as StockFilter,
  sortBy: 'stock-low' as SortBy,
};

export const useInventoryUIStore = create<InventoryUIStore>((set) => ({
  // Initial state
  ...initialState,
  
  // Actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setCategoryFilter: (categoryId) => set({ categoryFilter: categoryId }),
  
  setStockFilter: (filter) => set({ stockFilter: filter }),
  
  setSortBy: (sort) => set({ sortBy: sort }),
  
  resetFilters: () => set(initialState),
}));