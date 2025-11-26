import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthContainer } from "@/components/auth/AuthContainer";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <AuthContainer
      title="Create an account"
      description="Enter your information to get started"
      footer={
        <div className="text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link 
            href="/login" 
            className="text-glow-purple hover:text-glow-magenta transition-colors font-medium hover:underline"
          >
            Sign in
          </Link>
        </div>
      }
    >
      <RegisterForm />
    </AuthContainer>
  );
}