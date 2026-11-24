"use client";

import {
  CircleAlert,
  CircleCheck,
  CircleMinus,
  CirclePlay,
  CircleX,
  Clock,
  BanknoteArrowUp,
  CalendarPlus,
  CalendarX2,
  RotateCcw,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ComponentProps } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import StudentCard from "@/components/tutor/student-card";
import TutorSwipeCard from "@/components/student/discover/tutor-swipe-card";
import SubjectSearch from "@/components/student/discover/subject-search";
import { BookingListSkeleton } from "@/components/loading/skeletons";
import BookingConfirmationDialog from "@/components/bookings/booking-confirmation-dialog";
import LessonCancellationDialog, { type CancellationInput } from "@/components/bookings/lesson-cancellation-dialog";
import BookingPreviewCard from "@/components/bookings/booking-preview-card";
import CancelledLessonCard, { isCancelledBooking } from "@/components/bookings/cancelled-lesson-card";
import DeletedAccountCard from "@/components/bookings/deleted-account-card";
import {
  api,
  ApiError,
  formatSchedule,
  type Interest,
  type Match,
  type Proposal,
  type DeletedAccount,
} from "@/lib/api";
import type { SearchOption, Tutor } from "@/lib/student/tutors";
import type { Student } from "@/lib/tutor/students";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
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
  "awaiting-confirmation": "Awaiting Confirmation",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Cancelled",
  withdrawn: "Cancelled",
  closed: "Closed",
  expired: "Expired",
};
const statusOptions = [
  { value: "all", label: "All" },
  ...["confirmed", "in-progress", "awaiting-confirmation", "completed", "cancelled"].map((value) => ({
    value,
    label: labels[value],
  })),
];
const statusVariants: Record<string, ComponentProps<typeof Badge>["variant"]> = {
  pending: "warning",
  proposed: "info",
  confirmed: "info",
  "in-progress": "info",
  "awaiting-confirmation": "warning",
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
    case "awaiting-confirmation":
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
  const [deletedAccounts, setDeletedAccounts] = useState<DeletedAccount[]>([]);
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
  const [lessonToCancel, setLessonToCancel] = useState<Lesson | null>(null);
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [dismissedCompletionIds, setDismissedCompletionIds] = useState<string[]>([]);
  const [requestToWithdraw, setRequestToWithdraw] = useState<Lesson | null>(null);
  const role = session.user?.role;
  const hasData = useRef(false);
  const load = useCallback(async () => {
    if (!hasData.current) {
      setLoading(true);
      setError("");
    }
    try {
      const [lessons, deleted] = await Promise.all([
        api<Lesson[]>(`/${kind}`),
        api<DeletedAccount[]>("/deleted-accounts"),
      ]);
      setItems(lessons);
      setDeletedAccounts(deleted.filter((account) => account.kind === kind));
      hasData.current = true;
      setError("");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Unable to load lessons.";
      setError(message);
      toast.add({
        title: "Unable to load lessons",
        description: message,
        type: "error",
      });
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
    window.addEventListener("deleted-account-dismissed", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("deleted-account-dismissed", onFocus);
    };
  }, [load]);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 30000);
    return () => window.clearInterval(timer);
  }, []);
  async function dismissAccount(accountId: string) {
    if (busy) return;
    setBusy(true);
    try {
      await api(`/deleted-accounts/${accountId}`, { method: "DELETE" }, session.csrfToken);
      setDeletedAccounts((accounts) => accounts.filter((account) => account.accountId !== accountId));
      window.dispatchEvent(new Event("deleted-account-dismissed"));
    } catch (cause) {
      toast.add({ title: "Unable to remove deleted account", description: cause instanceof Error ? cause.message : "Please try again.", type: "error" });
    } finally {
      setBusy(false);
    }
  }
  async function action(id: string, name: string, cancellation?: CancellationInput) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await api(
        `/${kind}/${id}/${name}`,
        { method: "POST", ...(cancellation ? { body: JSON.stringify(cancellation) } : {}) },
        session.csrfToken,
      );
      if (name === "complete") {
        setItems((current) => current.map((item) =>
          item.id === id ? { ...item, status: "completed", contact: null } : item,
        ));
        setCompletionId(null);
      }
      await load();
      setConfirmation(null);
      setLessonToCancel(null);
      setRequestToWithdraw(null);
      if (name === "confirm") onConfirmed?.();
      toast.add({
        title: "Success",
        description:
          name === "confirm"
            ? "Lesson confirmed successfully."
            : name === "cancel"
              ? "Lesson cancelled successfully."
              : name === "reject" || name === "withdraw"
                ? "Request cancelled successfully."
                : name === "complete"
                  ? "Lesson marked as completed."
                  : "Lesson updated successfully.",
        type: "success",
      });
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Unable to update lesson.";
      setError(message);
      toast.add({
        title: "Unable to update lesson",
        description: message,
        type: "error",
      });
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
      toast.add({
        title: "Request sent",
        description: "Your lesson request has been sent.",
        type: "success",
      });
      onRequested?.();
    } catch (cause) {
      const message =
        cause instanceof ApiError && cause.status === 409
          ? "You already have an open request for this tutor and subject."
          : cause instanceof Error
            ? cause.message
            : "Unable to send request.";
      setError(message);
      toast.add({
        title: "Unable to send request",
        description: message,
        type: "error",
      });
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
      new Date(`${p.date}T00:00:00+07:00`).getTime() + p.start * 60_000 > now
    );
  }
  function lessonStatus(item: Lesson) {
    if (item.status !== "confirmed" || future(item)) return item.status;
    const p = proposalOf(item);
    return p && new Date(`${p.date}T00:00:00+07:00`).getTime() + p.end * 60_000 <= now
      ? "awaiting-confirmation"
      : "in-progress";
  }
  const awaitingCompletion = kind === "matches" && role === "student"
    ? items.filter((item) => lessonStatus(item) === "awaiting-confirmation")
    : [];
  const completionLesson = !lessonToCancel
    ? awaitingCompletion.find((item) => item.id === completionId) ??
      awaitingCompletion.find((item) => !dismissedCompletionIds.includes(item.id))
    : undefined;
  const status = (item: Lesson) => labels[lessonStatus(item)] ?? item.status;
  const showStatusFilter = kind === "matches";
  const isFiltered = showStatusFilter && statusFilter !== "all";
  const listedItems = kind === "interests"
    ? items.filter((item) => item.status === "pending" || item.status === "proposed" || isCancelledBooking(item))
    : items;
  if (kind === "interests" && role === "tutor") {
    listedItems.sort((first, second) =>
      (first.status === "pending" ? 0 : first.status === "proposed" ? 1 : 2) -
      (second.status === "pending" ? 0 : second.status === "proposed" ? 1 : 2),
    );
  }
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
    (selectedId === null && role === "student" && kind === "matches" && visible.length === 1 && !isCancelledBooking(visible[0]) && !deletedAccounts.length
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
      className={cn(
        "mx-auto flex min-h-0 w-full flex-1 flex-col",
        role === "tutor"
          ? "max-w-[1070px]"
          : kind === "matches" && "pt-8",
      )}
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
      {showStatusFilter && !loading && items.length > 0 && (
        <div
          role="group"
          aria-label="Filter by lesson status"
          className={cn(
            "mx-auto flex shrink-0 flex-wrap items-center justify-center gap-2 sm:w-fit sm:flex-nowrap sm:gap-1 sm:rounded-full sm:border sm:border-border/70 sm:bg-muted/50 sm:p-1",
            role === "tutor" && "mb-8",
          )}
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
                    ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 hover:text-primary-foreground dark:hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:hover:bg-secondary/80 sm:bg-transparent sm:text-muted-foreground sm:hover:bg-background/80 sm:hover:text-foreground sm:dark:hover:bg-background/80",
                )}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "text-xs tabular-nums",
                      active ? "text-primary-foreground/80" : "text-muted-foreground",
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
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {loading ? (
        <BookingListSkeleton tutor={role === "tutor"} />
      ) : !visible.length && !deletedAccounts.length ? (
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
      ) : selected && isCancelledBooking(selected) ? (
        <div className="mx-auto w-full max-w-[330px] space-y-4">
          <Button variant="ghost" onClick={() => setSelectedId("")}>Back to {kind === "matches" ? "matched" : role === "tutor" ? "swiped" : "offered"}</Button>
          <CancelledLessonCard lesson={selected} tutorView={role === "tutor"} detail />
        </div>
      ) : role === "tutor" ? (
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,330px),330px))] justify-center gap-x-10 gap-y-[50px]">
          {visible.map((item) => {
            const p = proposalOf(item);
            if (isCancelledBooking(item)) {
              return <li key={item.id} className="h-full"><CancelledLessonCard lesson={item} tutorView onOpen={() => setSelectedId(item.id)} /></li>;
            }
            return (
              <li key={item.id} className="h-full">
                <StudentCard
                  student={studentOf(item)}
                  selectable={kind === "interests" && item.status === "pending"}
                  href={`/tutor/time-slot?request=${item.id}`}
                  status={
                    <Badge
                      variant={statusVariants[lessonStatus(item)] ?? "secondary"}
                      className="gap-1 text-xs"
                    >
                      <StatusIcon status={lessonStatus(item)} />
                      {status(item)}
                    </Badge>
                  }
                  photoDetails={
                    p ? (
                      <LessonBadges proposal={p} rate={item.hourlyRate} />
                    ) : undefined
                  }
                  actions={
                    item.status === "cancelled" && "cancellationReason" in item ? (
                      <p className="text-sm break-words whitespace-pre-wrap"><span className="text-muted-foreground">Cancellation reason: </span>{item.cancellationReason || "No reason provided"}</p>
                    ) : kind === "matches" &&
                      item.status === "confirmed" &&
                      future(item) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => { setError(""); setLessonToCancel(item); }}
                      >
                        Cancel lesson
                      </Button>
                    ) : undefined
                  }
                />
              </li>
            );
          })}
          {deletedAccounts.map(({ accountId }) => (
            <li key={accountId} className="h-full">
              <DeletedAccountCard tutorView busy={busy} onDismiss={() => void dismissAccount(accountId)} />
            </li>
          ))}
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
            onReject={() => { setError(""); setLessonToCancel(selected); }}
            appointment={proposalOf(selected)}
            contact={"contact" in selected && lessonStatus(selected) !== "awaiting-confirmation" ? selected.contact : null}
            statusLabel={status(selected)}
            statusVariant={statusVariants[lessonStatus(selected)] ?? "secondary"}
            canResolve={
              selected.status === "proposed" && Boolean(future(selected))
            }
            busy={busy}
            showBack={kind === "interests" || visible.length + deletedAccounts.length > 1}
          />
          <div className="mx-auto mt-4 w-full max-w-[330px]">
            {selected.status === "cancelled" && "cancellationReason" in selected && (
              <p className="mb-4 text-sm break-words whitespace-pre-wrap"><span className="text-muted-foreground">Cancellation reason: </span>{selected.cancellationReason || "No reason provided"}</p>
            )}
            {kind === "interests" && selected.status === "pending" && (
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setError("");
                  setRequestToWithdraw(selected);
                }}
                className="h-11 w-full gap-2 rounded-2xl text-sm font-medium transition-all hover:bg-muted"
              >
                <Undo2 className="size-4" />
                Withdraw request
              </Button>
            )}
            {kind === "matches" &&
              selected.status === "confirmed" &&
              future(selected) && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => { setError(""); setLessonToCancel(selected); }}
                  className="h-11 w-full gap-2 rounded-2xl border-destructive/30 text-sm font-medium text-destructive transition-all hover:bg-destructive/10 hover:text-destructive"
                >
                  <CalendarX2 className="size-4" />
                  Cancel lesson
                </Button>
              )}
            {awaitingCompletion.some((item) => item.id === selected.id) && (
              <Button
                disabled={busy}
                onClick={() => {
                  setError("");
                  setCompletionId(selected.id);
                }}
                className="h-11 w-full rounded-2xl"
              >
                Confirm attendance
              </Button>
            )}
            {kind === "matches" &&
              (selected.status === "cancelled" ||
                selected.status === "completed") && (
                <Button
                  disabled={busy}
                  onClick={() => void requestAgain(selected)}
                  className="h-11 w-full gap-2 rounded-2xl text-sm font-semibold shadow-xs transition-transform active:scale-[0.99]"
                >
                  {selected.status === "completed" ? (
                    <>
                      <CalendarPlus className="size-4" />
                      Book again
                    </>
                  ) : (
                    <>
                      <RotateCcw className="size-4" />
                      Request new time
                    </>
                  )}
                </Button>
              )}
          </div>
          <BookingConfirmationDialog
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
          />
        </>
      ) : (
        <ul className="mx-auto mt-8 grid max-w-[536px] grid-cols-[repeat(auto-fit,152px)] justify-center gap-x-6 gap-y-[50px] sm:gap-x-10">
          {visible.map((item) => {
            const p = proposalOf(item);
            if (isCancelledBooking(item)) {
              return <li key={item.id} className="h-full"><CancelledLessonCard lesson={item} onOpen={() => setSelectedId(item.id)} emphasizeHover={kind === "interests"} /></li>;
            }
            return (
              <li key={item.id} className="h-full">
                <BookingPreviewCard
                  tutor={tutorOf(item)}
                  appointment={p}
                  statusLabel={status(item)}
                  statusVariant={statusVariants[lessonStatus(item)] ?? "secondary"}
                  statusIcon={<StatusIcon status={lessonStatus(item)} />}
                  onOpen={() => setSelectedId(item.id)}
                  emphasizeHover={kind === "interests"}
                />
              </li>
            );
          })}
          {deletedAccounts.map(({ accountId }) => (
            <li key={accountId} className="h-full">
              <DeletedAccountCard tutorView={false} busy={busy} onDismiss={() => void dismissAccount(accountId)} />
            </li>
          ))}
        </ul>
      )}
      </div>
      <BookingConfirmationDialog
        confirmation={completionLesson ? "complete" : null}
        tutorName={completionLesson?.tutorName}
        onClose={() => {
          if (!completionLesson) return;
          setDismissedCompletionIds((ids) => [...ids, completionLesson.id]);
          setCompletionId(null);
          setError("");
        }}
        onConfirm={() => {
          if (completionLesson) void action(completionLesson.id, "complete");
        }}
        busy={busy}
        error={error}
      />
      {requestToWithdraw && <LessonCancellationDialog
        request
        key={requestToWithdraw.id}
        onClose={() => {
          setRequestToWithdraw(null);
          setError("");
        }}
        onConfirm={(input) => action(requestToWithdraw.id, "withdraw", input)}
        schedule={proposalOf(requestToWithdraw) ? formatSchedule(proposalOf(requestToWithdraw)!) : "Schedule not set"}
        busy={busy}
        targetName={requestToWithdraw.tutorName}
        error={error}
      />}
      {lessonToCancel && <LessonCancellationDialog
        request={kind === "interests"}
        key={lessonToCancel.id}
        onClose={() => {
          if (!busy) {
            setLessonToCancel(null);
            setError("");
          }
        }}
        onConfirm={(input) => action(lessonToCancel.id, kind === "matches" ? "cancel" : "reject", input)}
        schedule={proposalOf(lessonToCancel) ? formatSchedule(proposalOf(lessonToCancel)!) : "Schedule not set"}
        error={error}
        busy={busy}
        targetName={
          lessonToCancel
            ? role === "tutor"
              ? lessonToCancel.studentName
              : lessonToCancel.tutorName
            : ""
        }
      />}
    </section>
  );
}
