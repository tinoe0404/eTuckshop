import { getCartAction } from '@/lib/api/cart/cart.actions';
import CheckoutClient from './CheckoutClient';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const result = await getCartAction();

  // We could handle redirect here if cart is empty, 
  // but client component handles it well enough with specialized UI/Toast.

  return <CheckoutClient initialCart={result.data} />;
}
