"use client";

import { Menu } from "lucide-react";
import AccountButton from "@/components/auth/account-button";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function DiscoverHeader({
  tab,
  onTabChange,
}: {
  tab: string;
  onTabChange: (tab: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 640px)");
    const closeOnDesktop = () => desktop.matches && setMenuOpen(false);
    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <header className="mx-auto flex w-fit max-w-full items-center justify-center gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Tiwder</h1>
      <nav
        className="hidden items-center justify-center gap-8 sm:flex"
        aria-label="Main navigation"
      >
        {["Discover", "Offered", "Matched"].map((item) => (
          <Button
            key={item}
            aria-current={tab === item ? "page" : undefined}
            onClick={() => onTabChange(item)}
            variant={tab === item ? "default" : "secondary"}
            className="h-8 rounded-full px-4 text-sm font-medium"
          >
            {item}
          </Button>
        ))}
      </nav>
      <div className="col-start-2 row-start-1 flex items-center justify-self-end gap-2 sm:col-start-3">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger
            render={
              <Button
                variant="secondary"
                size="icon"
                className="rounded-full sm:hidden"
                aria-label="Open navigation"
              />
            }
          >
            <Menu />
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Navigation</SheetTitle>
              <SheetDescription>Choose a section.</SheetDescription>
            </SheetHeader>
            <nav
              className="flex flex-col gap-2 px-6"
              aria-label="Main navigation"
            >
              {["Discover", "Offered", "Matched"].map((item) => (
                <SheetClose
                  key={item}
                  render={
                    <Button
                      aria-current={tab === item ? "page" : undefined}
                      onClick={() => onTabChange(item)}
                      variant="ghost"
                      className="h-11 w-full justify-start rounded-lg px-4 aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
                    />
                  }
                >
                  {item}
                </SheetClose>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <AccountButton />
      </div>
    </header>
  );
}
