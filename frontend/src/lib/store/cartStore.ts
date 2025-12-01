import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartState {
  totalItems: number;
  setTotalItems: (count: number) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      totalItems: 0,
      setTotalItems: (count) => set({ totalItems: count }),
    }),
    {
      name: 'cart-storage',
    }
  )
);