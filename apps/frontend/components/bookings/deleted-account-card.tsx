import { UserRoundX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function DeletedAccountCard({
  tutorView,
  busy,
  onDismiss,
}: {
  tutorView: boolean;
  busy: boolean;
  onDismiss: () => void;
}) {
  return (
    <Card
      className={cn(
        "relative gap-0 overflow-hidden rounded-2xl py-0",
        tutorView
          ? "h-full border-0 bg-card shadow-lg ring-0"
          : "h-[270px] bg-secondary text-foreground ring-1 ring-border",
      )}
    >
      <button
        type="button"
        className="absolute inset-0 z-10 cursor-pointer rounded-[inherit] transition-colors hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        disabled={busy}
        aria-busy={busy}
        aria-label="Remove this deleted account from all requests and matches"
        onClick={onDismiss}
      />
      <div
        className={cn(
          "flex shrink-0 flex-col items-center justify-center gap-3 text-muted-foreground",
          tutorView
            ? "h-[230px] border-b border-primary/20 bg-linear-to-br from-primary/30 via-primary/15 to-primary/5"
            : "absolute inset-0 pb-20",
        )}
      >
        <UserRoundX aria-hidden="true" className="size-16" />
        <p className="pointer-events-none px-3 text-center text-[11px] leading-4">
          (Click anywhere to remove)
        </p>
      </div>
      <CardContent
        className={
          tutorView
            ? "flex flex-col gap-3 p-4"
            : "absolute inset-x-0 bottom-0 flex flex-col gap-2 p-3"
        }
      >
        <h2
          className={
            tutorView
              ? "text-xl font-semibold leading-6"
              : "text-sm font-semibold leading-5"
          }
        >
          {tutorView ? "Deleted student" : "Deleted tutor"}
        </h2>
        <p
          className={
            tutorView
              ? "text-sm text-muted-foreground"
              : "text-xs leading-4 text-foreground/80"
          }
        >
          {tutorView
            ? "This student has deleted their account."
            : "This tutor has deleted their account."}
        </p>
      </CardContent>
    </Card>
  );
}
