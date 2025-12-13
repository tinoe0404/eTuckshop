// File: src/app/api/auth/[...nextauth]/route.ts

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Validate environment variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET is not set in environment variables");
}

if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV === "production") {
  throw new Error("NEXTAUTH_URL is required in production");
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };