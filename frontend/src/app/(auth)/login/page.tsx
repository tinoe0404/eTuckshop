import { LoginForm } from "@/components/auth/LoginForm";
import { AuthContainer } from "@/components/auth/AuthContainer";

import Link from "next/link";

export default function LoginPage() {
  return (
    <AuthContainer
      title="Welcome back"
      description="Enter your credentials to access your account"
      footer={
        <div className="text-center text-sm text-gray-400">
          Don&apos;t have an account?{" "}
          <Link 
            href="/register" 
            className="text-glow-purple hover:text-glow-magenta transition-colors font-medium hover:underline"
          >
            Sign up
          </Link>
        </div>
      }
    >
      <LoginForm />
    </AuthContainer>
  );
}