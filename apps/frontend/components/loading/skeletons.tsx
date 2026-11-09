import type { ReactNode } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function LoadingRegion({ children, label = "Loading…", className }: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div aria-busy="true" className={className}>
      <span role="status" className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function TutorCardSkeleton() {
  return (
    <LoadingRegion label="Loading tutors…" className="mx-auto mt-8 w-full max-w-[330px]">
      <div className="relative min-h-[587px] overflow-hidden rounded-2xl border bg-muted/30">
        <Skeleton className="absolute inset-x-0 top-0 h-[330px] rounded-none" />
        <div className="absolute inset-x-5 bottom-6 flex flex-col gap-4">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <div className="flex justify-center gap-6">
            <Skeleton className="size-14 rounded-full" />
            <Skeleton className="size-14 rounded-full" />
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

function StudentCardPlaceholder() {
  return (
    <Card className="w-full gap-0 py-0">
      <Skeleton className="h-[230px] w-full rounded-none" />
      <CardContent className="flex flex-col gap-4 p-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex flex-col gap-3 border-t pt-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="flex flex-col gap-3 border-t pt-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export function BookingListSkeleton({ tutor = false }: { tutor?: boolean }) {
  return (
    <LoadingRegion label="Loading lessons…" className={cn("mx-auto w-full", tutor && "max-w-[1070px]")}>
      <div className={tutor
        ? "grid grid-cols-[repeat(auto-fit,minmax(min(100%,330px),330px))] justify-center gap-x-10 gap-y-[50px]"
        : "mx-auto mt-8 grid max-w-[520px] grid-cols-[repeat(auto-fill,152px)] justify-center gap-8"}>
        {Array.from({ length: 3 }, (_, index) => tutor
          ? <StudentCardPlaceholder key={index} />
          : <Skeleton key={index} className="h-[270px] w-[152px] rounded-2xl" />)}
      </div>
    </LoadingRegion>
  );
}

export function ProposalSkeleton() {
  return (
    <LoadingRegion label="Loading request…" className="w-full max-w-[700px]">
      <Skeleton className="mb-4 h-8 w-32" />
      <div className="flex w-full flex-col items-center gap-8 md:flex-row md:items-start">
        <div className="w-full max-w-[330px]"><StudentCardPlaceholder /></div>
        <div className="flex w-full max-w-[338px] flex-col gap-5">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-[320px] w-full rounded-2xl" />
          <div className="flex gap-4">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 flex-1" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function ProfileSkeleton({ tutor = false }: { tutor?: boolean }) {
  return (
    <LoadingRegion label="Loading profile…">
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:gap-8">
        <Card>
          <CardHeader><CardTitle>Your photos</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="aspect-[4/5] w-full rounded-xl" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Profile details</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-6">
            <Skeleton className="h-6 w-28" />
            <div className="grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => <FieldPlaceholder key={index} />)}
            </div>
            <Skeleton className="h-6 w-44" />
            {Array.from({ length: tutor ? 4 : 1 }, (_, index) => <FieldPlaceholder key={index} />)}
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-10 w-32 self-end" />
          </CardContent>
        </Card>
      </div>
    </LoadingRegion>
  );
}

function FieldPlaceholder() {
  return <div className="flex flex-col gap-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-full" /></div>;
}

export function ProfilePageSkeleton() {
  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
        <Link href="/" className="self-start text-sm text-muted-foreground">Back to Tiwder</Link>
        <ProfileSkeleton />
      </div>
    </main>
  );
}

export function LoginSkeleton() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm sm:p-6">
      <LoadingRegion label="Loading sign in…" className="w-full max-w-md rounded-3xl border bg-background p-8 shadow-xl">
        <div className="flex flex-col gap-6">
          <h1 className="text-2xl font-semibold">Welcome to Tiwder</h1>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </LoadingRegion>
    </div>
  );
}
