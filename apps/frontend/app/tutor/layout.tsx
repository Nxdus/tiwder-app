import { AuthGate } from "@/components/auth/auth-provider";
import TutorPageSkeleton from "@/components/loading/tutor-page-skeleton";
export default function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate role="tutor" fallback={<TutorPageSkeleton />}>{children}</AuthGate>;
}
