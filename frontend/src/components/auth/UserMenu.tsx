"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Package, LogOut, LayoutDashboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function UserMenu() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, logout, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => router.push("/login")}>
          Sign in
        </Button>
        <Button onClick={() => router.push("/register")}>
          Sign up
        </Button>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();

      // ✅ Updated toast — OK
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });

      router.push("/");
    } catch (error) {
      // ❌ OLD: variant: "destructive" (removed in new system)
      // toast({
      //   title: "Error",
      //   description: "Failed to logout",
      //   variant: "destructive",
      // });

      // ✅ NEW: styled destructive toast (modern shadcn toast)
      toast({
        title: "Logout failed",
        description: "Something went wrong while logging out.",
        action: (
          <span className="font-semibold text-red-600">Error</span>
        ),
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar>
            <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {user.role === "ADMIN" && (
          <>
            <DropdownMenuItem onClick={() => router.push("/admin")}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Admin Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => router.push("/orders")}>
          <Package className="mr-2 h-4 w-4" />
          My Orders
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
