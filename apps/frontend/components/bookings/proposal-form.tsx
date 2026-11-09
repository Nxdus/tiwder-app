"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, bangkokToday, type Interest } from "@/lib/api";
import TutorTimeSlot from "@/components/tutor/time-slot/tutor-time-slot";
import TutorHeader from "@/components/navigation/tutor-header";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProposalForm() {
  const search = useSearchParams();
  const id = search.get("request");
  const [interest, setInterest] = useState<Interest | null>(null);
  const [today] = useState(bangkokToday);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api<Interest[]>("/interests")
      .then((items) => {
        if (active) {
          setInterest(
            items.find((item) => item.id === id && item.status === "pending") ??
              null,
          );
          setLoading(false);
        }
      })
      .catch((cause) => {
        if (active) {
          setError(cause.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);
  if (interest)
    return (
      <TutorTimeSlot key={interest.id} interest={interest} today={today} />
    );
  return (
    <main className="flex min-h-screen flex-col items-center gap-8 px-5 py-8">
      <TutorHeader />
      {error && (
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <p role="status">Loading request…</p>
      ) : (
        <>
          <p>Select a pending student request to schedule a teaching time.</p>
          <Link href="/tutor/swiped" className="underline">
            Back to swiped
          </Link>
        </>
      )}
    </main>
  );
}
