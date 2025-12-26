// ============================================
// FILE: src/app/profile/page.tsx (REFACTORED)
// ============================================
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSession, signOut } from 'next-auth/react';
import { useUserOrders } from '@/lib/hooks/useOrders'; // ✅ Use the hook
import { useUpdateProfile, useChangePassword } from '@/lib/hooks/useProfile'; // ✅ New hooks
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
  CheckCircle,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ===== HELPER FUNCTIONS =====

function getUserId(user: any): number {
  if (!user?.id) throw new Error('User ID not found');
  const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
  if (isNaN(userId)) throw new Error('Invalid user ID');
  return userId;
}

// ===== VALIDATION SCHEMAS =====

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

// ===== MAIN COMPONENT =====

export default function ProfilePage() {
  // ===== ALL HOOKS AT THE TOP =====
  const router = useRouter();
  const { data: session, status, update } = useSession();

  // ✅ UI state only
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ Fetch orders with proper hook
  const { data: ordersData } = useUserOrders();

  // ✅ Mutations with proper hooks
  const updateProfileMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  // ===== FORMS =====

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: session?.user?.name ?? '',
      email: session?.user?.email ?? '',
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

  // ===== DERIVED STATE =====
  const user = session?.user;
  const orders = ordersData?.data || [];

  const stats = useMemo(() => ({
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
  }), [orders]);

  // ===== EFFECTS =====
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'CUSTOMER') {
      toast.error('Access denied. Customer only.');
      router.replace('/admin/dashboard');
    }
  }, [status, session?.user?.role, router]);

  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name ?? '',
        email: user.email ?? '',
      });
    }
  }, [user?.name, user?.email, resetProfile]);

  // ===== EVENT HANDLERS =====

  const handleUpdateProfile = useCallback(async (data: ProfileFormData) => {
    try {
      const userId = getUserId(user);
      const response = await updateProfileMutation.mutateAsync({ 
        userId, 
        data 
      });
      
      // ✅ Update NextAuth session
      await update({
        name: response.data.name,
        email: response.data.email,
        image: response.data.image,
      });
      
      setIsEditingProfile(false);
    } catch (error) {
      // Error already handled by mutation hook
    }
  }, [user, updateProfileMutation, update]);

  const handleChangePassword = useCallback(async (data: PasswordFormData) => {
    try {
      const userId = getUserId(user);
      await changePasswordMutation.mutateAsync({ 
        userId, 
        data: {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }
      });
      
      resetPassword();
    } catch (error) {
      // Error already handled by mutation hook
    }
  }, [user, changePasswordMutation, resetPassword]);

  const handleCancelEdit = useCallback(() => {
    setIsEditingProfile(false);
    resetProfile({
      name: user?.name || '',
      email: user?.email || '',
    });
  }, [user?.name, user?.email, resetProfile]);

  const handleLogout = useCallback(async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  }, []);

  // ===== CONDITIONAL RENDERING =====

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !user || user.role !== 'CUSTOMER') {
    return (
      <div className="min-h-screen bg-[#0f1419] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  // ===== RENDER =====

  return (
    <div className="min-h-screen bg-[#0f1419] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <User className="w-10 h-10 text-blue-400" />
              My Profile
            </h1>
            <p className="text-gray-400 mt-1">
              Manage your account settings and view your activity
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-400 hover:text-red-300 border-gray-700 hover:bg-red-900/20">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#1a2332] border-gray-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Logout from your account?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  You will need to login again to access your account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
                  Logout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                  <p className="text-4xl font-bold mt-1">{stats.totalOrders}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Completed</p>
                  <p className="text-4xl font-bold mt-1">{stats.completedOrders}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Total Spent</p>
                  <p className="text-4xl font-bold mt-1">{formatCurrency(stats.totalSpent).replace(/,/g, '')}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Avg Order</p>
                  <p className="text-4xl font-bold mt-1">{formatCurrency(stats.avgOrderValue).replace(/,/g, '')}</p>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Profile Info Card */}
          <Card className="bg-[#1a2332] border-gray-800 shadow-xl lg:col-span-1">
            <CardHeader className="border-b border-gray-800 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
              <CardTitle className="flex items-center space-x-2 text-white">
                <User className="w-5 h-5 text-blue-400" />
                <span>Customer Info</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                {/* Avatar */}
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto ring-4 ring-blue-500/30">
                  <span className="text-4xl font-bold text-white">
                    {user.name?.charAt(0).toUpperCase() || 'C'}
                  </span>
                </div>

                {/* User Info */}
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {user.name}
                  </h2>
                  <p className="text-gray-400">{user.email}</p>
                </div>

                <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <User className="w-3 h-3 mr-1" />
                  {user.role}
                </Badge>

                <Separator className="bg-gray-700" />

                {/* Account Stats */}
                <div className="space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">Member Since</span>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {stats.memberSince}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Package className="w-4 h-4" />
                      <span className="text-sm">Pending Orders</span>
                    </div>
                    <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">
                      {stats.pendingOrders}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Award className="w-4 h-4" />
                      <span className="text-sm">Status</span>
                    </div>
                    <span className="text-sm font-semibold text-green-400">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Settings Tabs */}
          <Card className="bg-[#1a2332] border-gray-800 shadow-xl lg:col-span-2">
            <CardHeader className="border-b border-gray-800">
              <CardTitle className="text-white">Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-[#0f1419]">
                  <TabsTrigger value="profile" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    Edit Profile
                  </TabsTrigger>
                  <TabsTrigger value="password" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    Change Password
                  </TabsTrigger>
                </TabsList>

                {/* Edit Profile Tab */}
                <TabsContent value="profile" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    {/* Name Field */}
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="name"
                          type="text"
                          placeholder="Enter your full name"
                          className="pl-10 bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500"
                          disabled={!isEditingProfile}
                          {...registerProfile('name')}
                        />
                      </div>
                      {profileErrors.name && (
                        <p className="text-sm text-red-400">{profileErrors.name.message}</p>
                      )}
                    </div>

                    {/* Email Field */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-gray-300">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10 bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500"
                          disabled={!isEditingProfile}
                          {...registerProfile('email')}
                        />
                      </div>
                      {profileErrors.email && (
                        <p className="text-sm text-red-400">{profileErrors.email.message}</p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-4">
                      {isEditingProfile ? (
                        <>
                          <Button
                            onClick={handleSubmitProfile(handleUpdateProfile)}
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            disabled={updateProfileMutation.isPending}
                          >
                            {updateProfileMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={updateProfileMutation.isPending}
                            className="border-gray-700 text-gray-300 hover:bg-gray-800"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          onClick={() => setIsEditingProfile(true)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Profile
                        </Button>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Change Password Tab */}
                <TabsContent value="password" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    {/* Current Password */}
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword" className="text-gray-300">Current Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="currentPassword"
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder="Enter current password"
                          className="pl-10 pr-10 bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500"
                          {...registerPassword('currentPassword')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {passwordErrors.currentPassword && (
                        <p className="text-sm text-red-400">{passwordErrors.currentPassword.message}</p>
                      )}
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-gray-300">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Enter new password"
                          className="pl-10 pr-10 bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500"
                          {...registerPassword('newPassword')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        >
                          {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {passwordErrors.newPassword && (
                        <p className="text-sm text-red-400">{passwordErrors.newPassword.message}</p>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-300">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          className="pl-10 pr-10 bg-[#0f1419] border-gray-700 text-white placeholder:text-gray-500"
                          {...registerPassword('confirmPassword')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {passwordErrors.confirmPassword && (
                        <p className="text-sm text-red-400">{passwordErrors.confirmPassword.message}</p>
                      )}
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={handleSubmitPassword(handleChangePassword)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={changePasswordMutation.isPending}
                    >
                      {changePasswordMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Changing Password...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Change Password
                        </>
                      )}
                    </Button>

                    <p className="text-sm text-gray-400 text-center">
                      Note: You'll be logged out after changing your password
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}