import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartState {
  totalItems: number;
  setTotalItems: (count: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      totalItems: 0,
      setTotalItems: (count) => set({ totalItems: count }),
      clearCart: () => set({ totalItems: 0 }),
    }),
    {
      name: 'cart-storage',
    }
  )
);
