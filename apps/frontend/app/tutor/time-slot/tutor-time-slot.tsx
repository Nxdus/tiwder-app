"use client";

import Image from "next/image";
import Link from "next/link";
import { format, isSameMonth, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatTime, isValidTimeRange, timeOptions, toMinutes, type TimeSelection } from "./schedule";
import StudentCard from "../_components/student-card";
import TutorHeader from "../_components/tutor-header";
import type { Student } from "./students";

const periods = [{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }] as const;

function TimeSelect({ label, value, onChange, popupAnchor, feedbackId }: {
  label: string;
  value: TimeSelection;
  onChange: (value: TimeSelection) => void;
  popupAnchor: RefObject<HTMLDivElement | null>;
  feedbackId?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedTime = timeOptions.find((time) => time.value === value.time)?.label ?? "--:--";

  function selectValue(nextValue: TimeSelection) {
    onChange(nextValue);
    if (toMinutes(nextValue) !== null) setOpen(false);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={label.replaceAll(" ", "-")} className="flex h-[26px] items-center justify-center text-sm font-medium">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={label.replaceAll(" ", "-")}
          aria-label={`Choose ${label.toLowerCase()}`}
          aria-describedby={feedbackId}
          render={<Button variant="outline" className="mx-auto w-full max-w-32 justify-between px-3" />}
        >
          <span>{selectedTime} {value.period ?? "--"}</span>
          <ChevronDown className="size-3 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent anchor={popupAnchor} align="center" sideOffset={({ anchor, positioner }) => -(anchor.height + positioner.height) / 2} className="w-48 gap-2 p-3">
          <PopoverTitle className="text-center text-sm">{label}</PopoverTitle>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div dir="rtl" className="max-h-44 min-w-0 overflow-y-auto [scrollbar-gutter:stable]">
              <div dir="ltr">
                <p className="sticky top-0 z-10 mb-1 bg-popover text-center text-xs text-muted-foreground">Time</p>
                <div role="group" aria-label={`${label} time`} className="flex flex-col gap-1 p-1">
                  {timeOptions.map((time) => (
                    <Button key={time.value} size="sm" variant={value.time === time.value ? "default" : "ghost"} aria-pressed={value.time === time.value} onClick={() => selectValue({ ...value, time: time.value })}>
                      {time.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="mb-1 text-center text-xs text-muted-foreground">AM / PM</p>
              <div role="group" aria-label={`${label} AM or PM`} className="flex flex-col gap-1 p-1">
                {periods.map((period) => (
                  <Button key={period.value} size="sm" variant={value.period === period.value ? "default" : "ghost"} aria-pressed={value.period === period.value} onClick={() => selectValue({ ...value, period: period.value })}>
                    {period.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function TutorTimeSlot({ student, today }: { student: Student; today: string }) {
  const initialDate = parseISO(today);
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [month, setMonth] = useState(initialDate);
  const [startSelection, setStartSelection] = useState<TimeSelection>({ time: null, period: null });
  const [endSelection, setEndSelection] = useState<TimeSelection>({ time: null, period: null });
  const popupAnchor = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [confirmed, setConfirmed] = useState(false);
  const start = toMinutes(startSelection);
  const end = toMinutes(endSelection);
  const validRange = isValidTimeRange(start, end);
  const invalidRange = start !== null && end !== null && !validRange;
  const ready = date !== undefined && validRange;
  const dateLabel = date ? format(date, "EEEE, d MMM yyyy", { locale: enUS }) : "";

  useEffect(() => {
    if (ready) {
      summaryRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "nearest",
      });
    }
  }, [ready]);

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-primary/5 p-4 text-foreground sm:p-8">
      <TutorHeader />

      <main aria-label="Schedule teaching time" className="flex w-full max-w-[700px] flex-col items-center gap-8">
        <div className="flex w-full flex-col gap-4">
          <Link
            href="/tutor/swiped"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "self-start gap-2 px-0 text-base font-normal hover:bg-transparent hover:underline")}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to swiped
          </Link>
          <div className="flex w-full flex-col items-center gap-8 md:flex-row md:items-start">
            <div className="w-full max-w-[330px]">
              <StudentCard student={student} />
            </div>
            <section aria-labelledby="schedule-heading" className="flex w-full max-w-[338px] shrink-0 flex-col items-center gap-4">
              <h2 id="schedule-heading" className="text-sm leading-[normal] font-medium">Schedule teaching time</h2>
              <Calendar
                mode="single"
                selected={date}
                onSelect={(nextDate) => { setDate(nextDate); setConfirmed(false); }}
                locale={enUS}
                today={initialDate}
                month={month}
                onMonthChange={setMonth}
                disabled={(day) => !isSameMonth(day, month)}
                captionLayout="dropdown-months"
                startMonth={new Date(initialDate.getFullYear() - 5, 0, 1)}
                endMonth={new Date(initialDate.getFullYear() + 5, 11, 31)}
                weekStartsOn={0}
                className="min-h-[300px] w-full max-w-[337px] rounded-2xl border bg-card p-6 text-card-foreground shadow-sm [--cell-size:32px] [&_[data-day]]:mx-auto [&_[data-day]]:size-8 [&_[data-day]]:min-w-0"
                classNames={{ today: "bg-transparent" }}
                formatters={{
                  formatWeekdayName: (day) => day.toLocaleDateString("en-US", { weekday: "short" }),
                  formatMonthDropdown: (day) => day.toLocaleDateString("en-US", { month: "long" }),
                }}
              />
              <div ref={popupAnchor} aria-label="Teaching time selection" className="flex w-full justify-between gap-3 rounded-2xl border bg-card p-3 text-card-foreground shadow-sm">
                <TimeSelect label="Time Start" value={startSelection} popupAnchor={popupAnchor} feedbackId={!ready ? "schedule-feedback" : undefined} onChange={(value) => { setStartSelection(value); setConfirmed(false); }} />
                <TimeSelect label="Time End" value={endSelection} popupAnchor={popupAnchor} feedbackId={!ready ? "schedule-feedback" : undefined} onChange={(value) => { setEndSelection(value); setConfirmed(false); }} />
              </div>
              <p id="schedule-feedback" hidden={ready} role={invalidRange ? "alert" : "status"} className="w-full rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-center text-sm font-medium text-destructive">
                {invalidRange ? "Time End must be later than Time Start." : "Please select a date and time."}
              </p>
            </section>
          </div>
        </div>

        {ready && start !== null && end !== null && (
          <div ref={summaryRef} className="flex min-h-10 w-full scroll-my-6 flex-wrap items-center justify-center gap-[15px]" aria-label="Appointment summary">
              <Badge variant="secondary" className="h-auto max-w-full gap-2 px-3 py-2 text-sm font-normal whitespace-normal">
                <Image src="/tutor/time-slot/clock.svg" alt="" width={23.7632} height={23.7632} className="shrink-0" />
                <span>{dateLabel} {formatTime(start)} - {formatTime(end)}</span>
              </Badge>
              <Badge variant="secondary" className="h-auto gap-2 px-3 py-2 text-sm font-normal">
                <Image src="/tutor/time-slot/banknote-arrow-up.svg" alt="" width={23.7632} height={23.7632} />
                ฿ {((end - start) / 60 * 250).toLocaleString("en-US")}
              </Badge>
              <Button size="lg" onClick={() => setConfirmed(true)}>Confirm Time</Button>
          </div>
        )}
        {confirmed && <p role="status" className="text-center text-sm text-muted-foreground">Demo only: the selected time is confirmed in this preview. No booking has been saved or sent.</p>}
      </main>
    </div>
  );
}
