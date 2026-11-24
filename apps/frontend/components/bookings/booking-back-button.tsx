"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookingBackButton({ destination, onBack }: {
  destination: "discover" | "offered" | "swiped" | "matched";
  onBack: () => void;
}) {
  return (
    <Button variant="ghost" size="sm" onClick={onBack} className="h-auto justify-start gap-2 px-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground dark:hover:bg-transparent">
      <ArrowLeft aria-hidden="true" className="size-4" />
      Back to {destination}
    </Button>
  );
}
