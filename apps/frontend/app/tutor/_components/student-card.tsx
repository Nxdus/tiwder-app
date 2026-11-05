import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Student } from "../time-slot/students";

export default function StudentCard({ student, selectable = false }: { student: Student; selectable?: boolean }) {
  return (
    <Card
      className={cn(
        "relative isolate w-full gap-0 py-0 shadow-sm ring-border",
        selectable && "transition-[translate,box-shadow] duration-200 ease-out hover:shadow-xl hover:ring-2 hover:ring-primary focus-within:shadow-xl focus-within:ring-2 focus-within:ring-primary active:shadow-md motion-safe:hover:-translate-y-2 motion-safe:focus-within:-translate-y-2 motion-reduce:transition-none",
      )}
    >
      {selectable && (
        <Link
          href={`/tutor/time-slot?student=${student.id}`}
          aria-label={`Schedule teaching time with ${student.name}`}
          className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
        />
      )}
      <div className="relative flex h-[230px] items-center justify-center overflow-hidden border-b border-primary/20 bg-linear-to-br from-primary/30 via-primary/15 to-primary/5 p-4">
        {student.photoUrl ? (
          <Image
            src={student.photoUrl}
            alt={`${student.name}'s profile photo`}
            fill
            sizes="(max-width: 361px) calc(100vw - 32px), 330px"
            className="object-cover object-top"
            loading="eager"
          />
        ) : (
          <div className="flex size-24 items-center justify-center rounded-3xl bg-background/70 shadow-sm ring-1 ring-primary/20">
            <Image
              src="/tutor/image.svg"
              alt="Student photo placeholder"
              width={64}
              height={64}
            />
          </div>
        )}
        {selectable && (
          <Badge
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 bottom-4 h-auto w-auto px-3 py-2 text-center text-xs whitespace-normal opacity-0 shadow-md transition-opacity duration-200 group-hover/card:opacity-100 group-focus-within/card:opacity-100 motion-reduce:transition-none"
          >
            Schedule time with this student
          </Badge>
        )}
      </div>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex flex-col items-start gap-3">
          <div className="flex w-full flex-wrap items-center justify-between gap-2 text-xl leading-6">
            <h2 className="font-semibold">{student.name}</h2>
            <Badge variant="secondary">{student.grade}</Badge>
          </div>
          <a
            href={`tel:${student.phone.replaceAll("-", "")}`}
            className="relative z-20 flex items-center gap-2 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Image src="/tutor/phone.svg" alt="" width={16} height={16} />
            {student.phone}
          </a>
          <a
            href={`mailto:${student.email}`}
            className="relative z-20 flex items-center gap-2 rounded-sm text-xs text-muted-foreground [overflow-wrap:anywhere] transition-colors hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Image src="/tutor/mail.svg" alt="" width={16} height={16} />
            {student.email}
          </a>
        </div>
        <Separator />
        <section aria-label={`About ${student.name}`} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">About</h3>
          <p className="text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{student.about}</p>
        </section>
        <Separator />
        <section aria-label={`Subject chosen by ${student.name}`} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">Subject chose</h3>
          <div className="flex flex-col items-start gap-2">
            <Badge className="border-primary/20 bg-primary/20 px-2.5 py-1 text-primary-foreground">{student.subject}</Badge>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Image src="/tutor/circle-gauge.svg" alt="" width={16} height={16} />
              {student.level}
            </p>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}

