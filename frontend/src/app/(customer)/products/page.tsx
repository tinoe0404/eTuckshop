import { getProductsAction } from '@/lib/api/products/products.actions';
import { getCategoriesAction } from '@/lib/api/categories/categories.actions';
import ProductsClient from './ProductsClient';

// Enable caching for 60 seconds
export const revalidate = 60;

export default async function ProductsPage() {
  // Parallel fetching
  const [productsResponse, categoriesResponse] = await Promise.all([
    getProductsAction(),
    getCategoriesAction()
  ]);

  return (
    <main>
      <ProductsClient
        initialProducts={productsResponse.data || []}
        initialCategories={categoriesResponse.data || []}
      />
    </main>
  );
}