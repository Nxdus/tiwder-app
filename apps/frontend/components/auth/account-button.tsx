"use client";

import Link from "next/link";
import { useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { SheetClose, SheetFooter } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { useAuth } from "./auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingRegion } from "@/components/loading/skeletons";

function AccountAvatar({ src, name }: { src?: string; name?: string }) {
  const [imageStatus, setImageStatus] = useState("loading");
  const pending = Boolean(src) && imageStatus !== "loaded" && imageStatus !== "error";
  return (
    <Avatar className="size-full" aria-busy={pending}>
      <AvatarImage src={src} alt={name ?? ""} referrerPolicy="no-referrer" onLoadingStatusChange={setImageStatus} />
      <AvatarFallback><UserRound /></AvatarFallback>
      {pending && <><Skeleton className="pointer-events-none absolute inset-0 size-full rounded-full" /><span role="status" className="sr-only">Loading image…</span></>}
    </Avatar>
  );
}

export default function AccountButton({
  inSheet = false,
  onSignedOut,
}: {
  inSheet?: boolean;
  onSignedOut?: () => void;
}) {
  const { session, loading, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await logout();
      onSignedOut?.();
    } catch (cause) {
      toast.add({
        type: "error",
        title: "Unable to sign out",
        description: cause instanceof Error ? cause.message : "Please try again.",
      });
    } finally {
      setSigningOut(false);
    }
  }

  if (inSheet) {
    return (
      <SheetFooter>
        <SheetClose
          nativeButton={false}
          render={
            <Button
              nativeButton={false}
              variant="ghost"
              className="h-11 w-full justify-start rounded-lg px-4"
              disabled={loading || signingOut}
              render={<Link href={session.user ? (session.user.onboarded ? "/profile" : "/onboarding") : "/login"} />}
            />
          }
        >
          <UserRound data-icon="inline-start" />
          {session.user ? "Profile" : "Sign in"}
        </SheetClose>
        {session.user && (
          <>
            <Separator />
            <Button
              variant="destructive"
              className="h-11 w-full justify-start rounded-lg px-4"
              disabled={loading || signingOut}
              onClick={signOut}
            >
              <LogOut data-icon="inline-start" />
              Sign out
            </Button>
          </>
        )}
      </SheetFooter>
    );
  }

  const avatar = <AccountAvatar key={session.user?.avatarUrl} src={session.user?.avatarUrl ?? undefined} name={session.user?.name} />;

  if (loading) return (
    <LoadingRegion label="Loading account…"><Skeleton className="size-[33px] rounded-full" /></LoadingRegion>
  );

  if (!session.user) return (
    <Button
      nativeButton={false}
      variant="secondary"
      size="icon"
      className="size-[33px] rounded-full"
      disabled={loading}
      render={<Link href="/login" />}
      aria-label="Sign in"
    >
      {avatar}
    </Button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="secondary"
            size="icon"
            className="size-[33px] rounded-full"
            disabled={loading || signingOut}
            aria-label="Account menu"
          />
        }
      >
        {avatar}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={<Link href={session.user.onboarded ? "/profile" : "/onboarding"} />}
          >
            <UserRound />
            Profile
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" disabled={signingOut} onClick={signOut}>
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
