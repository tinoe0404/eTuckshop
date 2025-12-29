// File: src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import SessionProvider from "@/components/providers/SessionProvider";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "eTuckshop - Your Online Tuckshop",
  description: "Shop for your favorite products online",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-900 text-white`}>
        <SessionProvider>
          <ReactQueryProvider>
            {children}
          </ReactQueryProvider>

          <Toaster position="top-right" richColors />
        </SessionProvider>
      </body>
    </html>
  );
}

