"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";

export default function CancelConfirmationDialog({
  open,
  onClose,
  onConfirm,
  busy = false,
  targetName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  targetName?: string;
}) {
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
              Cancel this lesson?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {targetName
                ? `Are you sure you want to cancel this lesson with ${targetName}? This action cannot be undone.`
                : "Are you sure you want to cancel this lesson? This action cannot be undone."}
            </Dialog.Description>
            <div className="mt-10 flex justify-end gap-3">
              <Dialog.Close
                disabled={busy}
                render={<Button variant="outline" />}
              >
                Keep lesson
              </Dialog.Close>
              <Button
                variant="destructive"
                onClick={onConfirm}
                disabled={busy}
              >
                Cancel lesson
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
