"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

export default function OfferConfirmationDialog({
  confirmation,
  onClose,
  onConfirm,
  busy = false,
  error,
}: {
  confirmation: "accept" | "reject" | null;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  error?: string;
}) {
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
              {confirmation === "reject"
                ? "Decline this match?"
                : "Accept this match?"}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {confirmation === "reject"
                ? "Are you sure you want to decline this offer from your tutor? This offer will be removed."
                : "Are you sure you want to confirm this match with your tutor? Your tutoring session will be confirmed."}
            </Dialog.Description>
            {error && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="mt-10 flex justify-end gap-2">
              <Dialog.Close
                disabled={busy}
                className="rounded-lg border border-border px-2 py-1 text-sm"
              >
                Cancel
              </Dialog.Close>
              <Button
                onClick={onConfirm}
                disabled={busy}
                className="h-auto rounded-lg bg-primary px-2 py-1 text-sm text-primary-foreground hover:bg-primary/80"
              >
                {confirmation === "reject" ? "Decline Match" : "Confirm Match"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
