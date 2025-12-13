// File: src/app/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSession, signOut } from 'next-auth/react';
import { orderService } from '@/lib/api/services/order.service';
import { profileService } from '@/lib/api/services/profile.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Lock,
  Edit,
  Save,
  X,
  Eye,
  EyeOff,
  ShoppingBag,
  Package,
  DollarSign,
  Calendar,
  TrendingUp,
  Award,
  LogOut,
  Loader2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

/* -------------------- Validation -------------------- */

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

/* -------------------- Page -------------------- */

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status, update } = useSession();
  const user = session?.user;

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  /* -------------------- Auth Guard -------------------- */

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !user) {
    router.replace('/login');
    return null;
  }

  if (user.role !== 'CUSTOMER') {
    toast.error('Access denied. Customer only.');
    router.replace('/admin/dashboard');
    return null;
  }

  /* -------------------- Orders & Stats -------------------- */

  const { data: ordersData } = useQuery({
    queryKey: ['user-orders'],
    queryFn: orderService.getUserOrders,
    enabled: status === 'authenticated',
  });

  const orders = ordersData?.data || [];

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => o.status === 'PENDING').length,
    completedOrders: orders.filter((o) => o.status === 'COMPLETED').length,
    totalSpent: orders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + o.totalAmount, 0),
    avgOrderValue:
      orders.length > 0
        ? orders.reduce((sum, o) => sum + o.totalAmount, 0) / orders.length
        : 0,
    memberSince: new Date().toLocaleDateString(),
  };

  /* -------------------- Forms -------------------- */

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name ?? '',
      email: user.email ?? '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    resetProfile({
      name: user.name ?? '',
      email: user.email ?? '',
    });
  }, [user, resetProfile]);

  /* -------------------- Mutations -------------------- */

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      if (!user.id) throw new Error('User ID not found');
      return profileService.updateProfile(user.id, data);
    },
    onSuccess: async (response) => {
      await update({
        name: response.data.name,
        email: response.data.email,
        image: response.data.image,
      });
      toast.success('Profile updated successfully');
      setIsEditingProfile(false);
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ??
          error.message ??
          'Failed to update profile'
      );
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      throw new Error('Password change endpoint not implemented yet');
    },
    onSuccess: async () => {
      toast.success('Password changed successfully. Please login again.');
      resetPassword();
      await signOut({ redirect: true, callbackUrl: '/login' });
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message ??
          error.message ??
          'Failed to change password'
      );
    },
  });

  /* -------------------- Render -------------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <p className="text-4xl font-bold">{stats.totalOrders}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white">
            <CardContent className="p-6">
              <p className="text-4xl font-bold">{stats.completedOrders}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <CardContent className="p-6">
              {formatCurrency(stats.totalSpent).replace(/,/g, '')}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
            <CardContent className="p-6">
              {formatCurrency(stats.avgOrderValue).replace(/,/g, '')}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
