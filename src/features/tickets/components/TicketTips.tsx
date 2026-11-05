import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { toneText } from "@/components/common/tones";
import { cn } from "@/lib/utils";

const tips = [
  "Pick the book your question is about so we can see its sales and royalty data.",
  "Include relevant dates, e.g. when you expected a payout or placed an order.",
  "Add order numbers, platform names (Amazon, Flipkart) or links where it applies.",
  "For printing issues, describe the defect and how many copies are affected.",
];

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
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
