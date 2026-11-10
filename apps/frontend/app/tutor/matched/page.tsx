import TutorHeader from "@/components/navigation/tutor-header";
import BookingList from "@/components/bookings/booking-list";
import { AuthGate } from "@/components/auth/auth-provider";
import TutorPageSkeleton from "@/components/loading/tutor-page-skeleton";
export default function TutorMatchedPage() {
  return (
    <AuthGate role="tutor" fallback={<TutorPageSkeleton />}>
      <main className="flex min-h-screen flex-col items-center gap-8 bg-white px-5 py-8 text-foreground sm:px-8">
        <TutorHeader activePage="matched" />
        <BookingList kind="matches" />
      </main>
    </AuthGate>
  );
}
