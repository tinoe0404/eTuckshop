import { getAdminProductsAction } from '@/lib/api/products/products.actions';
import { getCategoriesAction } from '@/lib/api/categories/categories.actions';
import AdminProductsClient from './AdminProductsClient';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  // Parallel data fetching
  const [productsResponse, categoriesResponse] = await Promise.all([
    getAdminProductsAction(), // returns ProductListResponse (readonly Product[])
    getCategoriesAction()     // returns Category[]
  ]);

  return (
    <AdminProductsClient
      initialProducts={productsResponse.data || []}
      categories={categoriesResponse.data || []}
    />
  );
}
