import { Suspense } from "react";
import RegisterPageContent from "./RegisterPageContent";

export default function RegisterPageWrapper() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
