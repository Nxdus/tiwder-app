"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Trash2 } from "lucide-react";
import { useAuth } from "./auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";

export default function DeleteAccountDialog({
  disabled,
}: {
  disabled?: boolean;
}) {
  const { session, deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const matches = email.trim() === session.user?.email;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matches || busy) return;
    setBusy(true);
    setError("");
    try {
      await deleteAccount(email.trim());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to delete account. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        setEmail("");
        setError("");
      }}
    >
      <Dialog.Trigger
        disabled={disabled}
        render={<Button variant="destructive" />}
      >
        <Trash2 aria-hidden="true" /> Delete account
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-30 bg-foreground/35 backdrop-blur-sm" />
        <Dialog.Viewport className="fixed inset-0 z-40 flex items-center justify-center p-5">
          <Dialog.Popup className="w-full max-w-md rounded-2xl bg-card p-6 text-card-foreground shadow-lg outline-none">
            <Dialog.Title className="text-lg font-semibold">
              Delete your account?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your profile, photos, contact details, requests, and lessons will
              be permanently deleted. Your learning partners will only see an
              anonymous deleted account notice. This cannot be undone. Type your
              account email to confirm.
            </Dialog.Description>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <Field>
                <FieldLabel htmlFor="delete-account-email">
                  Your email: {session.user?.email}
                </FieldLabel>
                <Input
                  id="delete-account-email"
                  type="email"
                  autoComplete="off"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={busy}
                  aria-describedby={error ? "delete-account-error" : undefined}
                />
              </Field>
              {error && (
                <p
                  id="delete-account-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Dialog.Close
                  disabled={busy}
                  render={<Button variant="outline" />}
                >
                  Keep account
                </Dialog.Close>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={!matches || busy}
                >
                  {busy ? "Deleting…" : "Permanently delete account"}
                </Button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
