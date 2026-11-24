import { RotateCcw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { formatSchedule, type Interest } from "@/lib/api";
import { formatTime } from "@/lib/tutor/time-slot/schedule";

export default function RequestContext({
  request,
  tutorView = false,
  detailed = false,
}: {
  request: Interest;
  tutorView?: boolean;
  detailed?: boolean;
}) {
  if (request.status !== "pending" || !request.previousProposal) return null;
  const anotherLesson = Boolean(request.previousMatchId);
  if (detailed && !anotherLesson) {
    const previous = request.previousProposal;
    return (
      <div className="w-full space-y-2">
        <p className="flex items-center gap-2 text-xs font-medium text-foreground">
          <RotateCcw aria-hidden="true" className="size-3.5 text-muted-foreground" />
          New time request
        </p>
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-xs leading-5">
          <dt className="text-muted-foreground">Previous offer date</dt>
          <dd className="text-right text-foreground">{format(parseISO(previous.date), "d MMM yyyy")}</dd>
          <dt className="text-muted-foreground">Start time</dt>
          <dd className="text-right text-foreground tabular-nums">{formatTime(previous.start)}</dd>
          <dt className="text-muted-foreground">End time</dt>
          <dd className="text-right text-foreground tabular-nums">{formatTime(previous.end)}</dd>
        </dl>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-[14px_minmax(0,1fr)] items-start gap-x-2 gap-y-1">
      <RotateCcw aria-hidden="true" className="mt-0.5 size-3.5 text-muted-foreground" />
      <p className="text-xs font-medium leading-4 text-foreground">
        {tutorView
          ? anotherLesson
            ? "New lesson requested"
            : "New time requested"
          : "Waiting for a new time offer"}
      </p>
      <p className="col-start-2 text-[11px] leading-4 text-muted-foreground">
        {anotherLesson ? "Previous lesson" : "Previous offer"}:{" "}
        {formatSchedule(request.previousProposal)}
      </p>
    </div>
  );
}
