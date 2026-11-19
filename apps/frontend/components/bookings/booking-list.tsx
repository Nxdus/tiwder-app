"use client";

import {
  CalendarDays,
  CircleAlert,
  CircleCheck,
  CircleMinus,
  CirclePlay,
  CircleX,
  Clock,
  BanknoteArrowUp,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import StudentCard from "@/components/tutor/student-card";
import TutorSwipeCard from "@/components/student/discover/tutor-swipe-card";
import TutorPhoto from "@/components/student/discover/tutor-photo";
import SubjectSearch from "@/components/student/discover/subject-search";
import { BookingListSkeleton } from "@/components/loading/skeletons";
import OfferConfirmationDialog from "@/components/student/discover/offer-confirmation-dialog";
import {
  api,
  ApiError,
  formatMinutes,
  formatSchedule,
  formatScheduleDate,
  type Interest,
  type Match,
  type Proposal,
} from "@/lib/api";
import type { SearchOption, Tutor } from "@/lib/student/tutors";
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
import { cn } from "@/lib/utils";

type Lesson = Interest | Match;
const labels: Record<string, string> = {
  pending: "Awaiting tutor",
  proposed: "Waiting Approve",
  confirmed: "Upcoming",
  "in-progress": "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Declined",
  withdrawn: "Withdrawn",
  closed: "Closed",
  expired: "Expired",
};
const statusOptions = [
  { value: "all", label: "All" },
  ...["confirmed", "in-progress", "completed", "cancelled"].map((value) => ({
    value,
    label: labels[value],
  })),
];
const statusVariants: Record<string, ComponentProps<typeof Badge>["variant"]> = {
  pending: "warning",
  proposed: "warning",
  confirmed: "info",
  completed: "success",
  cancelled: "destructive",
  rejected: "destructive",
  withdrawn: "secondary",
  closed: "secondary",
  expired: "secondary",
} as const;
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Clock aria-hidden="true" className="shrink-0" />;
    case "in-progress":
      return <CirclePlay aria-hidden="true" className="shrink-0" />;
    case "completed":
      return <CircleCheck aria-hidden="true" className="shrink-0" />;
    case "cancelled":
    case "rejected":
      return <CircleX aria-hidden="true" className="shrink-0" />;
    case "withdrawn":
    case "closed":
    case "expired":
      return <CircleMinus aria-hidden="true" className="shrink-0" />;
    default:
      return <CircleAlert aria-hidden="true" className="shrink-0" />;
  }
}
export const proposalOf = (item: Lesson): Proposal | null =>
  "proposal" in item ? item.proposal : item;
