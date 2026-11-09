import { Suspense } from "react";
import ProposalForm from "@/components/bookings/proposal-form";
export default function TutorTimeSlotPage() {
  return (
    <Suspense
      fallback={
        <p role="status" className="p-8 text-center">
          Loading request…
        </p>
      }
    >
      <ProposalForm />
    </Suspense>
  );
}
