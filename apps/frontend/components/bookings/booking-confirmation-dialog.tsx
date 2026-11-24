"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

export default function BookingConfirmationDialog({
  confirmation,
  onClose,
  onConfirm,
  busy = false,
  tutorName,
  studentName,
  summary,
  confirmDisabled = false,
  error,
}: {
  confirmation: "accept" | "reject" | "complete" | "proposal" | null;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  tutorName?: string;
  studentName?: string;
  summary?: { date: string; time: string; fee: string };
  confirmDisabled?: boolean;
  error?: string;
}) {
  const completing = confirmation === "complete";
  const proposing = confirmation === "proposal";
  return (
    <Dialog.Root
      open={confirmation !== null}
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-30 bg-foreground/35 backdrop-blur-sm" />
        <Dialog.Viewport className="fixed inset-0 z-40 flex items-center justify-center p-5">
          <Dialog.Popup className="w-full max-w-[410px] rounded-2xl bg-card text-card-foreground px-5 pb-4 pt-8 shadow-[0_4px_4px_#00000040] outline-none">
            <Dialog.Title className="text-base font-semibold">
              {proposing
                ? "Send this time offer?"
                : completing
                ? "Did you attend this lesson?"
                : confirmation === "reject"
                ? "Decline this match?"
                : "Accept this match?"}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {proposing
                ? `Send this lesson time to ${studentName}? The student will need to accept your offer.`
                : completing
                ? `Confirm your attendance for the lesson with ${tutorName}.`
                : confirmation === "reject"
                ? "Are you sure you want to decline this offer from your tutor? This offer will be removed."
                : "Are you sure you want to confirm this match with your tutor? Your tutoring session will be confirmed."}
            </Dialog.Description>
            {summary && (
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-muted-foreground">{summary.date}</p>
                <p className="font-medium">{summary.time}</p>
                <p className="pt-1">
                  <span className="text-muted-foreground">Total lesson fee: </span>
                  <span className="font-semibold">฿{summary.fee}</span>
                </p>
              </div>
            )}
            {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
            <div className="mt-10 flex justify-end gap-3">
              <Dialog.Close
                disabled={busy}
                render={<Button variant="outline" />}
              >
                {completing ? "Not now" : "Cancel"}
              </Dialog.Close>
              <Button
                variant={confirmation === "reject" ? "destructive" : "default"}
                onClick={onConfirm}
                disabled={busy || confirmDisabled}
              >
                {proposing
                  ? busy ? "Sending…" : "Send Offer"
                  : completing
                  ? "Yes, I attended"
                  : confirmation === "reject" ? "Decline Match" : "Confirm Match"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
