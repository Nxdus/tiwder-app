"use client";

import {
  ArrowLeft,
  BadgeDollarSign,
  Check,
  CircleAlert,
  Clock,
  Gauge,
  GraduationCap,
  Heart,
  Info,
  Mail,
  Phone,
  Timer,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Tutor } from "@/lib/student/tutors";
import { formatMinutes, type Proposal } from "@/lib/api";
import TutorPhoto from "./tutor-photo";
import PhotoIndicators from "@/components/ui/photo-indicators";

export default function TutorSwipeCard({
  tutor,
  tab,
  details,
  openedTutor,
  selectedSubjects,
  onDetailsChange,
  onBack,
  onPass,
  onMatch,
  onAccept,
  onReject,
  appointment,
  contact,
  statusLabel,
  canResolve = true,
  busy = false,
  showBack = true,
}: {
  tutor: Tutor;
  tab: string;
  details: boolean;
  openedTutor: boolean;
  selectedSubjects: string[];
  onDetailsChange: (details: boolean) => void;
  onBack: () => void;
  onPass: () => void;
  onMatch: () => void;
  onAccept: () => void;
  onReject: () => void;
  appointment?: Proposal | null;
  contact?: { email: string; phone: string } | null;
  statusLabel?: string;
  canResolve?: boolean;
  busy?: boolean;
  showBack?: boolean;
}) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResettingCard, setIsResettingCard] = useState(false);
  const [cardVersion, setCardVersion] = useState(0);
  const [photoSelection, setPhotoSelection] = useState({ tutor: "", index: 0 });
  const startX = useRef<number | null>(null);
  const dragXRef = useRef(0);
  const timeoutRef = useRef<number | undefined>(undefined);
  const frameRef = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
      if (frameRef.current !== undefined)
        cancelAnimationFrame(frameRef.current);
    },
    [],
  );
  const passProgress = Math.min(Math.max(-dragX / 90, 0), 1) * 100;
  const matchProgress = Math.min(Math.max(dragX / 90, 0), 1) * 100;
  const photoCount = tutor.photos?.length || 1;
  const photoIndex =
    photoSelection.tutor === tutor.id ? photoSelection.index % photoCount : 0;
  function changePhoto(direction: number) {
    setPhotoSelection({
      tutor: tutor.id,
      index: (photoIndex + direction + photoCount) % photoCount,
    });
  }
  function advance(direction: "left" | "right") {
    if (direction === "right") {
      dragXRef.current = 0;
      setDragX(0);
      onMatch();
      return;
    }
    onDetailsChange(false);
    const exitPosition = direction === "left" ? -900 : 900;
    dragXRef.current = exitPosition;
    setDragX(exitPosition);
    timeoutRef.current = window.setTimeout(() => {
      setIsResettingCard(true);
      onPass();
      setPhotoSelection({ tutor: "", index: 0 });
      setCardVersion((version) => version + 1);
      dragXRef.current = 0;
      setDragX(0);
      frameRef.current = requestAnimationFrame(() => setIsResettingCard(false));
    }, 240);
  }

  function finishDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (startX.current === null) return;
    const distance = dragXRef.current;
    startX.current = null;
    setIsDragging(false);
    if (Math.abs(distance) >= 90) advance(distance < 0 ? "left" : "right");
    else {
      if (event.type === "pointerup" && Math.abs(distance) < 5) {
        const bounds = event.currentTarget.getBoundingClientRect();
        changePhoto(event.clientX < bounds.left + bounds.width / 2 ? -1 : 1);
      }
      dragXRef.current = 0;
      setDragX(0);
    }
  }

  return (
    <section
      className="mx-auto mt-8 w-full max-w-[330px]"
      aria-label="Discover tutors"
    >
      {details && showBack && (
        <Button
          variant="ghost"
          onClick={() => {
            onBack();
          }}
          className="mb-4 h-auto justify-start gap-2 p-0 text-sm font-normal"
        >
          <ArrowLeft className="size-4" />
          Back to {tab === "Discover" ? "discover" : tab === "Matched" ? "matched" : "offered"}
        </Button>
      )}
      <div className="[perspective:1400px]">
        <div
          className={`relative touch-pan-y select-none [transform-style:preserve-3d] ${isDragging ? "cursor-grabbing" : isResettingCard ? "cursor-grab" : details ? "cursor-default transition-transform duration-500" : "cursor-grab transition-transform duration-500"}`}
          style={{
            transform: `translateX(${dragX}px) rotate(${dragX / 24}deg)`,
          }}
          onPointerDown={(event) => {
            if (!details) {
              startX.current = event.clientX;
              setIsDragging(true);
              event.currentTarget.setPointerCapture(event.pointerId);
            }
          }}
          onPointerMove={(event) => {
            if (startX.current !== null) {
              const distance = event.clientX - startX.current;
              dragXRef.current = distance;
              setDragX(distance);
            }
          }}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <div
            id="tutor-card"
            key={cardVersion}
            className="relative grid drop-shadow-[0_8px_16px_rgb(0_0_0/0.14)] [animation:card-enter_520ms_cubic-bezier(.22,1.28,.36,1)_both]"
          >
            <article
              tabIndex={details ? -1 : 0}
              aria-label="Tutor photos. Use left and right arrow keys to change photo."
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                  event.preventDefault();
                  changePhoto(event.key === "ArrowLeft" ? -1 : 1);
                }
              }}
              className={`relative [grid-area:1/1] ${tab === "Matched" ? "min-h-[645px]" : "min-h-[587px]"} overflow-hidden rounded-2xl bg-secondary transition-transform duration-700 [backface-visibility:hidden] ${details ? "[transform:rotateY(180deg)]" : ""}`}
            >
              <TutorPhoto tutor={tutor} photoIndex={photoIndex} />
              <PhotoIndicators activeIndex={photoIndex} count={photoCount} />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pt-32 text-white">
                <h2 className="text-xl font-semibold">
                  {tutor.name}{" "}
                  <span className="ml-3 font-normal">{tutor.age}</span>
                </h2>
                <p className="mt-2 flex items-center gap-2 text-sm">
                  <GraduationCap className="size-5" />
                  {tutor.school}
                </p>
                <p className="mt-2 flex items-center gap-2 text-sm">
                  <BadgeDollarSign className="size-5" />฿ {tutor.rate} / hr
                </p>
                <div
                  className="mt-2 flex flex-wrap gap-2"
                  aria-label="Subjects"
                  onPointerDown={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  {tutor.subjects.map((subject) => (
                    <span
                      key={subject.name}
                      className="max-w-full rounded-full border border-primary/20 bg-[color-mix(in_srgb,var(--primary)_20%,var(--background))] px-2 py-1 text-xs text-primary-foreground [overflow-wrap:anywhere]"
                    >
                      {subject.name}
                    </span>
                  ))}
                </div>
              </div>
            </article>

            <article
              inert={!details}
              tabIndex={details ? 0 : -1}
              aria-label="Tutor details"
              style={{
                transform: details ? "rotateY(0deg)" : "rotateY(180deg)",
              }}
              className={`${details ? "relative" : "absolute inset-0"} [grid-area:1/1] flex flex-col overflow-hidden rounded-2xl bg-card text-card-foreground transition-transform duration-700 [backface-visibility:hidden]`}
            >
              <div
                role="group"
                aria-label="Tutor photos"
                className="relative h-[230px] shrink-0 overflow-hidden"
              >
                <button
                  type="button"
                  aria-label="Previous tutor photo"
                  onClick={() => changePhoto(-1)}
                  className="absolute inset-y-0 left-0 z-10 w-1/2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                />
                <button
                  type="button"
                  aria-label="Next tutor photo"
                  onClick={() => changePhoto(1)}
                  className="absolute inset-y-0 right-0 z-10 w-1/2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                />
                <TutorPhoto tutor={tutor} photoIndex={photoIndex} />
                <PhotoIndicators activeIndex={photoIndex} count={photoCount} />
                {openedTutor && (
                  <div className="absolute inset-x-2 bottom-2 flex justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-2 py-1">
                      <Clock className="size-4" />
                      {appointment
                        ? `${appointment.date} ${formatMinutes(appointment.start)}–${formatMinutes(appointment.end)}`
                        : "Schedule not set"}
                    </span>
                    <span className="rounded-full bg-secondary text-secondary-foreground px-2 py-1">
                      ฿{" "}
                      {appointment
                        ? (
                            ((appointment.end - appointment.start) / 60) *
                            tutor.rate
                          ).toLocaleString("en-US")
                        : tutor.rate}
                    </span>
                  </div>
                )}
              </div>
              <div className="shrink-0 p-4 text-sm leading-relaxed text-muted-foreground">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">
                    {tutor.name}{" "}
                    <span className="ml-2 font-normal">{tutor.age}</span>
                  </h2>
                  {openedTutor && (
                    <span className="flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground px-1.5 text-xs font-semibold">
                      <CircleAlert className="size-3" />
                      {statusLabel ??
                        (tab === "Matched" ? "In Program" : "Pending")}
                    </span>
                  )}
                </div>
                <div className="mt-3 space-y-3">
                  <p className="flex items-center gap-2">
                    <GraduationCap className="size-4" />
                    {tutor.school}
                  </p>
                  <p className="flex items-center gap-2">
                    <BadgeDollarSign className="size-4" />฿ {tutor.rate} / hour
                  </p>
                  <p className="flex items-center gap-2">
                    <Timer className="size-4" />
                    {tutor.experience}
                  </p>
                </div>
                <div className="my-4 border-t border-border" />
                <h3 className="text-base font-semibold text-foreground">
                  About
                </h3>
                <p className="mt-2 leading-relaxed">{tutor.about}</p>
                <div className="my-4 border-t border-border" />
                <h3 className="text-base font-semibold text-foreground">
                  Subject
                </h3>
                {tutor.subjects
                  .filter(
                    (subject) =>
                      !openedTutor || selectedSubjects.includes(subject.name),
                  )
                  .map((subject) => (
                    <div key={subject.name} className="mt-3">
                      <p className="text-xs font-medium">{subject.name}</p>
                      <p className="mt-1 flex items-center gap-1">
                        <Gauge className="size-4" />
                        {subject.level}
                      </p>
                    </div>
                  ))}
                {tab === "Matched" && (
                  <>
                    <div className="my-4 border-t border-border" />
                    <h3 className="text-base font-semibold text-foreground">
                      Contact
                    </h3>
                    <p className="mt-3 flex items-center gap-2">
                      <Phone className="size-4" />
                      {contact?.phone ?? "Available after confirmation"}
                    </p>
                    <p className="mt-3 flex items-center gap-2">
                      <Mail className="size-4" />
                      {contact?.email ?? "Available after confirmation"}
                    </p>
                  </>
                )}
              </div>
            </article>
          </div>
        </div>
      </div>
      {openedTutor ? (
        tab === "Offered" &&
        canResolve && (
          <div className="mt-8 flex justify-between px-3">
            <Button
              variant="default"
              aria-label="Reject offer"
              onClick={() => onReject()}
              disabled={busy}
              className="h-16 w-[120px] rounded-full bg-primary text-primary-foreground hover:bg-primary/80"
            >
              <X className="size-12" />
            </Button>
            <Button
              variant="default"
              aria-label="Accept offer"
              onClick={() => onAccept()}
              disabled={busy}
              className="h-16 w-[120px] rounded-full bg-primary text-primary-foreground hover:bg-primary/80"
            >
              <Check className="size-12" />
            </Button>
          </div>
        )
      ) : (
        <div className="mx-auto mt-4 flex w-[288px] items-center justify-between">
          <Button
            onClick={() => advance("left")}
            variant="secondary"
            size="icon-lg"
            className="size-16 rounded-full"
            style={{
              backgroundColor: `color-mix(in oklab, var(--foreground) ${passProgress}%, var(--secondary))`,
              color: `color-mix(in oklab, var(--background) ${passProgress}%, var(--secondary-foreground))`,
            }}
            aria-label="Pass tutor"
          >
            <X className="size-8" />
          </Button>
          <Button
            onClick={() => onDetailsChange(!details)}
            variant="secondary"
            size="icon-lg"
            className="size-16 rounded-full bg-secondary text-secondary-foreground"
            aria-label={details ? "Show tutor photos" : "Show tutor details"}
            aria-pressed={details}
            aria-controls="tutor-card"
          >
            <Info className="size-7" />
          </Button>
          <Button
            onClick={() => advance("right")}
            variant="secondary"
            size="icon-lg"
            className="size-16 rounded-full"
            style={{
              backgroundColor: `color-mix(in oklab, var(--destructive) ${matchProgress}%, var(--secondary))`,
              color: `color-mix(in oklab, var(--background) ${matchProgress}%, var(--secondary-foreground))`,
            }}
            aria-label="Match with tutor"
          >
            <Heart className="size-8" />
          </Button>
        </div>
      )}
    </section>
  );
}
