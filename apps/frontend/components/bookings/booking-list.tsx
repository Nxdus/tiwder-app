"use client";

import Link from "next/link";
import {
  CalendarDays,
  Clock,
  CircleAlert,
  BanknoteArrowUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import StudentCard from "@/components/tutor/student-card";
import TutorSwipeCard from "@/components/discover/tutor-swipe-card";
import TutorPhoto from "@/components/discover/tutor-photo";
import OfferConfirmationDialog from "@/components/discover/offer-confirmation-dialog";
import {
  api,
  ApiError,
  formatMinutes,
  type Interest,
  type Match,
  type Proposal,
} from "@/lib/api";
import type { Tutor } from "@/lib/discover/tutors";
import type { Student } from "@/lib/tutor/students";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";

type Lesson = Interest | Match;
const labels: Record<string, string> = {
  pending: "Awaiting tutor",
  proposed: "Waiting Approve",
  confirmed: "Upcoming",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Declined",
  withdrawn: "Withdrawn",
  closed: "Closed",
  expired: "Expired",
};
export const proposalOf = (item: Lesson): Proposal | null =>
  "proposal" in item ? item.proposal : item;
export function studentOf(item: Lesson): Student {
  const contact = "contact" in item ? item.contact : null;
  return {
    id: item.studentId,
    name: item.studentName,
    photoUrl: item.student?.avatarUrl ?? undefined,
    grade: item.student?.gradeLevel ?? "",
    about: item.student?.bio ?? "",
    phone: contact?.phone,
    email: contact?.email,
    subject: item.subjectName,
    level: item.skillLevel,
  };
}
function tutorOf(item: Lesson): Tutor {
  return {
    id: item.tutorId,
    name: item.tutorName,
    avatarUrl: item.tutor?.avatarUrl ?? null,
    school: item.tutor?.education ?? "",
    rate: item.hourlyRate,
    experience: `${item.tutor?.experienceYears ?? 0} years`,
    about: item.tutor?.bio ?? "",
    subjects: [
      {
        id: item.subjectId,
        name: item.subjectName,
        category: "",
        level: item.skillLevel,
      },
    ],
  };
}
export function LessonBadges({
  proposal,
  rate,
}: {
  proposal: Proposal;
  rate: number;
}) {
  return (
    <>
      <Badge
        variant="secondary"
        className="h-auto gap-1 px-2 py-1 text-xs font-normal"
      >
        <Clock />
        <span>
          {proposal.date} · {formatMinutes(proposal.start)}–
          {formatMinutes(proposal.end)}
        </span>
      </Badge>
      <Badge
        variant="secondary"
        className="h-auto gap-1 px-2 py-1 text-xs font-normal"
      >
        <BanknoteArrowUp />฿{" "}
        {(((proposal.end - proposal.start) / 60) * rate).toLocaleString(
          "en-US",
        )}
      </Badge>
    </>
  );
}
export default function BookingList({
  kind,
  onConfirmed,
  query = "",
  subjectIds,
  onDetailChange,
}: {
  kind: "interests" | "matches";
  onConfirmed?: () => void;
  query?: string;
  subjectIds?: string[];
  onDetailChange?: (open: boolean) => void;
}) {
  const { session, refresh: refreshSession } = useAuth();
  const [items, setItems] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<"accept" | "reject" | null>(
    null,
  );
  const role = session.user?.role;
  const load = useCallback(async () => {
    try {
      setItems(await api<Lesson[]>(`/${kind}`));
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load lessons.",
      );
      if (cause instanceof ApiError && cause.status === 401)
        void refreshSession().catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [kind, refreshSession]);
  useEffect(() => {
    // Synchronize this view with the authenticated booking API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 30000);
    return () => window.clearInterval(timer);
  }, []);
  async function action(id: string, name: string) {
    setBusy(true);
    setError("");
    try {
      await api(
        `/${kind}/${id}/${name}`,
        { method: "POST" },
        session.csrfToken,
      );
      await load();
      setConfirmation(null);
      if (name === "confirm") onConfirmed?.();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update lesson.",
      );
      if (cause instanceof ApiError && cause.status === 401)
        void refreshSession().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  const visible = items.filter(
    (item) =>
      (!subjectIds || subjectIds.includes(item.subjectId)) &&
      (kind === "matches" || ["pending", "proposed"].includes(item.status)) &&
      (!query.trim() ||
        [item.studentName, item.tutorName, item.subjectName].some((value) =>
          value.toLowerCase().includes(query.trim().toLowerCase()),
        )),
  );
  const selected =
    visible.find((item) => item.id === selectedId) ??
    (selectedId === null && kind === "matches" && visible.length === 1
      ? visible[0]
      : null);
  function future(item: Lesson) {
    const p = proposalOf(item);
    return (
      p &&
      now > 0 &&
      new Date(`${p.date}T${formatMinutes(p.start)}:00+07:00`).getTime() > now
    );
  }
  const status = (item: Lesson) =>
    item.status === "confirmed" && !future(item)
      ? "In Progress"
      : (labels[item.status] ?? item.status);
  return (
    <section
      aria-label={kind === "matches" ? "Your lessons" : "Lesson requests"}
      className={
        role === "tutor" ? "mx-auto w-full max-w-[1070px]" : "mx-auto w-full"
      }
    >
      {error && (
        <Alert variant="destructive" className="mx-auto mb-5 max-w-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <p role="status" className="p-8 text-center">
          Loading…
        </p>
      ) : !visible.length ? (
        <Empty className="mx-auto max-w-md">
          <EmptyHeader>
            <EmptyTitle>
              {kind === "matches" ? "No matches yet" : "No requests yet"}
            </EmptyTitle>
            <EmptyDescription>
              {role === "tutor"
                ? "Students will appear here after sending a request."
                : "Find a tutor and choose a subject to get started."}
            </EmptyDescription>
          </EmptyHeader>
          {error && (
            <Button variant="outline" onClick={() => void load()}>
              Try again
            </Button>
          )}
        </Empty>
      ) : role === "tutor" ? (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,330px),330px))] justify-center gap-x-10 gap-y-[50px]">
          {visible.map((item) => {
            const p = proposalOf(item);
            return (
              <li key={item.id}>
                <StudentCard
                  student={studentOf(item)}
                  selectable={kind === "interests" && item.status === "pending"}
                  href={`/tutor/time-slot?request=${item.id}`}
                  status={
                    <Badge
                      variant="secondary"
                      className="gap-1 text-xs"
                    >
                      <CircleAlert />
                      {status(item)}
                    </Badge>
                  }
                  photoDetails={
                    p ? (
                      <LessonBadges proposal={p} rate={item.hourlyRate} />
                    ) : undefined
                  }
                  actions={
                    item.status === "pending" ? (
                      <>
                        <Button
                          nativeButton={false}
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          render={
                            <Link
                              href={`/tutor/time-slot?request=${item.id}`}
                            />
                          }
                        >
                          Propose a time
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void action(item.id, "reject")}
                        >
                          Decline
                        </Button>
                      </>
                    ) : kind === "matches" &&
                      item.status === "confirmed" &&
                      future(item) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void action(item.id, "cancel")}
                      >
                        Cancel lesson
                      </Button>
                    ) : undefined
                  }
                />
              </li>
            );
          })}
        </ul>
      ) : selected ? (
        <>
          <TutorSwipeCard
            key={`detail:${selected.id}`}
            tutor={tutorOf(selected)}
            tab={kind === "matches" ? "Matched" : "Offered"}
            details
            openedTutor
            selectedSubjects={[selected.subjectName]}
            onDetailsChange={() => {}}
            onBack={() => {
              setSelectedId("");
              onDetailChange?.(false);
            }}
            onPass={() => {}}
            onMatch={() => {}}
            onAccept={() => setConfirmation("accept")}
            onReject={() => setConfirmation("reject")}
            appointment={proposalOf(selected)}
            contact={"contact" in selected ? selected.contact : null}
            statusLabel={status(selected)}
            canResolve={
              selected.status === "proposed" && Boolean(future(selected))
            }
            busy={busy}
            showBack={kind === "interests" || visible.length > 1}
          />
          <div className="mx-auto mt-4 flex max-w-[330px] justify-center">
            {kind === "interests" && selected.status === "pending" && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => void action(selected.id, "withdraw")}
              >
                Withdraw request
              </Button>
            )}
            {kind === "matches" &&
              selected.status === "confirmed" &&
              future(selected) && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => void action(selected.id, "cancel")}
                >
                  Cancel lesson
                </Button>
              )}
          </div>
          <OfferConfirmationDialog
            confirmation={confirmation}
            onClose={() => {
              if (!busy) setConfirmation(null);
            }}
            onConfirm={() =>
              void action(
                selected.id,
                confirmation === "accept" ? "confirm" : "reject",
              )
            }
            busy={busy}
            error={error}
          />
        </>
      ) : (
        <ul className="mx-auto mt-8 grid max-w-[520px] grid-cols-[repeat(auto-fit,152px)] justify-center gap-8">
          {visible.map((item) => {
            const p = proposalOf(item);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    onDetailChange?.(true);
                  }}
                  className="relative block aspect-[152/270] w-[152px] overflow-hidden rounded-2xl bg-secondary text-left"
                >
                  <TutorPhoto tutor={tutorOf(item)} />
                  <div className="absolute inset-x-0 bottom-0 bg-background/90 px-3 py-3 text-xs text-foreground">
                    <p className="text-sm font-semibold">{item.tutorName}</p>
                    <p className="mt-2 flex items-center gap-1">
                      <CalendarDays className="size-3" />
                      {p ? p.date : "Schedule not set"}
                    </p>
                    <p className="mt-1 flex items-center gap-1">
                      <Clock className="size-3" />
                      {p
                        ? `${formatMinutes(p.start)}–${formatMinutes(p.end)}`
                        : "Awaiting tutor response"}
                    </p>
                    <p className="mt-1 text-xs">{status(item)}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
