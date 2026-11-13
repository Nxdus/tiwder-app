import { Suspense } from "react";
import Login from "@/components/auth/login";
import StudentDashboard from "@/components/student/student-dashboard";
import { LoginSkeleton } from "@/components/loading/skeletons";

export default function LoginPage() {
  return (
    <>
      <StudentDashboard tab="Discover" />
      <Suspense fallback={<LoginSkeleton />}>
        <Login />
      </Suspense>
    </>
  );
}
