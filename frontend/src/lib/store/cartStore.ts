// ============================================
// FILE: src/lib/store/cartStore.ts (REFACTORED)
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * ✅ CORRECT: Only UI state, no server state!
 * 
 * REMOVED:
 * - totalItems (now comes from React Query via useCartCount())
 * - setTotalItems (no longer needed)
 * - clearCart (use useClearCart() mutation instead)
 * 
 * KEPT:
 * - UI preferences (drawer open/closed, view mode)
 * - Client-side only state
 */

interface CartUIState {
  // UI state: Is cart drawer/sidebar open?
  isCartDrawerOpen: boolean;
  openCartDrawer: () => void;
  closeCartDrawer: () => void;
  toggleCartDrawer: () => void;
  
  // UI state: Selected items for bulk operations (future feature)
  selectedItems: Set<number>;
  selectItem: (id: number) => void;
  deselectItem: (id: number) => void;
  clearSelection: () => void;
}

export const useCartStore = create<CartUIState>()(
  persist(
    (set) => ({
      // Cart drawer state
      isCartDrawerOpen: false,
      openCartDrawer: () => set({ isCartDrawerOpen: true }),
      closeCartDrawer: () => set({ isCartDrawerOpen: false }),
      toggleCartDrawer: () => set((state) => ({ 
        isCartDrawerOpen: !state.isCartDrawerOpen 
      })),
      
      // Bulk selection (for future features like "delete selected")
      selectedItems: new Set<number>(),
      selectItem: (id) => set((state) => ({
        selectedItems: new Set([...state.selectedItems, id]),
      })),
      deselectItem: (id) => set((state) => {
        const newSet = new Set(state.selectedItems);
        newSet.delete(id);
        return { selectedItems: newSet };
      }),
      clearSelection: () => set({ selectedItems: new Set<number>() }),
    }),
    {
      name: 'cart-ui-storage',
      // Only persist drawer state (don't persist selection)
      partialize: (state) => ({
        isCartDrawerOpen: state.isCartDrawerOpen,
      }),
    }
  )
);

/**
 * ✅ MIGRATION GUIDE:
 * 
 * OLD (WRONG):
 * const { totalItems, setTotalItems } = useCartStore();
 * 
 * NEW (CORRECT):
 * import { useCartCount } from '@/lib/hooks/useCart';
 * const totalItems = useCartCount();
 */