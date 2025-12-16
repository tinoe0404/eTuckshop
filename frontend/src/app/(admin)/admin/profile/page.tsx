// File: src/app/(admin)/admin/profile/page.tsx (NEXTAUTH FIXED)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSession, signOut } from 'next-auth/react';
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
  Calendar,
  Shield,
  LogOut,
  Loader2,
  Crown,
} from 'lucide-react';

  // Add this helper at the top of the file (after imports)
  function getUserId(user: any): number {
    if (!user?.id) throw new Error('User ID not found');
    const userId = typeof user.id === 'string' ? parseInt(user.id, 10) : user.id;
    if (isNaN(userId)) throw new Error('Invalid user ID');
    return userId;
  }

// Validation schemas
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function AdminProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, status, update } = useSession();
  const user = session?.user;
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ Guard: Check authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f1724]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Show loading if not authenticated (middleware will redirect)
if (status === 'unauthenticated') {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1724]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

// Role check - only for authenticated users
if (status === 'authenticated' && user?.role !== 'ADMIN') {
  toast.error('Access denied. Admin only.');
  router.replace('/dashboard');
  return null;
}

// Safety check
if (!user) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f1724]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}
  // Profile form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
    },
  });

  // Password form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Sync form with user state when user changes
  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user, resetProfile]);


// Then in your component, update the mutations:

/* -------------------- Mutations -------------------- */

const updateProfileMutation = useMutation({
  mutationFn: async (data: ProfileFormData) => {
    const userId = getUserId(user); // 👈 Fixed
    return profileService.updateProfile(userId, data);
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

// If you have password change in admin profile too:
const changePasswordMutation = useMutation({
  mutationFn: async (data: PasswordFormData) => {
    const userId = getUserId(user); // 👈 Fixed
    return profileService.changePassword(userId, {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  },
  onSuccess: async () => {
    toast.success('Password changed successfully. Please login again.');
    resetPassword();
    setTimeout(async () => {
      await signOut({ redirect: true, callbackUrl: '/login' });
    }, 2000);
  },
  onError: (error: any) => {
    toast.error(
      error?.response?.data?.message ??
        error.message ??
        'Failed to change password'
    );
  },
});

  const handleUpdateProfile = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };
  
  const handleChangePassword = (data: PasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    resetProfile({
      name: user?.name || '',
      email: user?.email || '',
    });
  };

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/login' });
  };

  const memberSince = new Date().toLocaleDateString();

  return (
    <div className="min-h-screen bg-[#0f1724] p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white flex items-center gap-3">
              <Crown className="w-10 h-10 text-yellow-500" />
              Admin Profile
            </h1>
            <p className="text-gray-400 mt-1">
              Manage your administrator account settings
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-red-600 hover:text-red-700 border-red-600 hover:border-red-700">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-[#1a2332] border-gray-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Logout from your account?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  You will need to login again to access your admin account.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-gray-700 text-white hover:bg-gray-600 border-0">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">
                  Logout
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Profile Info Card */}
          <Card className="border-0 shadow-xl lg:col-span-1 bg-gradient-to-br from-[#1a2332] to-[#243447] border-gray-700">
            <CardHeader className="border-b border-gray-700 bg-gradient-to-r from-yellow-600/20 to-orange-600/20">
              <CardTitle className="flex items-center space-x-2 text-white">
                <Shield className="w-5 h-5 text-yellow-500" />
                <span>Admin Info</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                {/* Avatar */}
                <div className="w-24 h-24 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto ring-4 ring-yellow-500/30">
                  <span className="text-4xl font-bold text-white">
                    {user.name?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>

                {/* User Info */}
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {user.name}
                  </h2>
                  <p className="text-gray-400">{user.email}</p>
                </div>

                <Badge className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/30">
                  <Crown className="w-3 h-3 mr-1" />
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
                      {memberSince}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Shield className="w-4 h-4" />
                      <span className="text-sm">Role</span>
                    </div>
                    <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-500">
                      Administrator
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-gray-400">
                      <Crown className="w-4 h-4" />
                      <span className="text-sm">Access Level</span>
                    </div>
                    <span className="text-sm font-semibold text-yellow-500">
                      Full Access
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Settings Tabs */}
          <Card className="border-0 shadow-xl lg:col-span-2 bg-[#1a2332] border-gray-700">
            <CardHeader className="border-b border-gray-700">
              <CardTitle className="text-white">Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-[#0f1724]">
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
                          className="pl-10 bg-[#0f1724] border-gray-700 text-white placeholder:text-gray-500"
                          disabled={!isEditingProfile}
                          {...registerProfile('name')}
                        />
                      </div>
                      {profileErrors.name && (
                        <p className="text-sm text-red-500">{profileErrors.name.message}</p>
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
                          className="pl-10 bg-[#0f1724] border-gray-700 text-white placeholder:text-gray-500"
                          disabled={!isEditingProfile}
                          {...registerProfile('email')}
                        />
                      </div>
                      {profileErrors.email && (
                        <p className="text-sm text-red-500">{profileErrors.email.message}</p>
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
                            className="border-gray-700 text-gray-300 hover:bg-gray-700"
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
                          className="pl-10 pr-10 bg-[#0f1724] border-gray-700 text-white placeholder:text-gray-500"
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
                        <p className="text-sm text-red-500">{passwordErrors.currentPassword.message}</p>
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
                          className="pl-10 pr-10 bg-[#0f1724] border-gray-700 text-white placeholder:text-gray-500"
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
                        <p className="text-sm text-red-500">{passwordErrors.newPassword.message}</p>
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
                          className="pl-10 pr-10 bg-[#0f1724] border-gray-700 text-white placeholder:text-gray-500"
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
                        <p className="text-sm text-red-500">{passwordErrors.confirmPassword.message}</p>
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