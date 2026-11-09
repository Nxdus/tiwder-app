import Link from "next/link";
import { BanknoteArrowUp, CircleAlert, CircleCheck, CirclePlay, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import StudentCard from "@/components/tutor/student-card";
import TutorHeader from "@/components/navigation/tutor-header";
import { getConfirmedMatches, type TutorMatch } from "@/lib/tutor/matched/matches";

const statuses = {
  upcoming: { label: "Upcoming", variant: "secondary" },
  "in-progress": { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
} as const;

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok", weekday: "short", day: "numeric", month: "short", year: "numeric",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: true,
});
const compactDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok", day: "numeric", month: "short",
});
const compactTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false,
});

export default function TutorMatched({ matches }: { matches: TutorMatch[] }) {
  const confirmedMatches = getConfirmedMatches(matches);

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-white px-5 py-6 text-foreground sm:px-10">
      <TutorHeader activePage="matched" />
      <main aria-label="Matched students" className="w-full max-w-[1070px]">
        {confirmedMatches.length > 0 ? (
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,330px),330px))] justify-center gap-x-10 gap-y-[50px]">
            {confirmedMatches.map((match) => {
              const status = statuses[match.status];
              const startsAt = new Date(match.startsAt);
              const endsAt = new Date(match.endsAt);
              const timeLabel = `${dateFormatter.format(startsAt)} ${timeFormatter.format(startsAt)} - ${timeFormatter.format(endsAt)}`;

              return (
                <li key={match.id}>
                  <StudentCard
                    student={match.student}
                    status={
                      <Badge
                        variant={status.variant}
                        className={cn("gap-1 text-xs", match.status === "completed" && "border-emerald-200 bg-emerald-100 text-emerald-900")}
                        aria-label={`Lesson status: ${status.label}`}
                      >
                        {match.status === "upcoming" ? (
                          <CircleAlert aria-hidden="true" />
                        ) : match.status === "in-progress" ? (
                          <CirclePlay aria-hidden="true" />
                        ) : (
                          <CircleCheck aria-hidden="true" />
                        )}
                        {status.label}
                      </Badge>
                    }
                    photoDetails={
                      <>
                        <Badge variant="secondary" className="h-auto gap-1 px-2 py-1 text-xs font-normal shadow-sm" title={timeLabel} aria-label={timeLabel}>
                          <Clock aria-hidden="true" />
                          <span className="tabular-nums">{compactDateFormatter.format(startsAt)} · {compactTimeFormatter.format(startsAt)}–{compactTimeFormatter.format(endsAt)}</span>
                        </Badge>
                        <Badge variant="secondary" className="h-auto gap-1 px-1.5 py-1 text-xs font-normal shadow-sm" aria-label={`Lesson price: ${match.price.toLocaleString("en-US")} Thai baht`}>
                          <BanknoteArrowUp aria-hidden="true" />
                          ฿ {match.price.toLocaleString("en-US")}
                        </Badge>
                      </>
                    }
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <Card className="mx-auto max-w-md text-center">
            <CardContent className="flex flex-col items-center gap-3">
              <h2 className="text-lg font-semibold">No matched students yet</h2>
              <p className="text-sm text-muted-foreground">Students appear here after you confirm a time slot and they confirm the match.</p>
              <Link href="/tutor/swiped" className={buttonVariants()}>View swiped students</Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
