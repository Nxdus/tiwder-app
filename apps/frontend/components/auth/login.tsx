"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import { ShieldCheck, X } from "lucide-react";
import { useAuth } from "./auth-provider";
import { roleHome } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { LoadingRegion } from "@/components/loading/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function Login() {
  const { session, loading } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  useEffect(() => {
    if (session.user)
      router.replace(
        session.user.onboarded ? roleHome(session.user.role) : "/onboarding",
      );
  }, [session.user, router]);

  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) router.replace("/");
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Viewport className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4 sm:p-6">
          <Dialog.Popup className="relative my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col gap-6 overflow-y-auto rounded-3xl bg-card p-6 text-card-foreground shadow-2xl outline-none sm:p-8">
            <Dialog.Close
              aria-label="Close sign in"
              render={<Button variant="ghost" size="icon" className="absolute right-5 top-5" />}
            >
              <X />
            </Dialog.Close>

            <div className="flex flex-col gap-2 pr-8">
              <Dialog.Title className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome to Tiwder
              </Dialog.Title>
              <Dialog.Description className="text-sm leading-relaxed text-muted-foreground">
                Find your tutor and make time to learn. Sign in to send requests
                and arrange lessons.
              </Dialog.Description>
            </div>

            {search.has("error") && (
              <Alert variant="destructive">
                <AlertDescription>
                  Google sign-in could not be completed. Please try again.
                </AlertDescription>
              </Alert>
            )}

            {loading ? (
              <LoadingRegion label="Loading account…"><Skeleton className="h-12 w-full rounded-xl" /></LoadingRegion>
            ) : <Button
              nativeButton={false}
              disabled={loading}
              variant="outline"
              size="lg"
              className="h-12 w-full gap-3 rounded-xl"
              render={<a href="/api/auth/google" />}
            >
              <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.64 17.74 9.5 24 9.5Z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.88c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.36 38.03 46.98 31.89 46.98 24.55Z" />
                <path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.94-2.13 15.92-5.8l-7.73-6c-2.15 1.45-4.9 2.3-8.19 2.3-6.26 0-11.57-4.14-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
              </svg>
              Continue with Google
            </Button>}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Separator className="flex-1" />
              <span>YOUR PRIVACY MATTERS</span>
              <Separator className="flex-1" />
            </div>
            <p className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              We use your name, email, and profile photo. Your Gmail messages
              stay private.
            </p>
            <Link
              href="/"
              className="text-center text-sm font-medium text-primary-foreground underline-offset-4 hover:underline"
            >
              Browse tutors first
            </Link>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
