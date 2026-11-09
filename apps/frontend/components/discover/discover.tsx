"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DiscoverHeader from "@/components/navigation/discover-header";
import { AuthGate, useAuth } from "@/components/auth/auth-provider";
import BookingList from "@/components/bookings/booking-list";
import { api, ApiError, type PublicTutor, type Subject } from "@/lib/api";
import type { SearchOption, Tutor } from "@/lib/discover/tutors";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import SubjectSearch from "./subject-search";
import TutorSwipeCard from "./tutor-swipe-card";
import ChooseSubjectDialog from "./choose-subject-dialog";

export default function Discover() {
  const router = useRouter();
  const { session, refresh: refreshSession } = useAuth();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [index, setIndex] = useState(0);
  const [tab, setTab] = useState("Discover");
  const [query, setQuery] = useState("");
  const [selectedSearch, setSelectedSearch] = useState<SearchOption[]>([]);
  const [details, setDetails] = useState(false);
  const [bookingDetail, setBookingDetail] = useState(false);
  const [pendingTutor, setPendingTutor] = useState<Tutor | null>(null);
  const load = useCallback(async () => {
    try {
      const [people, catalog] = await Promise.all([
        api<PublicTutor[]>("/tutors"),
        api<Subject[]>("/subjects"),
      ]);
      setTutors(
        people.map((tutor) => ({
          id: tutor.id,
          name: tutor.name,
          avatarUrl: tutor.avatarUrl,
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
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load tutors.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    // Fetching the initial catalog synchronizes with the tutor API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);
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
  const deck = useMemo(
    () =>
      tutors.filter((tutor) => {
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
    [tutors, selectedSearch, query],
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
      setError("Only student accounts can send lesson requests.");
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
      setPendingTutor(null);
      setTab("Offered");
      setDetails(false);
      setBookingDetail(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to send request.",
      );
      if (cause instanceof ApiError && cause.status === 401)
        void refreshSession().catch(() => {});
    } finally {
      setSaving(false);
    }
  }
  return (
    <main className="min-h-screen overflow-x-clip bg-background px-5 py-8 text-foreground sm:px-8">
      <DiscoverHeader
        tab={tab}
        onTabChange={(item) => {
          if (item === "Discover" || requireStudent()) {
            setTab(item);
            setDetails(false);
            setBookingDetail(false);
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
      {error && (
        <Alert variant="destructive" className="mx-auto mt-6 max-w-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {tab === "Discover" ? (
        <>
          <SubjectSearch
            choices={choices}
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
          {loading ? (
            <p role="status" className="p-12 text-center">
              Loading tutors…
            </p>
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
                    : tutors.length
                      ? "No tutors match your search"
                      : "No tutors yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {error
                    ? "Please try again in a moment."
                    : tutors.length
                      ? "Try another subject or clear your filters."
                      : "Tutors will appear here once they complete their profiles."}
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={() => void load()}>
                Refresh
              </Button>
            </Empty>
          )}
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
              error={error}
            />
          )}
        </>
      ) : (
        <AuthGate role="student">
          {tab !== "Matched" && !bookingDetail && (
            <SubjectSearch
              choices={choices}
              tab={tab}
              hidden={false}
              query={query}
              selectedSearch={selectedSearch}
              onChange={(next, selected) => {
                setQuery(next);
                setSelectedSearch(selected);
              }}
            />
          )}
          <BookingList
            key={tab}
            kind={tab === "Matched" ? "matches" : "interests"}
            onConfirmed={() => setTab("Matched")}
            query={selectedSearch.length ? "" : query}
            subjectIds={
              selectedSearch.length
                ? selectedSearch.flatMap((option) =>
                    option.subject
                      ? [option.subject.id]
                      : choices
                          .filter(
                            (subject) => subject.category === option.category,
                          )
                          .map((subject) => subject.id),
                  )
                : undefined
            }
            onDetailChange={setBookingDetail}
          />
        </AuthGate>
      )}
    </main>
  );
}
