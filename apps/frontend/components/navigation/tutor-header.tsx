"use client";

import { Menu } from "lucide-react";
import AccountButton from "@/components/auth/account-button";
import { NotificationBadge, useNotificationCount } from "@/components/navigation/notification-badge";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function TutorHeader({
  activePage = "swiped",
}: {
  activePage?: "swiped" | "matched";
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const count = useNotificationCount();

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 640px)");
    const closeOnDesktop = () => desktop.matches && setMenuOpen(false);
    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <header className="relative z-30 mx-auto flex w-full max-w-full shrink-0 items-center justify-between gap-8 text-foreground sm:w-fit sm:justify-center">
      <h1 className="text-3xl font-bold tracking-tight">Tiwder</h1>
      <nav
        aria-label="Tutor navigation"
        className="hidden items-center justify-center gap-8 sm:flex"
      >
        <Link
          href="/tutor/swiped"
          aria-current={activePage === "swiped" ? "page" : undefined}
          className={cn(
            buttonVariants({
              variant: activePage === "swiped" ? "default" : "secondary",
            }),
            "relative h-8 rounded-full px-4 text-sm font-medium",
          )}
        >
          Swiped
          <NotificationBadge count={count} label="students awaiting a time proposal" />
        </Link>
        <Link
          href="/tutor/matched"
          aria-current={activePage === "matched" ? "page" : undefined}
          className={cn(
            buttonVariants({
              variant: activePage === "matched" ? "default" : "secondary",
            }),
            "h-8 rounded-full px-4 text-sm font-medium",
          )}
        >
          Matched
        </Link>
      </nav>
      <div className="col-start-2 row-start-1 flex items-center justify-self-end gap-2 sm:col-start-3">
        <div className="hidden sm:block">
          <AccountButton />
        </div>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            render={
              <Button
                variant="secondary"
                size="icon"
                className="relative rounded-full sm:hidden"
                aria-label="Open navigation"
              />
            }
          >
            <Menu />
            <NotificationBadge count={count} label="students awaiting a time proposal" />
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>Choose a section.</SheetDescription>
            </SheetHeader>
            <nav
              aria-label="Tutor navigation"
              className="flex flex-col gap-2 px-6"
            >
              <SheetClose
                render={
                  <Link
                    href="/tutor/swiped"
                    aria-current={activePage === "swiped" ? "page" : undefined}
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "relative h-11 w-full justify-start rounded-lg px-4 aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground",
                    )}
                  />
                }
              >
                Swiped
                <NotificationBadge count={count} label="students awaiting a time proposal" />
              </SheetClose>
              <SheetClose
                render={
                  <Link
                    href="/tutor/matched"
                    aria-current={activePage === "matched" ? "page" : undefined}
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "h-11 w-full justify-start rounded-lg px-4 aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground",
                    )}
                  />
                }
              >
                Matched
              </SheetClose>
            </nav>
            <AccountButton inSheet onSignedOut={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
