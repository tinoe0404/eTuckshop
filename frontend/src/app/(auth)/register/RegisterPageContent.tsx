// File: src/app/(auth)/register/RegisterPageContent.tsx
"use client";

import { useState, useEffect, useActionState } from "react";
import { useRouter } from "next/navigation";
import * as z from "zod";
import Link from "next/link";

import { User, ShieldCheck, Eye, EyeOff, Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

import { signupAction } from "@/lib/api/auth/auth.actions";

// Validation Schema (client-side only, server does Zod validation too)
const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
    role: z.enum(["CUSTOMER", "ADMIN"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPageContent() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(signupAction, null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"CUSTOMER" | "ADMIN">("CUSTOMER");
  const [mounted, setMounted] = useState(false);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  // Prevent Hydration Mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle successful registration
  useEffect(() => {
    if (state?.success && state?.data?.user) {
      toast.success("Account created successfully!", {
        description: "Redirecting to login...",
      });
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } else if (state?.error) {
      toast.error("Registration failed", {
        description: state.message || state.error,
      });
    }
  }, [state, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setClientErrors({});

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      confirmPassword: formData.get("confirmPassword") as string,
      role: selectedRole,
    };

    // Client-side validation
    try {
      registerSchema.parse(data);
      // Set role in formData for server action
      formData.set("role", selectedRole);
      // @ts-ignore - formAction expects proper types
      formAction(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            errors[issue.path[0] as string] = issue.message;
          }
        });
        setClientErrors(errors);
      }
    }
  };

  // Don't render until client-side hydration is complete
  if (!mounted) return null;

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
          <h1 className="text-3xl font-bold text-white">Create your account</h1>
          <p className="text-gray-400">Sign up to get started</p>
        </div>

        {/* Role Selection */}
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setSelectedRole("CUSTOMER")}
            disabled={isPending}
            className={`p-6 rounded-lg border-2 transition-all hover:scale-105 ${selectedRole === "CUSTOMER" ? "border-blue-500 bg-blue-900/20" : "border-gray-700 hover:border-gray-600"}`}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className={`p-3 rounded-full ${selectedRole === "CUSTOMER" ? "bg-blue-500 text-white" : "bg-gray-800 text-gray-400"}`}>
                <User className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-white">Customer</p>
                <p className="text-sm text-gray-400">Shop for products</p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("ADMIN")}
            disabled={isPending}
            className={`p-6 rounded-lg border-2 transition-all hover:scale-105 ${selectedRole === "ADMIN" ? "border-blue-500 bg-blue-900/20" : "border-gray-700 hover:border-gray-600"}`}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className={`p-3 rounded-full ${selectedRole === "ADMIN" ? "bg-blue-500 text-white" : "bg-gray-800 text-gray-400"}`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-white">Admin</p>
                <p className="text-sm text-gray-400">Manage the shop</p>
              </div>
            </div>
          </button>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="role" value={selectedRole} />

          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="Enter your name"
              disabled={isPending}
              className="bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500"
            />
            {clientErrors.name && <p className="text-sm text-red-400">{clientErrors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-300">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                className="pl-10 bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500"
                disabled={isPending}
              />
            </div>
            {clientErrors.email && <p className="text-sm text-red-400">{clientErrors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-300">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="pl-10 pr-10 bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                disabled={isPending}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {clientErrors.password && <p className="text-sm text-red-400">{clientErrors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-300">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                className="pl-10 pr-10 bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500"
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(p => !p)}
                disabled={isPending}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {clientErrors.confirmPassword && <p className="text-sm text-red-400">{clientErrors.confirmPassword}</p>}
          </div>

          <Button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
            disabled={isPending}
          >
            {isPending ? "Creating account..." : "Sign up"}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}