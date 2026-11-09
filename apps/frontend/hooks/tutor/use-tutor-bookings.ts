"use client";

import { useEffect, useRef, useState } from "react";
import {
  findBookingConflict,
  type TutorBooking,
} from "@/lib/tutor/time-slot/bookings";
import {
  bookingChannelName,
  readBookings,
  reserveBooking,
} from "@/lib/tutor/time-slot/booking-store";
import { demoBookings } from "@/lib/tutor/matched/demo-matches";

export function useTutorBookings() {
  const [confirmed, setConfirmed] = useState(false);
  const [bookings, setBookings] = useState<TutorBooking[]>(demoBookings);
  const [bookingsReady, setBookingsReady] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const bookingChannel = useRef<BroadcastChannel | null>(null);
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
          setBookingError(
            "Could not load reserved times. Enable browser storage and reload this page before booking.",
          );
        }
      }
    }

    void refreshBookings();
    const channel =
      typeof BroadcastChannel === "undefined"
        ? null
        : new BroadcastChannel(bookingChannelName);
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

  async function reserveTime(candidate: TutorBooking | null) {
    const conflict = candidate
      ? findBookingConflict(bookings, candidate)
      : undefined;
    if (!candidate || !bookingsReady || saving || confirmed || conflict) return;
    setSaving(true);
    setBookingError(null);
    try {
      const result = await reserveBooking(candidate, demoBookings);
      setBookings((current) =>
        current.some(
          (booking) =>
            booking.studentId === result.booking.studentId &&
            booking.date === result.booking.date &&
            booking.start === result.booking.start &&
            booking.end === result.booking.end,
        )
          ? current
          : [...current, result.booking],
      );
      if (result.status === "conflict") {
        setBookingError(
          "This time was just reserved. Please choose another time.",
        );
      } else {
        setConfirmed(true);
        bookingChannel.current?.postMessage("booking-added");
        return true;
      }
    } catch {
      setBookingError(
        "Could not save this time. Please try again; no confirmation has been shown.",
      );
    } finally {
      setSaving(false);
    }
  }

  function resetBooking() {
    setConfirmed(false);
    setBookingError(null);
  }

  return {
    bookings,
    bookingsReady,
    bookingError,
    saving,
    confirmed,
    reserveTime,
    resetBooking,
  };
}
