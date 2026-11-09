"use client";

import Link from "next/link";
import { format, isSameMonth, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BanknoteArrowUp, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { api, type Interest } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { studentOf } from "@/components/bookings/booking-list";
import {
  formatTime,
  isValidTimeRange,
  toMinutes,
  type TimeSelection,
} from "@/lib/tutor/time-slot/schedule";
import StudentCard from "@/components/tutor/student-card";
import TutorHeader from "@/components/navigation/tutor-header";
import TimeSelect from "./time-select";

export default function TutorTimeSlot({
  interest,
  today,
}: {
  interest: Interest;
  today: string;
}) {
  const initialDate = parseISO(today);
  const [date, setDate] = useState<Date | undefined>(initialDate);
  const [month, setMonth] = useState(initialDate);
  const [startSelection, setStartSelection] = useState<TimeSelection>({
    time: null,
    period: null,
  });
  const [endSelection, setEndSelection] = useState<TimeSelection>({
    time: null,
    period: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const popupAnchor = useRef<HTMLDivElement>(null);
  const { session } = useAuth();
  const router = useRouter();
  const start = toMinutes(startSelection),
    end = toMinutes(endSelection);
  const validRange = isValidTimeRange(start, end);
  const invalidRange = start !== null && end !== null && !validRange;
  const ready = date !== undefined && validRange;
  const dateLabel = date
    ? format(date, "EEEE, d MMM yyyy", { locale: enUS })
    : "";
  const feedback =
    error ||
    (invalidRange
      ? "Time End must be later than Time Start."
      : !ready
        ? "Please select a date and time."
        : null);
  async function confirmTime() {
    if (!date || start === null || end === null || !validRange) return;
    setSaving(true);
    setError("");
    try {
      await api(
        `/interests/${interest.id}/proposal`,
        {
          method: "POST",
          body: JSON.stringify({
            date: format(date, "yyyy-MM-dd"),
            start,
            end,
          }),
        },
        session.csrfToken,
      );
      router.push("/tutor/swiped");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to send time proposal.",
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-primary/5 px-5 py-8 text-foreground sm:px-8">
      <TutorHeader />
      <main
        aria-label="Schedule teaching time"
        className="flex w-full max-w-[700px] flex-col items-center gap-8"
      >
        <div className="flex w-full flex-col gap-4">
          <Link
            href="/tutor/swiped"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "self-start gap-2 px-0 text-sm font-normal hover:bg-transparent hover:underline",
            )}
          >
            <ArrowLeft aria-hidden="true" />
            Back to swiped
          </Link>
          <div className="flex w-full flex-col items-center gap-8 md:flex-row md:items-start">
            <div className="w-full max-w-[330px]">
              <StudentCard student={studentOf(interest)} />
            </div>
            <section
              aria-labelledby="schedule-heading"
              className="flex w-full max-w-[338px] shrink-0 flex-col items-center gap-4"
            >
              <h2 id="schedule-heading" className="text-base font-semibold">
                Schedule teaching time
              </h2>
              <Calendar
                mode="single"
                selected={date}
                onSelect={(next) => {
                  setDate(next);
                  setError("");
                }}
                locale={enUS}
                today={initialDate}
                month={month}
                onMonthChange={setMonth}
                disabled={(day) =>
                  saving ||
                  !isSameMonth(day, month) ||
                  format(day, "yyyy-MM-dd") < today
                }
                captionLayout="dropdown-months"
                startMonth={initialDate}
                endMonth={new Date(initialDate.getFullYear() + 5, 11, 31)}
                weekStartsOn={0}
                className="min-h-[300px] w-full max-w-[337px] rounded-2xl border bg-card p-6 text-card-foreground [--cell-size:32px] [&_[data-day]]:mx-auto [&_[data-day]]:size-8 [&_[data-day]]:min-w-0"
                classNames={{ today: "bg-transparent" }}
                formatters={{
                  formatWeekdayName: (day) =>
                    day.toLocaleDateString("en-US", { weekday: "short" }),
                  formatMonthDropdown: (day) =>
                    day.toLocaleDateString("en-US", { month: "long" }),
                }}
              />
              <div
                ref={popupAnchor}
                aria-label="Teaching time selection"
                className="mt-4 flex w-full justify-between gap-3 rounded-2xl border bg-card px-6 py-4 text-card-foreground"
              >
                <TimeSelect
                  label="Time Start"
                  value={startSelection}
                  popupAnchor={popupAnchor}
                  feedbackId={feedback ? "schedule-feedback" : undefined}
                  disabled={saving}
                  isUnavailable={() => false}
                  onChange={(value) => {
                    setStartSelection(value);
                    setError("");
                  }}
                />
                <TimeSelect
                  label="Time End"
                  value={endSelection}
                  popupAnchor={popupAnchor}
                  feedbackId={feedback ? "schedule-feedback" : undefined}
                  disabled={saving}
                  isUnavailable={() => false}
                  onChange={(value) => {
                    setEndSelection(value);
                    setError("");
                  }}
                />
              </div>
              {feedback && (
                <p
                  id="schedule-feedback"
                  role={error || invalidRange ? "alert" : "status"}
                  className="text-center text-sm text-muted-foreground"
                >
                  {feedback}
                </p>
              )}
            </section>
          </div>
        </div>
        {ready && start !== null && end !== null && (
          <div
            className="flex min-h-10 w-full flex-wrap items-center justify-center gap-[15px]"
            aria-label="Appointment summary"
          >
            <Badge
              variant="secondary"
              className="h-auto max-w-full gap-2 px-3 py-2 text-sm font-normal whitespace-normal"
            >
              <Clock />
              <span>
                {dateLabel} {formatTime(start)} - {formatTime(end)}
              </span>
            </Badge>
            <Badge
              variant="secondary"
              className="h-auto gap-2 px-3 py-2 text-sm font-normal"
            >
              <BanknoteArrowUp />฿{" "}
              {(((end - start) / 60) * interest.hourlyRate).toLocaleString(
                "en-US",
              )}
            </Badge>
            <Button
              size="lg"
              className="rounded-lg"
              disabled={saving}
              onClick={() => void confirmTime()}
            >
              {saving ? "Sending…" : "Confirm Time"}
            </Button>
            <p className="w-full text-center text-xs text-muted-foreground">
              The student must accept this time before the lesson is confirmed.
              All times are Bangkok.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
