// File: src/types/next-auth.d.ts

import { DefaultSession, DefaultUser } from "next-auth";
import { JWT, DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "CUSTOMER";
      email: string;
      name: string;
      image?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: "ADMIN" | "CUSTOMER";
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: "ADMIN" | "CUSTOMER";
  }
}