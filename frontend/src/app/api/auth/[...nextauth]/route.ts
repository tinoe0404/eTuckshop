// app/api/auth/[...nextauth]/route.ts - COMPLETE FIX

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// ✅ Validate critical environment variables on startup
const validateEnv = () => {
  const errors: string[] = [];

  if (!process.env.NEXTAUTH_SECRET) {
    errors.push("NEXTAUTH_SECRET is not set");
  }

  if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === "production") {
    errors.push("NEXTAUTH_URL is required in production");
  }

  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    errors.push("NEXTAUTH_SECRET must be at least 32 characters");
  }

  if (errors.length > 0) {
    console.error("❌ Environment validation failed:");
    errors.forEach(error => console.error(`   • ${error}`));
    throw new Error("Invalid environment configuration");
  }

  console.log("✅ Environment variables validated");
  console.log("   NEXTAUTH_SECRET: Set (length:", process.env.NEXTAUTH_SECRET!.length, ")");
  console.log("   NEXTAUTH_URL:", process.env.NEXTAUTH_URL || "Using default");
  console.log("   NODE_ENV:", process.env.NODE_ENV);
};

// Validate on module load
validateEnv();

// ✅ Create NextAuth handler
const handler = NextAuth(authOptions);

// ✅ Export for both GET and POST requests
export { handler as GET, handler as POST };

// ✅ Export authOptions for use in other parts of the app
export { authOptions };