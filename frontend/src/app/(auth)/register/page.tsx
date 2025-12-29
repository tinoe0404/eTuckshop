// File: src/app/(auth)/register/page.tsx
import { Metadata } from "next";
import RegisterPageContent from "./RegisterPageContent";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth"; // Ensure this path points to your NextAuth options

export const metadata: Metadata = {
  title: "Create Account | eTuckshop",
  description: "Sign up for a new account",
};

export default async function RegisterPage() {
  // 1. Check session server-side for speed
  const session = await getServerSession(authOptions);

  // 2. Only redirect if ALREADY logged in
  if (session) {
    if (session.user.role === "ADMIN") {
      redirect("/admin/dashboard");
    } else {
      redirect("/dashboard");
    }
  }

  // 3. Otherwise, render the form
  return <RegisterPageContent />;
}