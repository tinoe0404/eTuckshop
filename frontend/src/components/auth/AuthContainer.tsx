"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthContainerProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthContainer({ title, description, children, footer }: AuthContainerProps) {
  return (
    <Card className="w-full glass-card glass-card-hover border-glow-purple/20">
      <CardHeader className="space-y-4 pb-8">
        {/* Logo with glow effect */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-glow-purple/20 blur-xl rounded-full" />
            <div className="relative h-16 w-16 rounded-full bg-linear-to-br from-glow-purple to-glow-magenta flex items-center justify-center logo-glow">
              <span className="text-3xl font-bold text-white">eTuckshop</span>
            </div>
          </div>
        </div>

        {/* Title with gradient text */}
        <CardTitle className="text-3xl text-center font-bold">
          <span className="text-gradient">{title}</span>
        </CardTitle>

        {/* Description */}
        <CardDescription className="text-center text-base text-gray-400">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {children}
        
        {footer && (
          <div className="pt-4 border-t border-glow-purple/10">
            {footer}
          </div>
        )}
      </CardContent>
    </Card>
  );
}