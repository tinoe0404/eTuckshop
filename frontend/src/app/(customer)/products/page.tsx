// src/app/products/page.tsx
import ProductsClient from './ProductsClient';

// ✅ CACHING ENABLED: This page will be cached for 60 seconds
export const revalidate = 60;

async function getProducts() {
  // FETCH DATA HERE
  // If you have a database function, call it directly (faster):
  // return await db.product.findMany(...);
  
  // OR fetch from your own API (ensure you use full URL):
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`);
  
  if (!res.ok) {
    throw new Error('Failed to fetch products');
  }
  
  const json = await res.json();
  return json.data; // Ensure this matches your API response structure
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main>
      {/* Pass the server-fetched data to the client component */}
      <ProductsClient initialProducts={products} />
    </main>
  );
}