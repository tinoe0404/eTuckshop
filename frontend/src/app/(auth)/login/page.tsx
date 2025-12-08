import { Suspense } from "react";
import LoginPageContent from "./LoginPageContent";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
