// File: src/app/(auth)/login/LoginPageContent.tsx (UPDATED FOR NEXTAUTH)

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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

import { useLogin } from "@/lib/hooks/useAuth";

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
  const loginMutation = useLogin();

  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

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

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      if (session.user.role === "ADMIN") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [status, session, router]);

  const onSubmit = async (data: LoginFormData) => {
    if (!selectedRole) {
      toast.error("Please select a role to continue");
      return;
    }

    loginMutation.mutate(
      {
        email: data.email,
        password: data.password,
        role: selectedRole,
      },
      {
        onSuccess: (user) => {
          // Check if role matches selected role
          if (user.role !== selectedRole) {
            toast.error(`This account is not registered as ${selectedRole.toLowerCase()}`);
          }
        },
      }
    );
  };

  if (!mounted) return null;

  // Show loading while checking session
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // If authenticated, show loading while redirecting
  if (status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 shadow-2xl">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white text-3xl font-bold">eT</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome to eTuckshop
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Sign in to continue</p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setSelectedRole("CUSTOMER")}
            disabled={loginMutation.isPending}
            className={`p-6 rounded-lg border-2 transition-all hover:scale-105 ${
              selectedRole === "CUSTOMER"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex flex-col items-center space-y-3">
              <div
                className={`p-3 rounded-full ${
                  selectedRole === "CUSTOMER"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                <User className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 dark:text-white">Customer</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Shop for products
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("ADMIN")}
            disabled={loginMutation.isPending}
            className={`p-6 rounded-lg border-2 transition-all hover:scale-105 ${
              selectedRole === "ADMIN"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
            }`}
          >
            <div className="flex flex-col items-center space-y-3">
              <div
                className={`p-3 rounded-full ${
                  selectedRole === "ADMIN"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-900 dark:text-white">Admin</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage the shop
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="pl-10"
                disabled={loginMutation.isPending}
                {...register("email")}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="pl-10 pr-10"
                disabled={loginMutation.isPending}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={loginMutation.isPending}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="rememberMe"
                checked={rememberMe}
                onCheckedChange={(checked) =>
                  setValue("rememberMe", checked as boolean)
                }
                disabled={loginMutation.isPending}
              />
              <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                Remember me
              </Label>
            </div>

            <Link
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loginMutation.isPending || !selectedRole}
          >
            {loginMutation.isPending
              ? "Signing in..."
              : selectedRole
              ? "Sign in"
              : "Select a role to continue"}
          </Button>
        </form>

        {/* Sign Up */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold"
            >
              Sign up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}