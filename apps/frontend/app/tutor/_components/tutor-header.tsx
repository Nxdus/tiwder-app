import Image from "next/image";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function TutorHeader({ isSwipedPage = false }: { isSwipedPage?: boolean }) {
  return (
    <header className="flex max-w-full flex-wrap items-center justify-center gap-4 rounded-3xl border bg-card px-5 py-3 text-card-foreground shadow-sm sm:gap-8">
      <h1 className="text-2xl leading-[normal] font-bold tracking-tight">
        Tiwder<span aria-hidden="true" className="text-primary">.</span>
      </h1>
      <nav aria-label="Tutor navigation" className="flex items-center gap-4 sm:gap-8">
        <Link
          href="/tutor/swiped"
          aria-current={isSwipedPage ? "page" : undefined}
          className={cn(
            buttonVariants(),
            "px-4 shadow-sm",
          )}
        >
          Swiped
        </Link>
        <Button
          disabled
          variant="ghost"
          title="Matched is not available in this preview"
          className="px-4 text-muted-foreground"
        >
          Matched
        </Button>
        <Button
          disabled
          variant="secondary"
          size="icon"
          aria-label="User profile (not available in this preview)"
          title="User profile is not available in this preview"
          className="rounded-full"
        >
          <Image src="/tutor/user.svg" alt="" width={16} height={16} className="shrink-0" />
        </Button>
      </nav>
    </header>
  );
}

