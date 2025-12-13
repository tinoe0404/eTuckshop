import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
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
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
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
