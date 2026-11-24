import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatSchedule } from "@/lib/api";
import type { Match } from "@/lib/api";

export default function CancelledLessonCard({ lesson, name }: { lesson: Match; name: string }) {
  return (
    <Card className="w-full self-start" size="sm">
      <CardContent className="space-y-3">
        <Badge variant="destructive">Cancelled</Badge>
        <h3 className="break-words font-semibold">{name}</h3>
        <p className="text-sm text-muted-foreground">{formatSchedule(lesson)}</p>
        <p className="break-words whitespace-pre-wrap text-sm"><span className="text-muted-foreground">Reason: </span>{lesson.cancellationReason || "No reason provided"}</p>
      </CardContent>
    </Card>
  );
}
