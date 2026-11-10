import { Suspense } from "react";
import ProposalForm from "@/components/bookings/proposal-form";
import TutorPageSkeleton from "@/components/loading/tutor-page-skeleton";
import { AuthGate } from "@/components/auth/auth-provider";
export default function TutorTimeSlotPage() {
  return (
    <AuthGate role="tutor" fallback={<TutorPageSkeleton />}>
      <Suspense fallback={<TutorPageSkeleton />}>
        <ProposalForm />
      </Suspense>
    </AuthGate>
  );
}
