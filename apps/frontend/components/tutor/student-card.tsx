"use client";

import { LoadingImage } from "@/components/ui/loading-image";
import { Gauge, ImageIcon, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PhotoIndicators from "@/components/ui/photo-indicators";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Student } from "@/lib/tutor/students";

export default function StudentCard({
  student,
  selectable = false,
  status,
  photoDetails,
  href,
  actions,
}: {
  student: Student;
  selectable?: boolean;
  status?: ReactNode;
  photoDetails?: ReactNode;
  href?: string;
  actions?: ReactNode;
}) {
  const photos = student.photos?.length
    ? student.photos
    : student.photoUrl
      ? [student.photoUrl]
      : [];
  const [photoSelection, setPhotoSelection] = useState({ student: "", index: 0 });
  const photoCount = photos.length || 1;
  const photoIndex =
    photoSelection.student === student.id ? photoSelection.index % photoCount : 0;
  const photo = photos[photoIndex];

  function changePhoto(direction: number) {
    setPhotoSelection({
      student: student.id,
      index: (photoIndex + direction + photoCount) % photoCount,
    });
  }
  return (
    <Card
      className={cn(
        "relative isolate w-full gap-0 border-0 bg-card py-0 shadow-lg ring-0",
        selectable &&
          "transition-[translate,box-shadow] duration-200 ease-out hover:shadow-xl focus-within:shadow-xl active:shadow-md motion-safe:hover:-translate-y-2 motion-safe:focus-within:-translate-y-2 motion-reduce:transition-none",
      )}
    >
      {selectable && (
        <Link
          href={href ?? `/tutor/time-slot?student=${student.id}`}
          aria-label={`Schedule teaching time with ${student.name}`}
          className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        />
      )}
      <div className="relative flex h-[230px] items-center justify-center overflow-hidden border-b border-primary/20 bg-linear-to-br from-primary/30 via-primary/15 to-primary/5 p-4">
        {photos.length > 0 ? (
          <div
            role="group"
            aria-label={`${student.name}'s photos`}
            className="absolute inset-0 z-20"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                changePhoto(event.key === "ArrowLeft" ? -1 : 1);
              }
            }}
          >
            {selectable && photos.length === 1 && (
              <Link
                href={href ?? `/tutor/time-slot?student=${student.id}`}
                aria-label={`Schedule teaching time with ${student.name}, photo 1`}
                className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
              />
            )}
              <LoadingImage
                key={photo}
                src={photo}
                alt={`${student.name}'s profile photo ${photoIndex + 1}`}
                fill
                unoptimized
                referrerPolicy="no-referrer"
                fallback={<ImageIcon aria-label="Photo unavailable" className="mx-auto mt-20 size-16" />}
                sizes="(max-width: 370px) calc(100vw - 40px), 330px"
                className="object-cover object-top"
              />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous student photo"
                  onClick={() => changePhoto(-1)}
                  className="absolute inset-y-0 left-0 z-10 w-1/2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                />
                <button
                  type="button"
                  aria-label="Next student photo"
                  onClick={() => changePhoto(1)}
                  className="absolute inset-y-0 right-0 z-10 w-1/2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white"
                />
                <PhotoIndicators activeIndex={photoIndex} count={photos.length} />
              </>
            )}
          </div>
        ) : (
          <div className="flex size-24 items-center justify-center rounded-3xl bg-background/70 shadow-sm ring-1 ring-primary/20">
            <ImageIcon aria-hidden="true" className="size-16" />
          </div>
        )}
        {photoDetails && (
          <div className="pointer-events-none absolute inset-x-2 bottom-3 z-30 flex items-center justify-center gap-1.5">
            {photoDetails}
          </div>
        )}
        {selectable && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 bottom-4 text-center text-xs text-white opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 group-focus-within/card:opacity-100 motion-reduce:transition-none"
          >
            Schedule time with this student
          </span>
        )}
      </div>
      <CardContent className="flex flex-col gap-4 p-4">
        <div className="flex flex-col items-start gap-3">
          {status && <div>{status}</div>}
          <div className="flex w-full items-start justify-between gap-2">
            <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 text-xl leading-6">
              <h2 className="font-semibold">{student.name}</h2>
              <Badge variant="secondary">{student.grade}</Badge>
            </div>
          </div>
          {student.phone ? (
            <a
              href={`tel:${student.phone.replaceAll("-", "")}`}
              className="relative z-20 flex items-center gap-2 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Phone aria-hidden="true" className="size-4 shrink-0" />
              {student.phone}
            </a>
          ) : (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="size-4" />
              Available after confirmation
            </p>
          )}
          {student.email ? (
            <a
              href={`mailto:${student.email}`}
              className="relative z-20 flex items-center gap-2 rounded-sm text-xs text-muted-foreground [overflow-wrap:anywhere] transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Mail aria-hidden="true" className="size-4 shrink-0" />
              {student.email}
            </a>
          ) : (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="size-4" />
              Available after confirmation
            </p>
          )}
        </div>
        <Separator />
        <section
          aria-label={`About ${student.name}`}
          className="flex flex-col gap-2"
        >
          <h3 className="text-base font-semibold">About</h3>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
            {student.about}
          </p>
        </section>
        <Separator />
        <section
          aria-label={`Subject chosen by ${student.name}`}
          className="flex flex-col gap-2"
        >
          <h3 className="text-base font-semibold">Subject chose</h3>
          <div className="flex flex-col items-start gap-2">
            <Badge className="border-primary/20 bg-primary/20 px-2.5 py-1 text-xs text-primary-foreground">{student.subject}</Badge>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Gauge aria-hidden="true" className="size-4 shrink-0" />
              {student.level}
            </p>
          </div>
        </section>
        {actions && (
          <div className="relative z-20 flex flex-wrap gap-2">{actions}</div>
        )}
      </CardContent>
    </Card>
  );
}
