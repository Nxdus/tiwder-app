"use client";

import Link from "next/link";
import { format, isSameMonth, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, BanknoteArrowUp, CircleAlert, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { api, ApiError, type Interest, type Match } from "@/lib/api";
import { findBookingConflict } from "@/lib/tutor/time-slot/bookings";
import { useAuth } from "@/components/auth/auth-provider";
import { studentOf } from "@/components/bookings/booking-list";
import { toast } from "@/components/ui/toast";
import CancelConfirmationDialog from "@/components/bookings/cancel-confirmation-dialog";
import BookingConfirmationDialog from "@/components/bookings/booking-confirmation-dialog";
import {
  formatTime,
  getBangkokDate,
  getScheduleFeedback,
  getScheduleRequestError,
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
  const [requestError, setRequestError] = useState("");
  const [bookings, setBookings] = useState<Match[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingError, setBookingError] = useState("");
  useEffect(() => {
    let active = true;
    async function loadBookings() {
      try {
        const items = await api<Match[]>("/matches");
        if (active) {
          setBookings(items.filter((item) => item.status === "confirmed"));
          setBookingError("");
        }
      } catch {
        if (active) setBookingError("Cannot check bookings. Refresh to retry.");
      } finally {
        if (active) setLoadingBookings(false);
      }
    }
    void loadBookings();
    window.addEventListener("focus", loadBookings);
    return () => {
      active = false;
      window.removeEventListener("focus", loadBookings);
    };
  }, []);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
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
  const submitting = useRef(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const popupAnchor = useRef<HTMLDivElement>(null);
  const { session } = useAuth();
  const router = useRouter();
  const start = toMinutes(startSelection),
    end = toMinutes(endSelection);
  const dateValue = date ? format(date, "yyyy-MM-dd") : null;
  const currentDay = getBangkokDate(now);
  const validationError = getScheduleFeedback(dateValue, startSelection, endSelection, now);
  const conflict = dateValue && start !== null && end !== null && end > start
    ? findBookingConflict(bookings, { date: dateValue, start, end })
    : undefined;
  const ready = !loadingBookings && !bookingError && !validationError && !conflict;
  const dateLabel = date
    ? format(date, "EEEE, d MMM yyyy", { locale: enUS })
    : "";
  const feedback = requestError || bookingError ||
    (conflict ? "You have a class at this time." : validationError);
  async function submitRequest(action: "proposal" | "reject") {
    if (submitting.current) return;
    setRequestError("");
    let body: string | undefined;
    if (action === "proposal") {
      const selectionError = getScheduleFeedback(dateValue, startSelection, endSelection, new Date());
      if (selectionError || !dateValue || start === null || end === null) {
        setRequestError(selectionError ?? "Select a date and both times.");
        return;
      }
      if (loadingBookings || bookingError || findBookingConflict(bookings, { date: dateValue, start, end })) {
        setRequestError(bookingError || (loadingBookings ? "Checking booked times. Please wait." : "You have a class at this time."));
        return;
      }
      body = JSON.stringify({ date: dateValue, start, end });
    }
    submitting.current = true;
    setSaving(true);
    try {
      await api(
        `/interests/${interest.id}/${action}`,
        { method: "POST", body },
        session.csrfToken,
      );
      if (action === "reject") setDeclineOpen(false);
      else setOfferOpen(false);
      toast.add({
        title: action === "reject" ? "Request declined" : "Proposal sent",
        description:
          action === "reject"
            ? "The lesson request has been declined."
            : "Lesson time proposed to student.",
        type: "success",
      });
      router.push("/tutor/swiped");
    } catch (cause) {
      const message = getScheduleRequestError(
        cause instanceof ApiError ? cause.status : undefined,
        cause instanceof Error ? cause.message : undefined,
      );
      setRequestError(message);
      toast.add({
        title:
          action === "reject"
            ? "Unable to decline request"
            : "Unable to send time proposal",
        description: message,
        type: "error",
      });
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-white px-5 py-8 text-foreground sm:px-8">
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
              "h-auto self-start gap-2 px-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground dark:hover:bg-transparent",
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
                  setRequestError("");
                }}
                locale={enUS}
                today={initialDate}
                month={month}
                onMonthChange={setMonth}
                disabled={(day) =>
                  saving ||
                  !isSameMonth(day, month) ||
                  format(day, "yyyy-MM-dd") < currentDay
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
                  disabled={saving || loadingBookings || Boolean(bookingError)}
                  isUnavailable={(value) => {
                    const minute = toMinutes(value);
                    return Boolean(dateValue && minute !== null && bookings.some((booking) =>
                      booking.date === dateValue && minute >= booking.start && minute < booking.end,
                    ));
                  }}
                  onChange={(value) => {
                    setStartSelection(value);
                    setRequestError("");
                  }}
                />
                <TimeSelect
                  label="Time End"
                  value={endSelection}
                  popupAnchor={popupAnchor}
                  feedbackId={feedback ? "schedule-feedback" : undefined}
                  disabled={saving || loadingBookings || Boolean(bookingError)}
                  isUnavailable={(value) => {
                    const minute = toMinutes(value);
                    return Boolean(dateValue && start !== null && minute !== null && minute > start &&
                      findBookingConflict(bookings, { date: dateValue, start, end: minute }));
                  }}
                  onChange={(value) => {
                    setEndSelection(value);
                    setRequestError("");
                  }}
                />
              </div>
              {feedback && (
                <p
                  id="schedule-feedback"
                  role="status"
                  className="flex w-full items-start gap-2 px-1 text-sm font-medium text-red-600"
                >
                  <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {feedback}
                </p>
              )}
              <Button
                variant="destructive"
                className="self-end"
                disabled={saving}
                onClick={() => setDeclineOpen(true)}
              >
                Decline
              </Button>
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
              disabled={saving}
              onClick={() => {
                setRequestError("");
                setOfferOpen(true);
              }}
            >
              {saving ? "Sending…" : "Confirm Time"}
            </Button>
          </div>
        )}
      </main>
      <BookingConfirmationDialog
        confirmation={offerOpen ? "proposal" : null}
        onClose={() => setOfferOpen(false)}
        onConfirm={() => void submitRequest("proposal")}
        busy={saving}
        confirmDisabled={!ready}
        studentName={interest.studentName}
        summary={start !== null && end !== null
          ? `${dateLabel} · ${formatTime(start)} – ${formatTime(end)} · ฿${(((end - start) / 60) * interest.hourlyRate).toLocaleString("en-US")}`
          : undefined}
        error={feedback || undefined}
      />
      <CancelConfirmationDialog
        kind="request"
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        onConfirm={() => void submitRequest("reject")}
        busy={saving}
        targetName={interest.studentName}
      />
    </div>
  );
}
