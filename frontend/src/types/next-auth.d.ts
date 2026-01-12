// File: types/next-auth.d.ts
import NextAuth, { DefaultSession } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      userId: string;
      role: "ADMIN" | "CUSTOMER";
      email: string;
      name: string;
      image?: string | null;
      signature?: string; // ✅ HMAC Signature
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "ADMIN" | "CUSTOMER";
    email: string;
    name: string;
    image?: string | null;
    emailVerified?: Date | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    userId: string;
    role: "ADMIN" | "CUSTOMER";
    email: string;
    name: string;
    picture?: string | null;
  }
}