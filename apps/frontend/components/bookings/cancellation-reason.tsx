export default function CancellationReason({ reason }: { reason: string | null }) {
  return (
    <div className="min-h-20 space-y-2 rounded-xl bg-muted/60 p-3">
      <p className="text-xs font-medium text-muted-foreground">Reason</p>
      <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">{reason || "No reason provided"}</p>
    </div>
  );
}
