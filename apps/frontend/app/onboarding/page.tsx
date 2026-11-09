import { AuthGate } from "@/components/auth/auth-provider";
import ProfileForm from "@/components/auth/profile-form";
export default function OnboardingPage() {
  return (
    <AuthGate onboarding>
      <ProfileForm onboarding />
    </AuthGate>
  );
}
