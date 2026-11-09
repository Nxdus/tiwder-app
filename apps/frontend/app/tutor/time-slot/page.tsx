import { Suspense } from "react";
import ProposalForm from "@/components/bookings/proposal-form";
import TutorPageSkeleton from "@/components/loading/tutor-page-skeleton";
export default function TutorTimeSlotPage() {
  return (
    <Suspense
      fallback={<TutorPageSkeleton />}
    >
      <ProposalForm />
    </Suspense>
  );
}
