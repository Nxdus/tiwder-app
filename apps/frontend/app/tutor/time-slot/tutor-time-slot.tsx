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
import { findBookingConflict, type TutorBooking } from "./bookings";
import { bookingChannelName, readBookings, reserveBooking } from "./booking-store";
import { demoBookings } from "../matched/demo-matches";
import StudentCard from "../_components/student-card";
import TutorHeader from "../_components/tutor-header";
import type { Student } from "./students";

const periods = [{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }] as const;

function TimeSelect({ label, value, onChange, popupAnchor, feedbackId, disabled, isUnavailable }: {
  label: string;
  value: TimeSelection;
  onChange: (value: TimeSelection) => void;
  popupAnchor: RefObject<HTMLDivElement | null>;
  feedbackId?: string;
  disabled: boolean;
  isUnavailable: (value: TimeSelection) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedTime = timeOptions.find((time) => time.value === value.time)?.label ?? "--:--";

  function selectValue(nextValue: TimeSelection) {
    if (isUnavailable(nextValue)) return;
    onChange(nextValue);
    if (toMinutes(nextValue) !== null) setOpen(false);
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={label.replaceAll(" ", "-")} className="flex h-[26px] items-center justify-center text-sm font-medium">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          disabled={disabled}
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
                    <Button key={time.value} size="sm" variant={value.time === time.value ? "default" : "ghost"} aria-pressed={value.time === time.value} disabled={isUnavailable({ ...value, time: time.value })} onClick={() => selectValue({ ...value, time: time.value })}>
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
                  <Button key={period.value} size="sm" variant={value.period === period.value ? "default" : "ghost"} aria-pressed={value.period === period.value} disabled={isUnavailable({ ...value, period: period.value })} onClick={() => selectValue({ ...value, period: period.value })}>
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
  const [bookings, setBookings] = useState<TutorBooking[]>(demoBookings);
  const [bookingsReady, setBookingsReady] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const bookingChannel = useRef<BroadcastChannel | null>(null);
  const start = toMinutes(startSelection);
  const end = toMinutes(endSelection);
  const validRange = isValidTimeRange(start, end);
  const invalidRange = start !== null && end !== null && !validRange;
  const ready = date !== undefined && validRange;
  const dateLabel = date ? format(date, "EEEE, d MMM yyyy", { locale: enUS }) : "";
  const bookingDate = date ? format(date, "yyyy-MM-dd") : null;
  const candidate = bookingDate && validRange && start !== null && end !== null
    ? { studentId: student.id, date: bookingDate, start, end }
    : null;
  const conflict = candidate ? findBookingConflict(bookings, candidate) : undefined;
  const dayBookings = bookings.filter((booking) => booking.date === bookingDate)
    .sort((first, second) => first.start - second.start);
  const feedback = bookingError ?? (!bookingsReady
    ? "Loading reserved times…"
    : invalidRange
      ? "Time End must be later than Time Start."
      : conflict && !confirmed
        ? `This tutor is already booked from ${formatTime(conflict.start)} to ${formatTime(conflict.end)}. Please choose another time.`
        : !ready ? "Please select a date and time." : null);

  useEffect(() => {
    let active = true;
    async function refreshBookings() {
      try {
        const saved = await readBookings();
        if (active) {
          setBookings([...demoBookings, ...saved]);
          setBookingsReady(true);
          setBookingError(null);
        }
      } catch {
        if (active) {
          setBookingsReady(false);
          setBookingError("Could not load reserved times. Enable browser storage and reload this page before booking.");
        }
      }
    }

    void refreshBookings();
    const channel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(bookingChannelName);
    bookingChannel.current = channel;
    channel?.addEventListener("message", refreshBookings);
    window.addEventListener("focus", refreshBookings);
    return () => {
      active = false;
      channel?.close();
      bookingChannel.current = null;
      window.removeEventListener("focus", refreshBookings);
    };
  }, []);

  function isTimeUnavailable(value: TimeSelection, kind: "start" | "end") {
    const minutes = toMinutes(value);
    if (!bookingDate || minutes === null) return false;
    if (kind === "start") {
      if (dayBookings.some((booking) => booking.start <= minutes && minutes < booking.end)) return true;
      return end !== null && end > minutes && Boolean(findBookingConflict(bookings, {
        date: bookingDate, start: minutes, end,
      }));
    }
    return start !== null && minutes > start && Boolean(findBookingConflict(bookings, {
      date: bookingDate, start, end: minutes,
    }));
  }

  async function confirmTime() {
    if (!candidate || !bookingsReady || saving || confirmed || conflict) return;
    setSaving(true);
    setBookingError(null);
    try {
      const result = await reserveBooking(candidate, demoBookings);
      setBookings((current) => current.some((booking) =>
        booking.studentId === result.booking.studentId && booking.date === result.booking.date &&
        booking.start === result.booking.start && booking.end === result.booking.end,
      ) ? current : [...current, result.booking]);
      if (result.status === "conflict") {
        setBookingError("This time was just reserved. Please choose another time.");
      } else {
        setConfirmed(true);
        bookingChannel.current?.postMessage("booking-added");
      }
    } catch {
      setBookingError("Could not save this time. Please try again; no confirmation has been shown.");
    } finally {
      setSaving(false);
    }
  }

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
                onSelect={(nextDate) => { setDate(nextDate); setConfirmed(false); setBookingError(null); }}
                locale={enUS}
                today={initialDate}
                month={month}
                onMonthChange={setMonth}
                disabled={(day) => saving || !isSameMonth(day, month)}
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
                <TimeSelect label="Time Start" value={startSelection} popupAnchor={popupAnchor} feedbackId={feedback ? "schedule-feedback" : undefined} disabled={!bookingsReady || saving} isUnavailable={(value) => isTimeUnavailable(value, "start")} onChange={(value) => { setStartSelection(value); setConfirmed(false); setBookingError(null); }} />
                <TimeSelect label="Time End" value={endSelection} popupAnchor={popupAnchor} feedbackId={feedback ? "schedule-feedback" : undefined} disabled={!bookingsReady || saving} isUnavailable={(value) => isTimeUnavailable(value, "end")} onChange={(value) => { setEndSelection(value); setConfirmed(false); setBookingError(null); }} />
              </div>
              <p id="schedule-feedback" hidden={!feedback} role={bookingError || invalidRange || (conflict && !confirmed) ? "alert" : "status"} className="w-full rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-center text-sm font-medium text-destructive">
                {feedback}
              </p>
              {dayBookings.length > 0 && (
                <div className="w-full space-y-2" aria-label="Reserved times on selected date" aria-live="polite">
                  <p className="text-sm font-medium">Already reserved on this date</p>
                  <ul className="flex flex-wrap gap-2">
                    {dayBookings.map((booking) => (
                      <li key={`${booking.studentId}-${booking.start}-${booking.end}`}>
                        <Badge variant="secondary">{formatTime(booking.start)} – {formatTime(booking.end)}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </div>

        {ready && start !== null && end !== null && (
          <div ref={summaryRef} className="flex min-h-10 w-full scroll-my-6 flex-wrap items-center justify-center gap-[15px]" aria-label="Appointment summary">
              {/* Figma SVGs have extra space below their paths; align the visible icons with the text. */}
              <Badge variant="secondary" className="h-auto max-w-full gap-2 px-3 py-2 text-sm font-normal whitespace-normal">
                <Image src="/tutor/time-slot/clock.svg" alt="" width={23.7632} height={23.7632} className="shrink-0 translate-y-1" />
                <span>{dateLabel} {formatTime(start)} - {formatTime(end)}</span>
              </Badge>
              <Badge variant="secondary" className="h-auto gap-2 px-3 py-2 text-sm font-normal">
                <Image src="/tutor/time-slot/banknote-arrow-up.svg" alt="" width={23.7632} height={23.7632} className="shrink-0 translate-y-[2.5px]" />
                ฿ {((end - start) / 60 * 250).toLocaleString("en-US")}
              </Badge>
              <Button size="lg" disabled={!bookingsReady || saving || confirmed || Boolean(conflict)} onClick={confirmTime}>{saving ? "Saving…" : confirmed ? "Time Reserved" : "Confirm Time"}</Button>
          </div>
        )}
        {confirmed && <p role="status" className="text-center text-sm text-muted-foreground">Time reserved. Other students cannot book an overlapping time in this browser. This demo has not sent a booking or received student confirmation.</p>}
      </main>
    </div>
  );
}
