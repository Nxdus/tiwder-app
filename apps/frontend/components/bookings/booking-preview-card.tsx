"use client";

import { CalendarDays, Clock } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import TutorPhoto from "@/components/student/discover/tutor-photo";
import type { Tutor } from "@/lib/student/tutors";
import { formatMinutes, formatScheduleDate, type Proposal } from "@/lib/api";
import { cn, formatCompactName } from "@/lib/utils";

export default function BookingPreviewCard({ tutor, appointment, statusLabel, statusVariant, statusIcon, onOpen, emphasizeHover = false, unscheduledLabel = "Schedule not set" }: {
  tutor: Tutor;
  appointment: Proposal | null;
  statusLabel: string;
  statusVariant: ComponentProps<typeof Badge>["variant"];
  statusIcon: ReactNode;
  onOpen: () => void;
  emphasizeHover?: boolean;
  unscheduledLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={`${tutor.name}, ${statusLabel}${appointment ? `, ${formatScheduleDate(appointment.date)}, ${formatMinutes(appointment.start)}–${formatMinutes(appointment.end)}` : `, ${unscheduledLabel}`}`}
      onClick={onOpen}
      className={cn(
        "group relative block h-[270px] w-[152px] cursor-pointer overflow-hidden rounded-2xl bg-secondary text-left text-foreground ring-1 ring-border transition-[translate,scale,box-shadow] duration-200 ease-out hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none",
        emphasizeHover && "hover:z-30 hover:shadow-[0_20px_45px_rgb(0_0_0/0.2)] focus-visible:z-30 focus-visible:shadow-[0_20px_45px_rgb(0_0_0/0.2)] motion-safe:hover:-translate-y-3 motion-safe:hover:scale-[1.05] motion-safe:focus-visible:-translate-y-3 motion-safe:focus-visible:scale-[1.05]",
      )}
    >
      <TutorPhoto tutor={tutor} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent opacity-0 group-has-[img[data-loaded=true]]:opacity-50" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3 group-has-[img[data-loaded=true]]:text-white group-has-[img[data-loaded=true]]:[text-shadow:0_1px_3px_rgb(0_0_0/0.85)]">
        <p title={tutor.name} className="truncate text-sm font-semibold leading-5">{formatCompactName(tutor.name)}</p>
        <div className="flex flex-col gap-1 text-xs leading-4 text-foreground/80 group-has-[img[data-loaded=true]]:text-white">
          <p className="flex items-start gap-1.5"><CalendarDays aria-hidden="true" className="mt-0.5 size-3 shrink-0" /><span>{appointment ? formatScheduleDate(appointment.date) : unscheduledLabel}</span></p>
          {appointment && <p className="flex items-start gap-1.5"><Clock aria-hidden="true" className="mt-0.5 size-3 shrink-0" /><span className="tabular-nums">{formatMinutes(appointment.start)}–{formatMinutes(appointment.end)}</span></p>}
        </div>
        <Badge variant={statusVariant} className="h-auto max-w-full gap-1 whitespace-normal py-1 text-[11px] leading-4 [text-shadow:none]">{statusIcon}<span>{statusLabel}</span></Badge>
      </div>
    </button>
  );
}
