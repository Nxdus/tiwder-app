"use client";

import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const reasons = ["Schedule conflict", "Personal reasons", "Health reasons", "Other"];
export type CancellationInput = { reason: string; details?: string };

export default function LessonCancellationDialog({ targetName, schedule, busy, error, onClose, onConfirm, request = false }: {
  targetName: string;
  schedule: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (input: CancellationInput) => Promise<void>;
  request?: boolean;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const submitting = useRef(false);
  const valid = Boolean(reason && (reason !== "Other" || details.trim()));
  const reasonText = reason === "Other" ? details.trim() : reason;
  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !busy && !submitting.current) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-30 bg-foreground/35 backdrop-blur-sm" />
        <Dialog.Viewport className="fixed inset-0 z-40 flex items-center justify-center p-5">
          <Dialog.Popup className="w-full max-w-[410px] rounded-2xl bg-card px-5 pb-4 pt-8 text-card-foreground shadow-[0_4px_4px_#00000040] outline-none">
            <Dialog.Title className="text-base font-semibold">{reviewing ? request ? "Cancel this request?" : "Cancel this lesson?" : "Why are you cancelling?"}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              {reviewing ? "Check the reason below before confirming. This action cannot be undone." : `Choose a reason for cancelling your ${request ? "request" : "lesson"} with ${targetName}.`}
            </Dialog.Description>
            {reviewing ? (
              <dl className="mt-5 space-y-3 text-sm">
                <div><dt className="text-muted-foreground">Lesson with</dt><dd>{targetName}</dd></div>
                <div><dt className="text-muted-foreground">Schedule</dt><dd>{schedule}</dd></div>
                <div><dt className="text-muted-foreground">Reason</dt><dd className="break-words whitespace-pre-wrap">{reasonText}</dd></div>
              </dl>
            ) : (
              <div className="mt-5 space-y-3">
                <label className="block text-sm" htmlFor="cancellation-reason">Reason</label>
                <Select value={reason} onValueChange={setReason} disabled={busy}>
                  <SelectTrigger id="cancellation-reason" className="w-full"><SelectValue placeholder="Choose a reason" /></SelectTrigger>
                  <SelectContent>{reasons.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
                {reason === "Other" && <>
                  <label className="block text-sm" htmlFor="cancellation-details">Your reason</label>
                  <Textarea id="cancellation-details" value={details} maxLength={300} disabled={busy} onChange={(event) => setDetails(event.target.value)} placeholder="Briefly explain (up to 300 characters)" />
                  <p className="text-xs text-muted-foreground">{details.length}/300</p>
                </>}
              </div>
            )}
            {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
            <div className="mt-8 flex justify-end gap-3">
              <Button variant="outline" disabled={busy} onClick={() => reviewing ? setReviewing(false) : onClose()}>{reviewing ? "Back" : "Keep lesson"}</Button>
              <Button variant={reviewing ? "destructive" : "default"} disabled={busy || !valid} onClick={async () => {
                if (!reviewing) { setReviewing(true); return; }
                if (submitting.current || !reason) return;
                submitting.current = true;
                try { await onConfirm({ reason, ...(reason === "Other" ? { details: details.trim() } : {}) }); }
                finally { submitting.current = false; }
              }}>{busy ? "Cancelling…" : reviewing ? "Confirm cancellation" : "Continue"}</Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
