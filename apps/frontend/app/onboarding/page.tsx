import { AuthGate } from "@/components/auth/auth-provider";
import ProfileForm from "@/components/auth/profile-form";
import { ProfilePageSkeleton } from "@/components/loading/skeletons";
export default function OnboardingPage() {
  return (
    <AuthGate onboarding fallback={<ProfilePageSkeleton />}>
      <ProfileForm onboarding />
    </AuthGate>
  );
}
