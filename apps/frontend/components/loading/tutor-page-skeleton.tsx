"use client";

import { usePathname } from "next/navigation";
import TutorHeader from "@/components/navigation/tutor-header";
import { BookingListSkeleton, ProposalSkeleton } from "./skeletons";

export default function TutorPageSkeleton() {
  const path = usePathname();
  return (
    <main className="flex min-h-screen flex-col items-center gap-8 bg-background px-5 py-8 text-foreground sm:px-8">
      <TutorHeader activePage={path.endsWith("/matched") ? "matched" : "swiped"} />
      {path.endsWith("/time-slot") ? <ProposalSkeleton /> : <BookingListSkeleton tutor />}
    </main>
  );
}
