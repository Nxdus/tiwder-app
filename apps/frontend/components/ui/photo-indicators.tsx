import { cn } from "@/lib/utils";

export default function PhotoIndicators({
  activeIndex,
  count,
  className,
}: {
  activeIndex: number;
  count: number;
  className?: string;
}) {
  if (count <= 1) return null;

  return (
    <div
      className={cn("pointer-events-none absolute top-5 left-1/2 z-20 flex -translate-x-1/2 gap-2", className)}
      role="status"
      aria-label={`Photo ${activeIndex + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={cn("h-1 w-8 rounded-full", index === activeIndex ? "bg-white" : "bg-white/40")}
        />
      ))}
    </div>
  );
}
