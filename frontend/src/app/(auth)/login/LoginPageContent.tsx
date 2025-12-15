"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { User, ShieldCheck, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";

import { toast } from "sonner";
import Link from "next/link";

// Validation Schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;
type UserRole = "CUSTOMER" | "ADMIN" | null;

export default function LoginPageContent() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  const rememberMe = watch("rememberMe");

  useEffect(() => {
    setMounted(true);
  }, []);

  // ❌ REMOVE AUTO-REDIRECT - we'll redirect manually after backend login
  // useEffect(() => {
  //   if (status === "authenticated" && session?.user) {
  //     if (session.user.role === "ADMIN") {
  //       router.replace("/admin/dashboard");
  //     } else {
  //       router.replace("/dashboard");
  //     }
  //   }
  // }, [status, session, router]);

  const onSubmit = async (data: LoginFormData) => {
    if (!selectedRole) {
      toast.error("Please select a role to continue");
      return;
    }

    setLoading(true);

    try {
      // ✅ STEP 1: Sign in with NextAuth
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        role: selectedRole,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        setLoading(false);
        return;
      }

      // ✅ STEP 2: For ADMIN users, call backend to get JWT tokens BEFORE redirecting
      if (selectedRole === "ADMIN") {
        // Must use same domain as backend for cookies to work
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
        
        const backendResponse = await fetch(`${apiUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // Important: This sends cookies
          body: JSON.stringify({
            email: data.email,
            password: data.password,
          }),
        });

        const backendData = await backendResponse.json();

        if (!backendResponse.ok || !backendData.success) {
          toast.error("Failed to authenticate with backend");
          setLoading(false);
          return;
        }

        console.log("✅ Backend JWT tokens set");
        
        // ✅ Now redirect to admin dashboard
        toast.success("Login successful! Redirecting...");
        setLoading(false);
        router.replace("/admin/dashboard");
      } else {
        // ✅ Customer redirect
        toast.success("Login successful! Redirecting...");
        setLoading(false);
        router.replace("/dashboard");
      }

    } catch (error) {
      console.error("Login error:", error);
      toast.error("An error occurred during login");
      setLoading(false);
    }
  };

  if (!mounted) return null;

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    );
  }

  // ---------------------------
  // UI with Dark Theme
  // ---------------------------
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1419] p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-[#1a2332] border-gray-800 shadow-2xl">

        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white text-3xl font-bold">eT</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">
            Welcome to eTuckshop
          </h1>
          <p className="text-gray-400">Sign in to continue</p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setSelectedRole("CUSTOMER")}
            disabled={loading}
            className={`p-6 rounded-lg border-2 transition-all hover:scale-105 ${
              selectedRole === "CUSTOMER"
                ? "border-blue-500 bg-blue-900/20"
                : "border-gray-700 hover:border-gray-600"
            }`}
          >
            <div className="flex flex-col items-center space-y-3">
              <div
                className={`p-3 rounded-full ${
                  selectedRole === "CUSTOMER"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                <User className="w-6 h-6" />
              </div>
              <p className="font-semibold text-white">Customer</p>
              <p className="text-sm text-gray-400">Shop for products</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("ADMIN")}
            disabled={loading}
            className={`p-6 rounded-lg border-2 transition-all hover:scale-105 ${
              selectedRole === "ADMIN"
                ? "border-blue-500 bg-blue-900/20"
                : "border-gray-700 hover:border-gray-600"
            }`}
          >
            <div className="flex flex-col items-center space-y-3">
              <div
                className={`p-3 rounded-full ${
                  selectedRole === "ADMIN"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-800 text-gray-400"
                }`}
              >
                <ShieldCheck className="w-6 h-6" />
              </div>
              <p className="font-semibold text-white">Admin</p>
              <p className="text-sm text-gray-400">Manage the shop</p>
            </div>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="pl-10 bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500"
                disabled={loading}
                {...register("email")}
              />
            </div>
            {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="pl-10 pr-10 bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500"
                disabled={loading}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-sm text-red-400">{errors.password.message}</p>}
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) => setValue("rememberMe", checked as boolean)}
                disabled={loading}
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer text-gray-300">
                Remember me
              </Label>
            </div>

            <Link
              href="/forgot-password"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
            size="lg" 
            disabled={loading || !selectedRole}
          >
            {loading
              ? "Signing in..."
              : selectedRole
              ? "Sign in"
              : "Select a role to continue"}
          </Button>
        </form>

        {/* Sign Up */}
        <div className="text-center">
          <p className="text-sm text-gray-400">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}