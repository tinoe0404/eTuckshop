import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";

import { QueryProvider } from "@/lib/providers/QueryProvider";
import { ToastProvider } from "@/lib/providers/ToastProvider";

// OR if you use shadcn toaster:
// import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "eTuckshop - Your One-Stop Shop",
  description: "Shop for all your needs at eTuckshop",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          {children}

          {/* If you use your own ToastProvider from /lib/providers */}
          <ToastProvider />

          {/* If instead you want shadcn toaster, uncomment this: */}
          {/* <Toaster /> */}
        </QueryProvider>
      </body>
    </html>
  );
}
