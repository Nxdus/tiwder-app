"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

const confirmationCopy = {
  lesson: {
    title: "Cancel this lesson?",
    action: "cancel this lesson",
    preposition: "with",
    detail: "This action cannot be undone.",
    keep: "Keep lesson",
    confirm: "Cancel lesson",
    pending: "Cancelling…",
  },
  request: {
    title: "Decline this request?",
    action: "decline this lesson request",
    preposition: "from",
    detail: "It will be removed from your Swiped list.",
    keep: "Keep request",
    confirm: "Decline request",
    pending: "Declining…",
  },
  withdraw: {
    title: "Withdraw this request?",
    action: "withdraw your lesson request",
    preposition: "to",
    detail: "It will be removed from your Offered list.",
    keep: "Keep request",
    confirm: "Withdraw request",
    pending: "Withdrawing…",
  },
};

export default function CancelConfirmationDialog({
  open,
  onClose,
  onConfirm,
  busy = false,
  targetName,
  kind = "lesson",
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  targetName?: string;
  kind?: "lesson" | "request" | "withdraw";
  error?: string;
}) {
  const copy = confirmationCopy[kind];
  const target = targetName ? ` ${copy.preposition} ${targetName}` : "";
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-30 bg-foreground/35 backdrop-blur-sm" />
        <Dialog.Viewport className="fixed inset-0 z-40 flex items-center justify-center p-5">
          <Dialog.Popup className="w-full max-w-[410px] rounded-2xl bg-card text-card-foreground px-5 pb-4 pt-8 shadow-[0_4px_4px_#00000040] outline-none">
            <Dialog.Title className="text-base font-semibold">
              {copy.title}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {`Are you sure you want to ${copy.action}${target}? ${copy.detail}`}
            </Dialog.Description>
            {error && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{error}</p>}
            <div className="mt-10 flex justify-end gap-3">
              <Dialog.Close
                disabled={busy}
                render={<Button variant="outline" />}
              >
                {copy.keep}
              </Dialog.Close>
              <Button
                variant="destructive"
                onClick={onConfirm}
                disabled={busy}
              >
                {busy ? copy.pending : copy.confirm}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
