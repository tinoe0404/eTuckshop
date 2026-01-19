'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSession, signOut } from 'next-auth/react';
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
import { updateProfile, changePassword } from '@/lib/api/profile/profile.actions';
import { Order } from '@/lib/api/orders/orders.types';

// Validation Schemas
const profileSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

interface CustomerProfileClientProps {
    initialOrders: Order[];
}

export default function CustomerProfileClient({ initialOrders }: CustomerProfileClientProps) {
    const router = useRouter();
    const { data: session, status, update } = useSession();
    const user = session?.user;

    // UI State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Stats Calculation
    const stats = useMemo(() => ({
        totalOrders: initialOrders.length,
        pendingOrders: initialOrders.filter((o) => o.status === 'PENDING').length,
        completedOrders: initialOrders.filter((o) => o.status === 'COMPLETED').length,
        totalSpent: initialOrders
            .filter((o) => o.status === 'COMPLETED')
            .reduce((sum, o) => sum + o.totalAmount, 0),
        avgOrderValue:
            initialOrders.length > 0
                ? initialOrders.reduce((sum, o) => sum + o.totalAmount, 0) / initialOrders.length
                : 0,
        memberSince: new Date().toLocaleDateString(),
    }), [initialOrders]);

    // Forms
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

    const {
        register: registerPassword,
        handleSubmit: handleSubmitPassword,
        formState: { errors: passwordErrors },
        reset: resetPassword,
    } = useForm<PasswordFormData>({
        resolver: zodResolver(passwordSchema),
    });

    // Effect to sync user data
    useEffect(() => {
        if (user) {
            resetProfile({ name: user.name || '', email: user.email || '' });
        }
    }, [user, resetProfile]);

    // Handlers
    const handleUpdateProfile = async (data: ProfileFormData) => {
        setIsUpdatingProfile(true);
        const res = await updateProfile(data);

        if (res.success && res.data) {
            await update({
                name: res.data.name,
                email: res.data.email,
                image: res.data.image,
            });
            toast.success('Profile updated successfully');
            setIsEditingProfile(false);
        } else {
            toast.error(res.message);
        }
        setIsUpdatingProfile(false);
    };

    const handleChangePassword = async (data: PasswordFormData) => {
        setIsChangingPassword(true);
        const res = await changePassword({
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
        });

        if (res.success) {
            toast.success('Password changed successfully. Please login again.');
            resetPassword();
            setTimeout(async () => {
                await signOut({ redirect: true, callbackUrl: '/login' });
            }, 2000);
        } else {
            toast.error(res.message);
        }
        setIsChangingPassword(false);
    };

    const handleLogout = async () => {
        await signOut({ redirect: true, callbackUrl: '/login' });
    };

    const handleCancelEdit = () => {
        setIsEditingProfile(false);
        resetProfile({ name: user?.name || '', email: user?.email || '' });
    };

    if (status === 'loading') return <div className="min-h-screen bg-[#0f1419] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;

    return (
        <div className="min-h-screen bg-[#0f1419] p-4 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
                            <User className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
                            My Profile
                        </h1>
                        <p className="text-gray-400 mt-1">Manage your account settings and view activity</p>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" className="text-red-400 hover:text-red-300 border-gray-700 hover:bg-red-900/20 w-full sm:w-auto">
                                <LogOut className="w-4 h-4 mr-2" /> Logout
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#1a2332] border-gray-700">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">Logout?</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-400">You will need to login again.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="border-gray-700 text-gray-300 hover:bg-gray-800">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700">Logout</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Orders */}
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                        <CardContent className="p-4 sm:p-6 flex justify-between items-center">
                            <div><p className="text-blue-100 text-xs sm:text-sm font-medium">Total Orders</p><p className="text-2xl sm:text-4xl font-bold mt-1">{stats.totalOrders}</p></div>
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center"><ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                        </CardContent>
                    </Card>
                    {/* Completed */}
                    <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white border-0">
                        <CardContent className="p-4 sm:p-6 flex justify-between items-center">
                            <div><p className="text-green-100 text-xs sm:text-sm font-medium">Completed</p><p className="text-2xl sm:text-4xl font-bold mt-1">{stats.completedOrders}</p></div>
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center"><CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                        </CardContent>
                    </Card>
                    {/* Total Spent */}
                    <Card className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0">
                        <CardContent className="p-4 sm:p-6 flex justify-between items-center">
                            <div><p className="text-purple-100 text-xs sm:text-sm font-medium">Total Spent</p><p className="text-xl sm:text-4xl font-bold mt-1">{formatCurrency(stats.totalSpent)}</p></div>
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center"><DollarSign className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                        </CardContent>
                    </Card>
                    {/* Avg Order */}
                    <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0">
                        <CardContent className="p-4 sm:p-6 flex justify-between items-center">
                            <div><p className="text-orange-100 text-xs sm:text-sm font-medium">Avg Order</p><p className="text-xl sm:text-4xl font-bold mt-1">{formatCurrency(stats.avgOrderValue)}</p></div>
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center"><TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" /></div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Card */}
                    <Card className="bg-[#1a2332] border-gray-800 shadow-xl lg:col-span-1">
                        <CardHeader className="border-b border-gray-800 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
                            <CardTitle className="text-white flex items-center gap-2"><User className="w-5 h-5 text-blue-400" /> Customer Info</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 text-center space-y-4">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center ring-4 ring-blue-500/30">
                                <span className="text-4xl font-bold text-white">{user?.name?.charAt(0).toUpperCase() || 'C'}</span>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
                                <p className="text-gray-400">{user?.email}</p>
                            </div>
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><User className="w-3 h-3 mr-1" /> CUSTOMER</Badge>
                            <Separator className="bg-gray-700" />
                            <div className="space-y-3 text-left">
                                <div className="flex justify-between items-center text-sm"><span className="text-gray-400 flex gap-2"><Calendar className="w-4 h-4" /> Member Since</span><span className="text-white">{stats.memberSince}</span></div>
                                <div className="flex justify-between items-center text-sm"><span className="text-gray-400 flex gap-2"><Package className="w-4 h-4" /> Pending Orders</span><Badge variant="outline" className="border-yellow-500/30 text-yellow-400">{stats.pendingOrders}</Badge></div>
                                <div className="flex justify-between items-center text-sm"><span className="text-gray-400 flex gap-2"><Award className="w-4 h-4" /> Status</span><span className="text-green-400 font-semibold">Active</span></div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tabs */}
                    <Card className="bg-[#1a2332] border-gray-800 shadow-xl lg:col-span-2">
                        <CardHeader className="border-b border-gray-800"><CardTitle className="text-white">Settings</CardTitle></CardHeader>
                        <CardContent className="p-6">
                            <Tabs defaultValue="profile" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 bg-[#0f1419]">
                                    <TabsTrigger value="profile">Edit Profile</TabsTrigger>
                                    <TabsTrigger value="password">Change Password</TabsTrigger>
                                </TabsList>

                                {/* Profile Tab */}
                                <TabsContent value="profile" className="space-y-6 mt-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-gray-300">Name</Label>
                                            <div className="relative"><User className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" /><Input id="name" {...registerProfile('name')} disabled={!isEditingProfile} className="pl-10 bg-[#0f1419] border-gray-700 text-white" /></div>
                                            {profileErrors.name && <p className="text-red-400 text-sm">{profileErrors.name.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-gray-300">Email</Label>
                                            <div className="relative"><Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" /><Input id="email" {...registerProfile('email')} disabled={!isEditingProfile} className="pl-10 bg-[#0f1419] border-gray-700 text-white" /></div>
                                            {profileErrors.email && <p className="text-red-400 text-sm">{profileErrors.email.message}</p>}
                                        </div>
                                        <div className="flex gap-3 pt-4">
                                            {isEditingProfile ? (
                                                <>
                                                    <Button onClick={handleSubmitProfile(handleUpdateProfile)} disabled={isUpdatingProfile} className="flex-1 bg-blue-600 hover:bg-blue-700">{isUpdatingProfile ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-4 h-4" />} Save</Button>
                                                    <Button variant="outline" onClick={handleCancelEdit} disabled={isUpdatingProfile} className="border-gray-700 text-gray-300">Cancel</Button>
                                                </>
                                            ) : (
                                                <Button onClick={() => setIsEditingProfile(true)} className="w-full bg-blue-600 hover:bg-blue-700"><Edit className="mr-2 w-4 h-4" /> Edit Profile</Button>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>

                                {/* Password Tab */}
                                <TabsContent value="password" className="space-y-6 mt-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-gray-300">Current Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                                <Input type={showCurrentPassword ? "text" : "password"} {...registerPassword('currentPassword')} className="pl-10 pr-10 bg-[#0f1419] border-gray-700 text-white" />
                                                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-2.5 text-gray-400">{showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                                            </div>
                                            {passwordErrors.currentPassword && <p className="text-red-400 text-sm">{passwordErrors.currentPassword.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-300">New Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                                <Input type={showNewPassword ? "text" : "password"} {...registerPassword('newPassword')} className="pl-10 pr-10 bg-[#0f1419] border-gray-700 text-white" />
                                                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-2.5 text-gray-400">{showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                                            </div>
                                            {passwordErrors.newPassword && <p className="text-red-400 text-sm">{passwordErrors.newPassword.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-gray-300">Confirm Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                                <Input type={showConfirmPassword ? "text" : "password"} {...registerPassword('confirmPassword')} className="pl-10 pr-10 bg-[#0f1419] border-gray-700 text-white" />
                                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-2.5 text-gray-400">{showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                                            </div>
                                            {passwordErrors.confirmPassword && <p className="text-red-400 text-sm">{passwordErrors.confirmPassword.message}</p>}
                                        </div>
                                        <Button onClick={handleSubmitPassword(handleChangePassword)} disabled={isChangingPassword} className="w-full bg-blue-600 hover:bg-blue-700">
                                            {isChangingPassword ? <><Loader2 className="animate-spin mr-2" /> Updating...</> : <><Lock className="mr-2 w-4 h-4" /> Change Password</>}
                                        </Button>
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
