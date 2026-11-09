import { Suspense } from "react";
import Login from "@/components/auth/login";
import Discover from "@/components/discover/discover";
import { LoginSkeleton } from "@/components/loading/skeletons";

export default function LoginPage() {
  return (
    <>
      <Discover />
      <Suspense fallback={<LoginSkeleton />}>
        <Login />
      </Suspense>
    </>
  );
}
