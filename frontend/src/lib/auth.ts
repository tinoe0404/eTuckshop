import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "crypto";

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

// ✅ Critical: Log configuration on startup
console.log('🔐 NextAuth Configuration:');
console.log('   API URL:', API_URL);
console.log('   Environment:', process.env.NODE_ENV);
console.log('   NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('   NEXTAUTH_SECRET exists:', !!process.env.NEXTAUTH_SECRET);
console.log('   NEXTAUTH_SECRET length:', process.env.NEXTAUTH_SECRET?.length || 0);

// ✅ Validate critical variables
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('❌ NEXTAUTH_SECRET is not set!');
}

if (process.env.NEXTAUTH_SECRET.length < 32) {
  throw new Error('❌ NEXTAUTH_SECRET must be at least 32 characters!');
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login",
    error: "/login", // Redirect to login on error
  },

  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        console.log('🔑 Authorization attempt:', credentials?.email);

        if (!credentials?.email || !credentials?.password) {
          console.error('❌ Missing credentials');
          throw new Error("Email and password are required");
        }

        try {
          console.log('📡 Calling API:', `${API_URL}/auth/verify-credentials`);

          const response = await fetch(`${API_URL}/auth/verify-credentials`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
              role: credentials.role,
            }),
          });

          console.log('📡 Backend response status:', response.status);

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('❌ Auth failed:', response.status, errorData);

            // ✅ Return null instead of throwing to show proper error
            return null;
          }

          // ✅ Parse response
          const data = await response.json();
          console.log('📦 Backend response:', JSON.stringify(data, null, 2));

          // ✅ Check response structure
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
          };

        } catch (error) {
          console.error('❌ Authorization error:', error);
          // ✅ Log full error details in production
          if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
          }
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🚪 Sign in callback:', {
        user: user?.email,
        account: account?.provider,
      });
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      // ✅ Initial sign in
      if (user) {
        console.log('🎫 Creating JWT token for:', user.email);
        token.id = user.id;
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role as "ADMIN" | "CUSTOMER";
        token.picture = user.image;
      }

      // ✅ Handle session updates
      if (trigger === "update" && session) {
        console.log('🔄 Updating JWT token');
        token = { ...token, ...session };
      }

      return token;
    },

    async session({ session, token }) {
      // ✅ Add token data to session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.userId = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as "ADMIN" | "CUSTOMER";
        session.user.image = token.picture as string | null;

        // 🔐 Generate HMAC Signature for Backend Verification
        // Uses QR_SIGNING_SECRET (shared with backend)
        const signatureSecret = process.env.QR_SIGNING_SECRET || process.env.NEXTAUTH_SECRET;
        if (signatureSecret && token.id) {
          session.user.signature = crypto
            .createHmac("sha256", signatureSecret)
            .update(token.id.toString())
            .digest("hex");
        }
      }

      console.log('✅ Session created:', session.user?.email, session.user?.role);
      return session;
    },

    async redirect({ url, baseUrl }) {
      console.log('🔀 Redirect callback:', { url, baseUrl });

      // ✅ Allow relative URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;

      // ✅ Allow same-origin URLs
      if (new URL(url).origin === baseUrl) return url;

      // ✅ Default to base URL
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
    async session(message) {
      console.log('📋 Session event:', message.session.user?.email);
    },
  },

  // ✅ CRITICAL: Always enable debug in production to see what's failing
  debug: true, // Enable temporarily to debug production issues

  // ✅ Cookie configuration for Vercel
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === "production" ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};