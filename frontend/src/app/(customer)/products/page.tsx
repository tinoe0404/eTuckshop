// src/app/products/page.tsx
import ProductsClient from './ProductsClient';

// ✅ CACHING ENABLED: This page will be cached for 60 seconds
export const revalidate = 60;

async function getProducts() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
  // 1. Log the URL so you can see in Vercel logs if it's undefined
  console.log(`Building /products. Fetching from: ${apiUrl}/products`);

  if (!apiUrl) {
    console.error("❌ NEXT_PUBLIC_API_URL is missing during build");
    return [];
  }

  try {
    // 2. Wrap fetch in try/catch to prevent build crashes
    const res = await fetch(`${apiUrl}/products`, { 
      next: { revalidate: 60 } // Ensure caching matches your export const
    });
    
    if (!res.ok) {
      // 3. Log the error status but return empty array to keep build alive
      console.error(`❌ API responded with status: ${res.status}`);
      return []; 
    }
    
    const json = await res.json();
    return json.data || [];
    
  } catch (error) {
    // 4. Catch network errors (like if backend is sleeping/down)
    console.error("❌ Network error during build:", error);
    return [];
  }
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main>
      {/* Pass the server-fetched data (or empty array) to client */}
      <ProductsClient initialProducts={products} />
    </main>
  );
}