"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export default function TestAPIPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["test-connection"],
    queryFn: async () => {
      const response = await fetch("http://localhost:5000");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-300">
      <div className="bg-blue p-8 rounded-lg shadow-lg max-w-2xl w-full">
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back to Home
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-center">
          API Connection Test
        </h1>

        {isLoading && (
          <div className="text-center text-gray-600 py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            Loading...
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">❌ Error!</p>
            <p className="mt-2">{error.message}</p>
            <div className="mt-4 text-sm">
              <p className="font-semibold">Troubleshooting:</p>
              <ul className="list-disc list-inside mt-2">
                <li>Make sure your backend is running on http://localhost:5000</li>
                <li>Check if CORS is enabled on your backend</li>
                <li>Check the browser console for more details (F12)</li>
              </ul>
            </div>
          </div>
        )}

        {data && (
          <>
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              <p className="font-bold">✅ Connection Successful!</p>
              <p className="text-sm mt-1">
                Your frontend is successfully communicating with your backend.
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-semibold mb-2">API Response:</p>
              <pre className="bg-gray-800 text-green-400 p-4 rounded overflow-x-auto text-sm">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </>
        )}

        <div className="mt-6 pt-6 border-t text-center text-sm text-gray-600">
          <p>Backend: <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:5000</code></p>
          <p>Frontend: <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3000</code></p>
        </div>
      </div>
    </div>
  );
}