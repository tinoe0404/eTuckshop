"use client";

import { useAuthStore } from "@/lib/stores/authStore";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { UserMenu } from "@/components/auth/UserMenu";

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">eT</span>
            </div>
            <span className="font-bold text-xl">eTuckshop</span>
          </div>
          
          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to eTuckshop
          </h1>
          
          {isAuthenticated && user ? (
            <div className="space-y-4">
              <p className="text-xl text-muted-foreground">
                Hello, {user.name}! 👋
              </p>
              <p className="text-muted-foreground">
                You are logged in as {user.role.toLowerCase()}.
              </p>
              
              {user.role === "ADMIN" ? (
                <Button size="lg" onClick={() => router.push("/admin")}>
                  Go to Admin Dashboard
                </Button>
              ) : (
                <Button size="lg" onClick={() => router.push("/products")}>
                  Start Shopping
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xl text-muted-foreground">
                Your one-stop shop for all your needs
              </p>
              <div className="flex gap-4 justify-center">
                <Button size="lg" onClick={() => router.push("/login")}>
                  Sign in
                </Button>
                <Button size="lg" variant="outline" onClick={() => router.push("/register")}>
                  Create account
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}