import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem } from "@/types/cart.types";
import { cartService } from "@/lib/api/services/cart.service";

interface CartStore {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  isLoading: boolean;
  
  // Actions
  setCart: (items: CartItem[], totalItems: number, totalAmount: number) => void;
  addItem: (productId: number, quantity: number) => Promise<void>;
  updateItem: (productId: number, quantity: number) => Promise<void>;
  removeItem: (productId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      totalAmount: 0,
      isLoading: false,

      setCart: (items, totalItems, totalAmount) => {
        set({ items, totalItems, totalAmount });
      },

      addItem: async (productId: number, quantity: number) => {
        set({ isLoading: true });
        try {
          const response = await cartService.addToCart({ productId, quantity });
          const cart = response.data;
          
          set({
            items: cart.items,
            totalItems: cart.totalItems,
            totalAmount: cart.totalAmount,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      updateItem: async (productId: number, quantity: number) => {
        // Optimistic update
        const currentItems = get().items;
        const itemIndex = currentItems.findIndex(item => item.productId === productId);
        
        if (itemIndex !== -1) {
          const updatedItems = [...currentItems];
          updatedItems[itemIndex] = { ...updatedItems[itemIndex], quantity };
          
          const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
          const totalAmount = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          set({ items: updatedItems, totalItems, totalAmount });
        }

        // Sync with backend
        try {
          const response = await cartService.updateCartItem({ productId, quantity });
          const cart = response.data;
          
          set({
            items: cart.items,
            totalItems: cart.totalItems,
            totalAmount: cart.totalAmount,
          });
        } catch (error) {
          // Revert on error
          await get().syncWithBackend();
          throw error;
        }
      },

      removeItem: async (productId: number) => {
        // Optimistic update
        const currentItems = get().items;
        const updatedItems = currentItems.filter(item => item.productId !== productId);
        
        const totalItems = updatedItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalAmount = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        set({ items: updatedItems, totalItems, totalAmount });

        // Sync with backend
        try {
          const response = await cartService.removeFromCart(productId);
          const cart = response.data;
          
          set({
            items: cart.items,
            totalItems: cart.totalItems,
            totalAmount: cart.totalAmount,
          });
        } catch (error) {
          // Revert on error
          await get().syncWithBackend();
          throw error;
        }
      },

      clearCart: async () => {
        set({ items: [], totalItems: 0, totalAmount: 0 });
        
        try {
          await cartService.clearCart();
        } catch (error) {
          // Revert on error
          await get().syncWithBackend();
          throw error;
        }
      },

      syncWithBackend: async () => {
        try {
          const response = await cartService.getCart();
          const cart = response.data;
          
          set({
            items: cart.items,
            totalItems: cart.totalItems,
            totalAmount: cart.totalAmount,
          });
        } catch (error) {
          console.error("Failed to sync cart:", error);
        }
      },
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        totalItems: state.totalItems,
        totalAmount: state.totalAmount,
      }),
    }
  )
);