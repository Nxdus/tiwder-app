import { Badge } from "@/components/ui/badge";
import StudentCard from "@/components/tutor/student-card";
import TutorPhoto from "@/components/student/discover/tutor-photo";
import { formatSchedule, type Interest, type Match } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CircleX, Clock, Gauge } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import CancellationReason from "./cancellation-reason";
import BookingPreviewCard from "./booking-preview-card";
import { formatCancellationTimestamp, unscheduledCancellationLabel } from "@/lib/cancellation-display";

export function isCancelledBooking(item: { status: string }) {
  return ["cancelled", "rejected", "withdrawn"].includes(item.status);
}

export default function CancelledLessonCard({ lesson, tutorView = false, detail = false, onOpen, emphasizeHover = false }: {
  lesson: Interest | Match;
  tutorView?: boolean;
  detail?: boolean;
  onOpen?: () => void;
  emphasizeHover?: boolean;
}) {
  const proposal = "proposal" in lesson ? lesson.proposal : lesson;
  const unscheduledLabel = unscheduledCancellationLabel(lesson.status);
  const schedule = proposal ? formatSchedule(proposal) : unscheduledLabel;
  const cancelledAt = formatCancellationTimestamp(lesson.updatedAt);
  const cancellationDetails = cancelledAt ? (
    <dl className="space-y-1 text-sm">
      <dt className="text-xs font-medium text-muted-foreground">{lesson.status === "withdrawn" ? "Withdrawn on" : "Cancelled on"}</dt>
      <dd><time dateTime={lesson.updatedAt}>{cancelledAt} (Bangkok)</time></dd>
    </dl>
  ) : null;
  if (tutorView) {
    return <StudentCard
      student={{ id: lesson.studentId, name: lesson.studentName, photoUrl: lesson.student?.avatarUrl ?? undefined, photos: lesson.student?.photos, grade: lesson.student?.gradeLevel ?? "", about: "", subject: lesson.subjectName, level: lesson.skillLevel }}
      cancelledReason={lesson.cancellationReason}
      cancellationDetails={cancellationDetails}
      onOpen={onOpen}
      status={<Badge variant="destructive">Cancelled</Badge>}
      photoDetails={<Badge variant="secondary" className="h-auto whitespace-normal text-xs font-normal">{schedule}</Badge>}
    />;
  }
  const tutor = {
    id: lesson.tutorId, name: lesson.tutorName, avatarUrl: lesson.tutor?.avatarUrl ?? null,
    photos: lesson.tutor?.photos, school: "", rate: 0, experience: "", about: "", subjects: [],
  };
  if (!detail && onOpen) {
    return <BookingPreviewCard tutor={tutor} appointment={proposal} statusLabel="Cancelled" statusVariant="destructive" statusIcon={<CircleX aria-hidden="true" />} onOpen={onOpen} emphasizeHover={emphasizeHover} unscheduledLabel={unscheduledLabel} />;
  }
  const content = <>
    <div className={cn("relative shrink-0 overflow-hidden", detail ? "h-[200px]" : "h-full")}>
      <TutorPhoto tutor={tutor} />
      {detail && <Badge variant="secondary" className="absolute inset-x-2 bottom-2 h-auto w-fit max-w-[calc(100%_-_16px)] gap-1 whitespace-normal px-2 py-1 text-xs font-normal"><Clock aria-hidden="true" /><span>{schedule}</span></Badge>}
    </div>
    <div className={cn(detail ? "flex flex-col gap-4 p-4" : "absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/90 via-black/65 to-transparent px-3 pb-3 pt-16 text-white")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className={cn("font-semibold", detail ? "text-xl" : "truncate text-sm")}>{lesson.tutorName}</h2>
        <Badge variant="destructive" className="w-fit text-xs">Cancelled</Badge>
      </div>
      {!detail && <p className="text-xs">{schedule}</p>}
      {detail && cancellationDetails}
      <CancellationReason reason={lesson.cancellationReason} />
      {detail && <div className="mt-1 flex flex-col gap-4">
        <Separator />
        <section aria-label="Lesson subject" className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">Subject</h3>
          <p className="text-sm text-muted-foreground">{lesson.subjectName}</p>
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><Gauge aria-hidden="true" className="size-4 shrink-0" />{lesson.skillLevel}</p>
        </section>
      </div>}
    </div>
  </>;
  const className = cn("relative block overflow-hidden rounded-2xl bg-card text-left text-card-foreground shadow-lg", detail ? "flex w-full flex-col" : "h-[270px] w-[152px]", detail && ("proposal" in lesson ? "min-h-[587px]" : "min-h-[645px]"));
  return onOpen
    ? <button type="button" className={cn(className, "cursor-pointer transition-shadow hover:shadow-xl focus-visible:outline-2 focus-visible:outline-primary")} onClick={onOpen} aria-label={`View cancelled lesson with ${lesson.tutorName}`}>{content}</button>
    : <article className={className}>{content}</article>;
}
