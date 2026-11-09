"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./auth-provider";
import { roleHome } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
    <main className="grid min-h-screen place-items-center p-5">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>Welcome to Tiwder</h1>
          </CardTitle>
          <CardDescription>
            Find your tutor. Make time to learn.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {search.has("error") && (
            <Alert variant="destructive">
              <AlertDescription>
                Google sign-in could not be completed. Please try again.
              </AlertDescription>
            </Alert>
          )}
          <p>
            Sign in with your Google account to send requests and arrange
            lessons.
          </p>
          <Button
            nativeButton={false}
            disabled={loading}
            render={<a href="/api/auth/google" />}
          >
            Continue with Google
          </Button>
          <p className="text-sm text-muted-foreground">
            We use your name, email, and profile photo. Your Gmail messages stay
            private.
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/" className="text-sm underline underline-offset-4">
            Browse tutors first
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
