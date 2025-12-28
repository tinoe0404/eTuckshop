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

/* -------------------------------------------------------------------------- */
/*                               Schema & Types                               */
/* -------------------------------------------------------------------------- */

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;
type UserRole = "CUSTOMER" | "ADMIN" | null;

/* -------------------------------------------------------------------------- */
/*                                Component                                   */
/* -------------------------------------------------------------------------- */

export default function LoginPageContent() {
  /* --------------------------------- Hooks --------------------------------- */
  const router = useRouter();
  const { status } = useSession();

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

  /* ------------------------------- Handlers -------------------------------- */
  const onSubmit = async (data: LoginFormData) => {
    if (!selectedRole) {
      toast.error("Please select a role to continue");
      return;
    }

    setLoading(true);

    try {
      // 1. Attempt NextAuth Sign In
      // This sends email, password, AND role to your authorize function
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        role: selectedRole,
        redirect: false, // Keep false so we can handle the error/success locally
      });

      if (result?.error) {
        // This handles 401 (Wrong pass) and 403 (Role mismatch) from your backend
        toast.error("Invalid credentials or unauthorized role access.");
        setLoading(false);
        return;
      }

      // 2. Success Path
      toast.success("Login successful! Redirecting...");

      // 3. Update the client-side state
      // router.refresh() forces Next.js to re-fetch server data/session
      router.refresh();

      // 4. Perform the redirect based on the role we ALREADY verified
      if (selectedRole === "ADMIN") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/dashboard");
      }

    } catch (err) {
      console.error("Login Navigation Error:", err);
      toast.error("A connection error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------- SAFE Early Returns --------------------------- */

  if (!mounted) return null;

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400" />
      </div>
    );
  }

  /* ---------------------------------- UI ---------------------------------- */

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
          <h1 className="text-3xl font-bold text-white">Welcome to eTuckshop</h1>
          <p className="text-gray-400">Sign in to continue</p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { role: "CUSTOMER", label: "Customer", icon: User, desc: "Shop for products" },
            { role: "ADMIN", label: "Admin", icon: ShieldCheck, desc: "Manage the shop" },
          ].map(({ role, label, icon: Icon, desc }) => (
            <button
              key={role}
              type="button"
              disabled={loading}
              onClick={() => setSelectedRole(role as UserRole)}
              className={`p-6 rounded-lg border-2 transition-all hover:scale-105 ${
                selectedRole === role
                  ? "border-blue-500 bg-blue-900/20"
                  : "border-gray-700 hover:border-gray-600"
              }`}
            >
              <div className="flex flex-col items-center space-y-3">
                <div
                  className={`p-3 rounded-full ${
                    selectedRole === role
                      ? "bg-blue-500 text-white"
                      : "bg-gray-800 text-gray-400"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <p className="font-semibold text-white">{label}</p>
                <p className="text-sm text-gray-400">{desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label className="text-gray-300">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                {...register("email")}
                disabled={loading}
                className="pl-10 bg-[#0f1419] border-gray-700 text-white"
                placeholder="Enter your email"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-400">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label className="text-gray-300">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                {...register("password")}
                disabled={loading}
                type={showPassword ? "text" : "password"}
                className="pl-10 pr-10 bg-[#0f1419] border-gray-700 text-white"
                placeholder="Enter your password"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-400">{errors.password.message}</p>
            )}
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={rememberMe}
                onCheckedChange={(v) => setValue("rememberMe", v as boolean)}
              />
              <Label className="text-gray-300 text-sm">Remember me</Label>
            </div>
            <Link href="/forgot-password" className="text-blue-400 text-sm">
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading || !selectedRole}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {/* Register */}
        <p className="text-center text-sm text-gray-400">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-400 font-semibold">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}
