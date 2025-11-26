"use client";

import { useAuthStore } from "@/lib/stores/authStore";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { UserMenu } from "@/components/auth/UserMenu";

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-futuristic">
      {/* Header */}
      <header className="relative z-20 border-b border-glow-purple/10 bg-navy-deep/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-glow-purple/30 blur-lg rounded-full" />
              <div className="relative h-10 w-10 rounded-full bg-linear-to-br from-glow-purple to-glow-magenta flex items-center justify-center">
                <span className="text-lg font-bold text-white">eTuckshop</span>
              </div>
            </div>
            <span className="font-bold text-xl text-white">eTuckshop</span>
          </div>
          
          <UserMenu />
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative">
        <div className="container mx-auto px-4 py-24 md:py-32">
          <div className="max-w-4xl mx-auto">
            {/* Hero Content */}
            <div className="text-center space-y-8 mb-16">
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                  <span className="text-gradient">Welcome to</span>
                  <br />
                  <span className="text-white">eTuckshop</span>
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto">
                  Your one-stop shop for all your needs
                </p>
              </div>

              {/* CTA based on auth state */}
              {isAuthenticated && user ? (
                <div className="space-y-6">
                  <div className="glass-card inline-block px-8 py-6 mx-auto">
                    <p className="text-xl text-white mb-2">
                      Hello, <span className="text-gradient font-semibold">{user.name}</span>! 👋
                    </p>
                    <p className="text-gray-400">
                      You are logged in as {user.role.toLowerCase()}.
                    </p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    {user.role === "ADMIN" ? (
                      <Button 
                        size="lg" 
                        onClick={() => router.push("/admin")}
                        className="bg-linear-to-r from-glow-purple to-glow-magenta hover:opacity-90 transition-opacity text-white font-semibold px-8 py-6 text-lg btn-glow"
                      >
                        Go to Admin Dashboard
                      </Button>
                    ) : (
                      <Button 
                        size="lg" 
                        onClick={() => router.push("/products")}
                        className="bg-linear-to-r from-glow-purple to-glow-magenta hover:opacity-90 transition-opacity text-white font-semibold px-8 py-6 text-lg btn-glow"
                      >
                        Start Shopping
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <Button 
                    size="lg" 
                    onClick={() => router.push("/login")}
                    className="bg-linear-to-r from-glow-purple to-glow-magenta hover:opacity-90 transition-opacity text-white font-semibold px-8 py-6 text-lg btn-glow"
                  >
                    Sign in
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={() => router.push("/register")}
                    className="border-glow-purple/30 bg-navy-deep/50 backdrop-blur-sm hover:bg-navy-deep/70 text-white font-semibold px-8 py-6 text-lg glass-card-hover"
                  >
                    Create account
                  </Button>
                </div>
              )}
            </div>

            {/* Feature Cards (Optional) */}
            <div className="grid md:grid-cols-3 gap-6 mt-20">
              <div className="glass-card glass-card-hover p-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-linear-to-br from-glow-purple/20 to-glow-magenta/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">🚀</span>
                </div>
                <h3 className="text-xl font-semibold text-white">Fast Delivery</h3>
                <p className="text-gray-400">Get your items delivered quickly and securely</p>
              </div>

              <div className="glass-card glass-card-hover p-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-linear-to-br from-glow-cyan/20 to-glow-purple/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-xl font-semibold text-white">Secure Payment</h3>
                <p className="text-gray-400">Your transactions are safe and encrypted</p>
              </div>

              <div className="glass-card glass-card-hover p-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-linear-to-br from-glow-pink/20 to-glow-cyan/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">⭐</span>
                </div>
                <h3 className="text-xl font-semibold text-white">Quality Products</h3>
                <p className="text-gray-400">Curated selection of the best items</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}