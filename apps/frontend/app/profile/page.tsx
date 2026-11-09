import { AuthGate } from "@/components/auth/auth-provider";
import ProfileForm from "@/components/auth/profile-form";
export default function ProfilePage() {
  return (
    <AuthGate>
      <ProfileForm />
    </AuthGate>
  );
}
