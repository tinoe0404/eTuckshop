import { getCartAction } from '@/lib/api/cart/cart.actions';
import CartClient from './CartClient';

// Do not cache cart - always fresh
export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const response = await getCartAction();
  const cart = response.data;

  // Even if cart is null (or error), we pass null to client 
  // which handles it as empty cart.
  return <CartClient initialCart={cart} />;
}
