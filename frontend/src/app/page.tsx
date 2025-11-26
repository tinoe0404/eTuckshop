"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

export default function Home() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["api-status"],
    queryFn: async () => {
      const response = await fetch("http://localhost:5000");
      if (!response.ok) throw new Error("API connection failed");
      return response.json();
    },
  });

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to eTuckshop
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your One-Stop Shop for Everything You Need
          </p>

          {/* API Connection Status */}
          <div className="max-w-md mx-auto mb-8">
            {isLoading && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                Connecting to API...
              </div>
            )}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <p className="font-bold">❌ API Connection Failed</p>
                <p className="text-sm">{error.message}</p>
              </div>
            )}

            {data && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                <p className="font-bold">✅ API Connected Successfully</p>
                <p className="text-sm">Version: {data.version}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Link
              href="/products"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Browse Products
            </Link>
            <Link
              href="/test-api"
              className="bg-gray-200 text-gray-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
            >
              Test API
            </Link>
          </div>
        </div>

        {/* Available Endpoints */}
        {data?.endpoints && (
          <div className="max-w-2xl mx-auto mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
              Available API Endpoints
            </h2>
            <div className="bg-white rounded-lg shadow-md p-6">
              <ul className="space-y-2">
                {Object.entries(data.endpoints).map(([key, value]) => (
                  <li
                    key={key}
                    className="flex justify-between items-center py-2 border-b last:border-b-0"
                  >
                    <span className="font-semibold text-gray-700 capitalize">
                      {key}
                    </span>
                    <code className="text-sm bg-gray-100 px-3 py-1 rounded">
                      {value as string}
                    </code>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}