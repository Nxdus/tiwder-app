"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Choice } from "@/components/auth/profile-form";
import type { Tutor } from "@/lib/student/tutors";

export default function ChooseSubjectDialog({
  tutor,
  open,
  onOpenChange,
  onConfirm,
  busy = false,
  error = "",
}: {
  tutor: Tutor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (subjects: string[]) => void;
  busy?: boolean;
  error?: string;
}) {
  const [subject, setSubject] = useState(tutor.subjects[0]?.id ?? "");
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!busy) onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/35 backdrop-blur-sm" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-5">
          <Dialog.Popup className="flex max-h-[calc(100dvh-2.5rem)] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-3xl bg-card p-7 text-card-foreground shadow-2xl outline-none">
            <Dialog.Title className="text-xl font-semibold">
              Choose a subject
            </Dialog.Title>
            <Dialog.Description>
              Send a lesson request to {tutor.name}. The tutor will propose a
              time for you to confirm.
            </Dialog.Description>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Field>
              <FieldLabel htmlFor="request-subject">Subject</FieldLabel>
              <Choice
                id="request-subject"
                value={subject}
                onChange={setSubject}
                options={tutor.subjects.map((item) => ({
                  value: item.id,
                  label: `${item.name} · ${item.level}`,
                }))}
                disabled={busy}
              />
            </Field>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={!subject || busy}
                onClick={() => onConfirm([subject])}
              >
                {busy ? "Sending…" : "Send request"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
