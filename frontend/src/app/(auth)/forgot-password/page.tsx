// ============================================
// FILE: src/app/forgot-password/page.tsx (NEW FILE)
// ============================================

'use client';

import { useState } from 'react';
import { useForgotPassword } from '@/lib/api/auth/auth.hooks';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const forgotPasswordMutation = useForgotPassword();

  // Handle success via effect or callback. 
  // Since the hook handles success/error toasts, we just need to update local state.
  // We can attach a separate onSuccess to the mutate call or rely on the hook's mutation state.
  // Wait, I can't pass options to the hook call directly if I defined them in `useMutation` inside the hook UNLESS I exposed them.
  // In `useAuth.ts`, I defined onSuccess/onError inside useMutation. 
  // I should check `forgotPasswordMutation.isSuccess` in the component to set `emailSent`.

  // BETTER: modify the hook usage or just use mutate({ onSuccess: ... }) if useMutation allowed overrides?
  // React Query `mutate` allows onSuccess overrides.

  const onSubmit = (data: ForgotPasswordFormData) => {
    forgotPasswordMutation.mutate(data.email, {
      onSuccess: () => {
        setEmailSent(true);
      }
    });
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-[#1a2332] border-gray-800">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle className="text-2xl text-white">Check Your Email</CardTitle>
            <CardDescription className="text-gray-400">
              We've sent password reset instructions to <strong className="text-white">{getValues('email')}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400 text-center">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <Button
              onClick={() => setEmailSent(false)}
              variant="outline"
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Try Another Email
            </Button>
            <Link href="/login">
              <Button variant="ghost" className="w-full text-blue-400 hover:text-blue-300 hover:bg-blue-900/20">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-6">
      <Card className="w-full max-w-md bg-[#1a2332] border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Forgot Password?</CardTitle>
          <CardDescription className="text-gray-400">
            Enter your email address and we'll send you instructions to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="pl-10 bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={forgotPasswordMutation.isPending}
            >
              {forgotPasswordMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Reset Instructions
                </>
              )}
            </Button>

            <Link href="/login">
              <Button variant="ghost" className="w-full text-gray-400 hover:text-gray-300 hover:bg-gray-800">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