export function studentOf(item: Lesson): Student {
  const contact = "contact" in item ? item.contact : null;
  return {
    id: item.studentId,
    name: item.studentName,
    photoUrl: item.student?.avatarUrl ?? undefined,
    photos: item.student?.photos,
    grade: item.student?.gradeLevel ?? "",
    about: item.student?.bio ?? "",
    phone: contact?.phone,
    email: contact?.email,
    subject: item.subjectName,
    level: item.skillLevel,
  };
}
function formatCompactName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return name.trim();
  const last = parts[parts.length - 1];
  const initial =
    last.match(/^[เแโใไ]?(.)/u)?.[1] ?? Array.from(last)[0] ?? "";
  return initial ? `${parts[0]} ${initial.toLocaleUpperCase()}.` : parts[0];
}
function tutorOf(item: Lesson): Tutor {
  return {
    id: item.tutorId,
    name: item.tutorName,
    avatarUrl: item.tutor?.avatarUrl ?? null,
    photos: item.tutor?.photos,
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
        <span>{formatSchedule(proposal)}</span>
      </Badge>
      <Badge
        variant="success"
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
export default function BookingList(props: ComponentProps<typeof BookingListContent>) {
  const { session } = useAuth();
  return <BookingListContent key={`${props.kind}:${session.user?.id}`} {...props} />;
}

function BookingListContent({
  kind,
  onConfirmed,
  onRequested,
  offeredSubjectChoices,
  loadingOfferedSubjects = false,
}: {
  kind: "interests" | "matches";
  onConfirmed?: () => void;
  onRequested?: () => void;
  offeredSubjectChoices?: Tutor["subjects"];
  loadingOfferedSubjects?: boolean;
}) {
  const { session, refresh: refreshSession } = useAuth();
  const [items, setItems] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSearch, setSelectedSearch] = useState<SearchOption[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<"accept" | "reject" | null>(
    null,
  );
  const role = session.user?.role;
  const hasData = useRef(false);
  const load = useCallback(async () => {
    if (!hasData.current) {
      setLoading(true);
      setError("");
    }
    try {
      setItems(await api<Lesson[]>(`/${kind}`));
      hasData.current = true;
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
  async function requestAgain(item: Lesson) {
    setBusy(true);
    setError("");
    try {
      await api(
        "/interests",
        {
          method: "POST",
          body: JSON.stringify({
            tutorId: item.tutorId,
            subjectId: item.subjectId,
          }),
        },
        session.csrfToken,
      );
      onRequested?.();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 409
          ? "You already have an open request for this tutor and subject."
          : cause instanceof Error
            ? cause.message
            : "Unable to send request.",
      );
      if (cause instanceof ApiError && cause.status === 401)
        void refreshSession().catch(() => {});
    } finally {
      setBusy(false);
    }
  }
  function future(item: Lesson) {
    const p = proposalOf(item);
    return (
      p &&
      now > 0 &&
      new Date(`${p.date}T${formatMinutes(p.start)}:00+07:00`).getTime() > now
    );
  }
  const lessonStatus = (item: Lesson) =>
    item.status === "confirmed" && !future(item) ? "in-progress" : item.status;
  const status = (item: Lesson) => labels[lessonStatus(item)] ?? item.status;
  const showStatusFilter = kind === "matches" && role === "tutor";
  const isFiltered = showStatusFilter && statusFilter !== "all";
  const listedItems = kind === "interests"
    ? items.filter((item) => item.status === "pending" || item.status === "proposed")
    : items;
  const offeredSubjectIds = new Set(listedItems.map((item) => item.subjectId));
  const offeredChoices = offeredSubjectChoices?.filter((subject) =>
    offeredSubjectIds.has(subject.id),
  );
  const activeSearch = selectedSearch.filter((option) =>
    option.subject && offeredSubjectIds.has(option.subject.id),
  );
  const query = activeSearch.length ? "" : searchQuery.trim().toLowerCase();
  const visible = listedItems.filter(
    (item) =>
      (!activeSearch.length || activeSearch.some((option) => option.subject?.id === item.subjectId)) &&
      (!isFiltered || lessonStatus(item) === statusFilter) &&
      (!query ||
        [item.studentName, item.tutorName, item.subjectName].some((value) =>
          value.toLowerCase().includes(query),
        )),
  );
  const selected =
    visible.find((item) => item.id === selectedId) ??
    (selectedId === null && kind === "matches" && visible.length === 1
      ? visible[0]
      : null);
  const noMatchesForStatus = isFiltered && items.length > 0;
  const statusCounts = showStatusFilter
    ? listedItems.reduce<Record<string, number>>((counts, item) => {
        const key = lessonStatus(item);
        counts[key] = (counts[key] ?? 0) + 1;
        return counts;
      }, {})
    : {};
  return (
    <section
      aria-label={kind === "matches" ? "Your lessons" : "Lesson requests"}
      className={
        role === "tutor" ? "mx-auto w-full max-w-[1070px]" : "mx-auto w-full"
      }
    >
      {offeredChoices && !selected && (
        <SubjectSearch
          tab="Offered"
          hidden={false}
          loading={loading || loadingOfferedSubjects}
          choices={offeredChoices}
          query={searchQuery}
          selectedSearch={activeSearch}
          onChange={(nextQuery, nextSelection) => {
            setSearchQuery(nextQuery);
            setSelectedSearch(nextSelection);
          }}
        />
      )}
      {error && (
        <Alert variant="destructive" className="mx-auto mb-5 max-w-xl">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {showStatusFilter && !loading && items.length > 0 && (
        <div
          role="group"
          aria-label="Filter by lesson status"
          className="mx-auto mb-8 flex flex-wrap items-center justify-center gap-2 sm:w-fit sm:flex-nowrap sm:gap-1 sm:rounded-full sm:border sm:border-border/70 sm:bg-muted/50 sm:p-1"
        >
          {statusOptions.map(({ value, label }) => {
            const active = statusFilter === value;
            const count =
              value === "all" ? listedItems.length : (statusCounts[value] ?? 0);
            return (
              <Button
                key={value}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={active}
                onClick={() => setStatusFilter(value)}
                className={cn(
                  "h-9 rounded-full px-3.5 text-sm font-medium transition-colors sm:h-8",
                  active
                    ? "bg-foreground text-background shadow-xs hover:bg-foreground/90 hover:text-background"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80 sm:bg-transparent sm:text-muted-foreground sm:hover:bg-background/80 sm:hover:text-foreground",
                )}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      active ? "text-background/75" : "text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </Button>
            );
          })}
        </div>
      )}
      {loading ? (
        <BookingListSkeleton tutor={role === "tutor"} />
      ) : !visible.length ? (
        <Empty className="mx-auto max-w-md">
          <EmptyHeader>
            <EmptyTitle>
              {error ? "Lessons could not be loaded" : noMatchesForStatus
                ? "No lessons with this status"
                : kind === "matches" ? "No matches yet" : "No requests yet"}
            </EmptyTitle>
            <EmptyDescription>
              {error ? "Please try again." : noMatchesForStatus
                ? "Choose another status to see more lessons."
                : role === "tutor"
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
                      variant={statusVariants[item.status] ?? "secondary"}
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
                    kind === "matches" &&
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
            onBack={() => setSelectedId("")}
            onPass={() => {}}
            onMatch={() => {}}
            onAccept={() => setConfirmation("accept")}
            onReject={() => setConfirmation("reject")}
            appointment={proposalOf(selected)}
            contact={"contact" in selected ? selected.contact : null}
            statusLabel={status(selected)}
            statusVariant={statusVariants[selected.status] ?? "secondary"}
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
            {kind === "matches" &&
              (selected.status === "cancelled" ||
                selected.status === "completed") && (
                <Button
                  disabled={busy}
                  onClick={() => void requestAgain(selected)}
                >
                  {selected.status === "completed"
                    ? "Book again"
                    : "Request new time"}
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
        <ul className="mx-auto mt-8 grid max-w-[520px] grid-cols-[repeat(auto-fill,152px)] justify-center gap-8">
          {visible.map((item) => {
            const p = proposalOf(item);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-label={`${item.tutorName}, ${status(item)}${p ? `, ${formatScheduleDate(p.date)}, ${formatMinutes(p.start)}–${formatMinutes(p.end)}` : ", Schedule not set"}`}
                  onClick={() => setSelectedId(item.id)}
                  className="group relative block h-[270px] w-[152px] overflow-hidden rounded-2xl bg-secondary text-left text-foreground ring-1 ring-border transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <TutorPhoto tutor={tutorOf(item)} />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3 group-has-[img[data-loaded=true]]:text-white group-has-[img[data-loaded=true]]:[text-shadow:0_1px_3px_rgb(0_0_0/0.85)]">
                    <p
                      title={item.tutorName}
                      className="truncate text-sm font-semibold leading-5"
                    >
                      {formatCompactName(item.tutorName)}
                    </p>
                    <div className="flex flex-col gap-1 text-xs leading-4 text-foreground/80 group-has-[img[data-loaded=true]]:text-white">
                      <p className="flex items-start gap-1.5">
                        <CalendarDays aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
                        <span>{p ? formatScheduleDate(p.date) : "Schedule not set"}</span>
                      </p>
                      {p && (
                        <p className="flex items-start gap-1.5">
                          <Clock aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
                          <span className="tabular-nums">
                            {formatMinutes(p.start)}–{formatMinutes(p.end)}
                          </span>
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={statusVariants[item.status] ?? "secondary"}
                      className="h-auto max-w-full gap-1 whitespace-normal py-1 text-[11px] leading-4 [text-shadow:none]"
                    >
                      <StatusIcon status={lessonStatus(item)} />
                      <span>{status(item)}</span>
                    </Badge>
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
