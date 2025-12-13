// File: src/lib/auth.ts

import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// Define your User type
interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "CUSTOMER";
  image?: string | null;
  emailVerified?: Date | null;
}

export const authOptions: NextAuthOptions = {
  // Secret for JWT encryption (REQUIRED in production)
  secret: process.env.NEXTAUTH_SECRET,
  
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        try {
          // Call your backend to verify credentials
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/verify-credentials`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            }
          );

          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.message || "Invalid credentials");
          }

          // Return user object (must have id, name, email at minimum)
          return {
            id: data.user.id.toString(),
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            image: data.user.image || null,
            emailVerified: data.user.emailVerified || null,
          } as User;
        } catch (error: any) {
          console.error("Auth error:", error);
          throw new Error(error.message || "Authentication failed");
        }
      },
    }),
  ],

  // Session strategy - use JWT for stateless auth
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  // JWT configuration
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  // Callbacks
  callbacks: {
    // JWT callback - add custom fields to token
    async jwt({ token, user, trigger, session }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = (user as User).role;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }

      // Handle session updates
      if (trigger === "update" && session) {
        token.name = session.name || token.name;
        token.email = session.email || token.email;
        token.picture = session.image || token.picture;
      }

      return token;
    },

    // Session callback - add custom fields to session
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "CUSTOMER";
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string | null;
      }
      return session;
    },

    // Redirect callback - customize redirects after login
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  // Pages - customize auth pages
  pages: {
    signIn: "/login",
    // signOut: "/logout", // Optional
    // error: "/auth/error", // Optional
    // verifyRequest: "/auth/verify", // Optional
    // newUser: "/dashboard", // Optional
  },

  // Events - useful for logging
  events: {
    async signIn({ user, isNewUser }) {
      console.log("✅ User signed in:", user.email);
    },
    async signOut({ token }) {
      console.log("👋 User signed out:", token?.email);
    },
  },

  // Enable debug in development
  debug: process.env.NODE_ENV === "development",
};