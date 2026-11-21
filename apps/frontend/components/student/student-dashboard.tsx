"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DiscoverHeader from "@/components/student/discover-header";
import { AuthGate, useAuth } from "@/components/auth/auth-provider";
import BookingList from "@/components/bookings/booking-list";
import {
  api,
  ApiError,
  type Interest,
  type PublicTutor,
  type Subject,
} from "@/lib/api";
import type { SearchOption, Tutor } from "@/lib/student/tutors";
import { toast } from "@/components/ui/toast";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import SubjectSearch from "./discover/subject-search";
import TutorSwipeCard from "./discover/tutor-swipe-card";
import ChooseSubjectDialog from "./discover/choose-subject-dialog";
import { BookingListSkeleton, TutorCardSkeleton } from "@/components/loading/skeletons";

export default function StudentDashboard({ tab }: { tab: "Discover" | "Offered" | "Matched" }) {
  const router = useRouter();
  const { session, refresh: refreshSession } = useAuth();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [excludedTutorIds, setExcludedTutorIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [index, setIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [selectedSearch, setSelectedSearch] = useState<SearchOption[]>([]);
  const [details, setDetails] = useState(false);
  const [pendingTutor, setPendingTutor] = useState<Tutor | null>(null);
  const hasData = useRef(false);
  const load = useCallback(async () => {
    if (!hasData.current) {
      setLoading(true);
      setError("");
    }
    try {
      const studentRequests =
        session.user?.role === "student"
          ? api<Interest[]>("/interests").catch(() => [])
          : Promise.resolve([]);

      const [people, catalog, interests] = await Promise.all([
        api<PublicTutor[]>("/tutors"),
        api<Subject[]>("/subjects"),
        studentRequests,
      ]);

      const activeIds = new Set<string>();
      for (const item of interests) {
        if (item.status === "pending" || item.status === "proposed") {
          activeIds.add(item.tutorId);
        }
      }
      setExcludedTutorIds(Array.from(activeIds));

      setTutors(
        people.map((tutor) => ({
          id: tutor.id,
          name: tutor.name,
          avatarUrl: tutor.avatarUrl,
          photos: tutor.photos,
          school: tutor.education,
          rate: Number(tutor.hourlyRate),
          experience: `${tutor.experienceYears} years`,
          about: tutor.bio,
          subjects: tutor.teachings.map((teaching) => ({
            id: teaching.subjectId,
            name: teaching.subject.name,
            category: teaching.subject.categories
              .map((category) => category.name)
              .join(", "),
            level: teaching.skillLevel,
          })),
        })),
      );
      setSubjects(catalog);
      hasData.current = true;
      setError("");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Unable to load tutors.";
      setError(message);
      toast.add({
        title: "Unable to load tutors",
        description: message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [session.user]);
  useEffect(() => {
    // Fetching the initial catalog synchronizes with the tutor API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load, session.user?.id, tab]);
  const availableTutors = useMemo(() => {
    const excluded = new Set(excludedTutorIds);
    return tutors.filter((tutor) => !excluded.has(tutor.id));
  }, [tutors, excludedTutorIds]);
  const choices = useMemo(
    () =>
      subjects.flatMap((subject) =>
        subject.categories.map((category) => ({
          id: subject.id,
          name: subject.name,
          category: category.name,
          level: "",
        })),
      ),
    [subjects],
  );
  const discoverChoices = useMemo(() => {
    const taughtSubjectIds = new Set(
      availableTutors.flatMap((tutor) => tutor.subjects.map((subject) => subject.id)),
    );
    return choices.filter((subject) => taughtSubjectIds.has(subject.id));
  }, [choices, availableTutors]);
  const deck = useMemo(
    () =>
      availableTutors.filter((tutor) => {
        if (selectedSearch.length)
          return tutor.subjects.some((subject) =>
            selectedSearch.some((option) =>
              option.subject
                ? subject.id === option.subject.id
                : subject.category.includes(option.category),
            ),
          );
        const term = query.trim().toLowerCase();
        return (
          !term ||
          [
            tutor.name,
            ...tutor.subjects.flatMap((subject) => [
              subject.name,
              subject.category,
            ]),
          ].some((value) => value.toLowerCase().includes(term))
        );
      }),
    [availableTutors, selectedSearch, query],
  );
  const tutor = deck.length ? deck[index % deck.length] : null;
  function requireStudent() {
    if (!session.user) {
      router.push("/login");
      return false;
    }
    if (!session.user.onboarded) {
      router.push("/onboarding");
      return false;
    }
    if (session.user.role !== "student") {
      const message = "Only student accounts can send lesson requests.";
      setError(message);
      toast.add({
        title: "Access restricted",
        description: message,
        type: "error",
      });
      return false;
    }
    return true;
  }
  async function sendInterest(subjectIds: string[]) {
    if (!pendingTutor || subjectIds.length !== 1 || !requireStudent()) return;
    setSaving(true);
    setError("");
    try {
      await api(
        "/interests",
        {
          method: "POST",
          body: JSON.stringify({
            tutorId: pendingTutor.id,
            subjectId: subjectIds[0],
          }),
        },
        session.csrfToken,
      );
      const sentTutorId = pendingTutor.id;
      setExcludedTutorIds((previous) => [...previous, sentTutorId]);
      setTutors((people) => people.filter((tutor) => tutor.id !== sentTutorId));
      setPendingTutor(null);
      toast.add({
        title: "Request sent",
        description: "Your lesson request has been sent to the tutor.",
        type: "success",
      });
      router.push("/student/offered");
      setDetails(false);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Unable to send request.";
      setError(message);
      toast.add({
        title: "Unable to send request",
        description: message,
        type: "error",
      });
      if (cause instanceof ApiError && cause.status === 401)
        void refreshSession().catch(() => {});
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background px-5 py-8 text-foreground sm:px-8">
      <DiscoverHeader
        tab={tab}
        onTabChange={(item) => {
          if (item === "Discover" || requireStudent()) {
            router.push(`/student/${item.toLowerCase()}`);
            setDetails(false);
          }
        }}
      />
      {session.user?.role === "tutor" && (
        <p className="mx-auto mt-5 max-w-3xl text-center text-sm">
          <Link href="/tutor/swiped" className="underline">
            Go to your tutor dashboard →
          </Link>
        </p>
      )}
      {tab === "Discover" ? (
        <>
          <SubjectSearch
            loading={loading}
            choices={discoverChoices}
            tab={tab}
            hidden={details}
            query={query}
            selectedSearch={selectedSearch}
            onChange={(next, selected) => {
              setQuery(next);
              setSelectedSearch(selected);
              setIndex(0);
            }}
          />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <TutorCardSkeleton />
          ) : tutor ? (
            <TutorSwipeCard
              key={tutor.id}
              tutor={tutor}
              tab="Discover"
              details={details}
              openedTutor={false}
              selectedSubjects={[]}
              onDetailsChange={setDetails}
              onBack={() => setDetails(false)}
              onPass={() => {
                setIndex((previous) => previous + 1);
                setDetails(false);
              }}
              onMatch={() => {
                if (requireStudent()) setPendingTutor(tutor);
              }}
              onAccept={() => {}}
              onReject={() => {}}
            />
          ) : (
            <Empty className="mx-auto mt-12 max-w-xl">
              <EmptyHeader>
                <EmptyTitle>
                  {error
                    ? "Tutors could not be loaded"
                    : availableTutors.length
                      ? "No tutors match your search"
                      : tutors.length
                        ? "No more tutors to discover"
                        : "No tutors yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {error
                    ? "Please try again in a moment."
                    : availableTutors.length
                      ? "Try another subject or clear your filters."
                      : tutors.length
                        ? "You've sent requests to all available tutors. Check your Offered or Matched tabs!"
                        : "Tutors will appear here once they complete their profiles."}
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={() => void load()}>
                Refresh
              </Button>
            </Empty>
          )}
          </div>
          {pendingTutor && (
            <ChooseSubjectDialog
              key={`request:${pendingTutor.id}`}
              tutor={pendingTutor}
              open
              onOpenChange={(open) => {
                if (!open && !saving) setPendingTutor(null);
              }}
              onConfirm={(ids) => void sendInterest(ids)}
              busy={saving}
            />
          )}
        </>
      ) : (
        <AuthGate role="student" fallback={<BookingListSkeleton />}>
          <BookingList
            key={tab}
            kind={tab === "Matched" ? "matches" : "interests"}
            onConfirmed={() => router.push("/student/matched")}
            onRequested={() => router.push("/student/offered")}
            offeredSubjectChoices={tab === "Offered" ? choices : undefined}
            loadingOfferedSubjects={loading}
          />
        </AuthGate>
      )}
    </main>
  );
}
