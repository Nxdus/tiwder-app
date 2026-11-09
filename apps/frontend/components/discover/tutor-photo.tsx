"use client";

import { useState } from "react";
import Image from "next/image";
import type { Tutor } from "@/lib/discover/tutors";

export default function TutorPhoto({
  tutor,
}: {
  tutor: Tutor;
  photoIndex?: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center bg-secondary text-secondary-foreground">
      {tutor.avatarUrl && !failed ? (
        <Image
          src={tutor.avatarUrl}
          fill
          unoptimized
          alt={`Portrait of ${tutor.name}`}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <span
          role="img"
          aria-label={tutor.name}
          className="text-7xl font-semibold"
        >
          {tutor.name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")}
        </span>
      )}
    </div>
  );
}
