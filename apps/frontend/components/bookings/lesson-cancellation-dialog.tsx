"use client";

import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const reasons = [
  "Timing issues",
  "Personal reasons",
  "Health reasons",
  "Other",
];
export type CancellationInput = { reason: string; details?: string };

export default function LessonCancellationDialog({
  targetName,
  schedule,
  busy,
  error,
  onClose,
  onConfirm,
  onRequestAnotherTime,
  request = false,
}: {
  targetName: string;
  schedule: string;
  busy: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (input: CancellationInput) => Promise<void>;
  onRequestAnotherTime?: () => Promise<void>;
  request?: boolean;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [nextAction, setNextAction] = useState<string | null>(null);
  const submitting = useRef(false);
  const canRequestTime = Boolean(
    onRequestAnotherTime && reason === "Timing issues",
  );
  const requestingTime = canRequestTime && nextAction === "retry";
  const valid = Boolean(
    reason &&
    (reason !== "Other" || details.trim()) &&
    (!canRequestTime || nextAction),
  );
  const reasonText = reason === "Other" ? details.trim() : reason;
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy && !submitting.current) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-30 bg-foreground/35 backdrop-blur-sm" />
        <Dialog.Viewport className="fixed inset-0 z-40 flex items-center justify-center p-5">
          <Dialog.Popup className="w-full max-w-[410px] rounded-2xl bg-card px-5 pb-4 pt-8 text-card-foreground shadow-[0_4px_4px_#00000040] outline-none">
            <Dialog.Title className="text-base font-semibold">
              {reviewing
                ? requestingTime
                  ? "Request another time?"
                  : request
                    ? "Cancel this request?"
                    : "Cancel this lesson?"
                : "Why are you cancelling?"}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-muted-foreground">
              {reviewing
                ? requestingTime
                  ? "Decline this time and ask your tutor for a new offer. Your request will stay open."
                  : "Check the reason below before confirming. This action cannot be undone."
                : `Choose a reason for cancelling your ${request ? "request" : "lesson"} with ${targetName}.`}
            </Dialog.Description>
            {reviewing ? (
              <dl className="mt-5 space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Lesson with</dt>
                  <dd>{targetName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {requestingTime ? "Previous offer" : "Schedule"}
                  </dt>
                  <dd>{schedule}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Reason</dt>
                  <dd className="break-words whitespace-pre-wrap">
                    {reasonText}
                  </dd>
                </div>
              </dl>
            ) : (
              <div className="mt-5 space-y-3">
                <label className="block text-sm" htmlFor="cancellation-reason">
                  Reason
                </label>
                <Select
                  value={reason}
                  onValueChange={(value) => {
                    setReason(value);
                    setNextAction(null);
                  }}
                  disabled={busy}
                >
                  <SelectTrigger id="cancellation-reason" className="w-full">
                    <SelectValue placeholder="Choose a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasons.filter((item) => !request || item !== "Health reasons").map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canRequestTime && (
                  <div className="space-y-2 border-t pt-3">
                    <label
                      className="block text-sm"
                      htmlFor="cancellation-next-action"
                    >
                      What would you like to do?
                    </label>
                    <Select
                      value={nextAction}
                      onValueChange={setNextAction}
                      disabled={busy}
                    >
                      <SelectTrigger
                        id="cancellation-next-action"
                        className="w-full"
                      >
                        <SelectValue placeholder="Choose an option">
                          {nextAction === "retry"
                            ? "Request another time"
                            : nextAction === "cancel"
                              ? "Cancel request"
                              : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="retry">
                          Request another time
                        </SelectItem>
                        <SelectItem value="cancel">Cancel request</SelectItem>
                      </SelectContent>
                    </Select>
                    {nextAction && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {requestingTime
                          ? "Keep your request open for a new time offer."
                          : "Close this request without asking for another time."}
                      </p>
                    )}
                  </div>
                )}
                {reason === "Other" && (
                  <>
                    <label
                      className="block text-sm"
                      htmlFor="cancellation-details"
                    >
                      Your reason
                    </label>
                    <Textarea
                      id="cancellation-details"
                      value={details}
                      maxLength={300}
                      disabled={busy}
                      onChange={(event) => setDetails(event.target.value)}
                      placeholder="Briefly explain (up to 300 characters)"
                    />
                    <p className="text-xs text-muted-foreground">
                      {details.length}/300
                    </p>
                  </>
                )}
              </div>
            )}
            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="mt-8 flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => (reviewing ? setReviewing(false) : onClose())}
              >
                {reviewing ? "Back" : request ? "Keep request" : "Keep lesson"}
              </Button>
              <Button
                variant={
                  reviewing && !requestingTime ? "destructive" : "default"
                }
                disabled={busy || !valid}
                onClick={async () => {
                  if (!reviewing) {
                    setReviewing(true);
                    return;
                  }
                  if (submitting.current || !reason) return;
                  submitting.current = true;
                  try {
                    if (requestingTime && onRequestAnotherTime)
                      await onRequestAnotherTime();
                    else
                      await onConfirm({
                        reason,
                        ...(reason === "Other"
                          ? { details: details.trim() }
                          : {}),
                      });
                  } finally {
                    submitting.current = false;
                  }
                }}
              >
                {busy
                  ? requestingTime
                    ? "Requesting…"
                    : "Cancelling…"
                  : reviewing
                    ? requestingTime
                      ? "Request another time"
                      : "Confirm cancellation"
                    : "Continue"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
