import { AuthGate } from "@/components/auth/auth-provider";
export default function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGate role="tutor">{children}</AuthGate>;
}
