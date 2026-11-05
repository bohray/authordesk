import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { toneText } from "@/components/common/tones";
import { cn } from "@/lib/utils";
import { ticketTips } from "@/constants/tickets";

/** Static sidebar for the new-ticket page. Server-safe so `loading.tsx` can show it instantly. */
export function TicketTips() {
  return (
    <Card size="sm" className="bg-muted/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Lightbulb className={cn("size-4", toneText.warn)} aria-hidden />
          Tips for a faster answer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1.5 pl-4 text-sm text-muted-foreground">
          {ticketTips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
