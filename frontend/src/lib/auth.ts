// File: lib/auth.ts
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

// ✅ Get API URL based on environment
const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  if (process.env.NODE_ENV === 'production') {
    return 'https://etuckshop-backend.onrender.com/api';
  }
  
  return 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

console.log('🔐 NextAuth Configuration:');
console.log('   API URL:', API_URL);
console.log('   Environment:', process.env.NODE_ENV);
console.log('   NEXTAUTH_URL:', process.env.NEXTAUTH_URL);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log('🔑 Authorization attempt:', credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.error('❌ Missing credentials');
          throw new Error("Email and password are required");
        }

        try {
          const response = await fetch(`${API_URL}/auth/verify-credentials`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          console.log('📡 Backend response status:', response.status);

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('❌ Auth failed:', response.status, errorData);
            return null;
          }

          // ✅ FIX: Backend returns { success: true, user: {...} }
          const data = await response.json();
          console.log('📦 Backend response:', JSON.stringify(data, null, 2));

          // ✅ FIX: Access user from data.user, not data directly
          if (!data.success || !data.user || !data.user.id) {
            console.error('❌ Invalid user data from backend');
            return null;
          }

          const user = data.user;
          console.log('✅ User authenticated:', user.email, user.role);

          // ✅ Return user in NextAuth format
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.image || null,
            emailVerified: user.emailVerified || null,
          };

        } catch (error) {
          console.error('❌ Authorization error:', error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      console.log('🚪 Sign in callback:', user.email);
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // ✅ Initial sign in - add user data to token
      if (user) {
        console.log('🎫 Creating JWT token for:', user.email);
        token.id = user.id;
        token.userId = user.id; // Add userId for compatibility
        token.email = user.email;
        token.name = user.name;
        token.role = user.role as "ADMIN" | "CUSTOMER";
        token.picture = user.image; // NextAuth uses 'picture' for images in JWT
      }

      // ✅ Handle session updates
      if (trigger === "update" && session) {
        console.log('🔄 Updating JWT token');
        token = { ...token, ...session };
      }

      return token;
    },

    async session({ session, token }) {
      // ✅ Add token data to session for client use
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.userId = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as "ADMIN" | "CUSTOMER";
        session.user.image = token.picture as string | null;
      }

      console.log('✅ Session created:', session.user.email, session.user.role);
      return session;
    },

    async redirect({ url, baseUrl }) {
      console.log('🔀 Redirect callback:', { url, baseUrl });
      
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      
      return baseUrl;
    },
  },

  events: {
    async signIn(message) {
      console.log('✅ Sign in event:', message.user.email);
    },
    async signOut() {
      console.log('👋 Sign out event');
    },
  },

  debug: process.env.NODE_ENV === "development",

  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.NODE_ENV === "production" 
          ? ".vercel.app"
          : undefined,
      },
    },
    callbackUrl: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.callback-url"
        : "next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Host-next-auth.csrf-token"
        : "next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};