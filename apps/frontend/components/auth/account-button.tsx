"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "./auth-provider";

export default function AccountButton() {
  const { session, loading } = useAuth();
  return (
    <Button
      nativeButton={false}
      variant="secondary"
      size="icon"
      className="size-[33px] rounded-full"
      disabled={loading}
      render={
        <Link
          href={
            session.user
              ? session.user.onboarded
                ? "/profile"
                : "/onboarding"
              : "/login"
          }
        />
      }
      aria-label={session.user ? "Profile" : "Sign in"}
    >
      <UserRound />
    </Button>
  );
}
