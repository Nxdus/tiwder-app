"use client";

import { LoadingImage } from "@/components/ui/loading-image";
import type { Tutor } from "@/lib/student/tutors";

export default function TutorPhoto({
  tutor,
  photoIndex = 0,
}: {
  tutor: Tutor;
  photoIndex?: number;
}) {
  const src = tutor.photos?.[photoIndex] ?? tutor.photos?.[0] ?? tutor.avatarUrl;
  const fallback = (
    <span role="img" aria-label={tutor.name} className="text-7xl font-semibold">
      {tutor.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("")}
    </span>
  );
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center bg-secondary text-secondary-foreground">
      {src ? (
        <LoadingImage
          src={src}
          fill
          unoptimized
          alt={`Portrait of ${tutor.name}`}
          referrerPolicy="no-referrer"
          fallback={fallback}
          className="size-full object-cover"
        />
      ) : (
        fallback
      )}
    </div>
  );
}
