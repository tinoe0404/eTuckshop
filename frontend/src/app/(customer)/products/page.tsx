import { getProductsAction } from '@/lib/api/products/products.actions';
import ProductsClient from './ProductsClient';

// Enable caching for 60 seconds
export const revalidate = 60;

/**
 * Products Page - Server Component
 * Fetches products server-side with caching
 */
async function getProducts() {
  const response = await getProductsAction();
  return response.data || [];
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main>
      {/* Pass the server-fetched data to client */}
      <ProductsClient initialProducts={products} />
    </main>
  );
}