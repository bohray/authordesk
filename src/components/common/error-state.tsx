"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function ErrorState({
  title = "Couldn't load this",
  error,
  onRetry,
  isRetrying,
  className,
}: {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}) {
  return (
    <Alert variant="destructive" className={cn("bg-destructive/5", className)}>
      <AlertTriangle aria-hidden />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{getErrorMessage(error)}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={onRetry}
            disabled={isRetrying}
          >
            <RotateCw className={cn(isRetrying && "animate-spin")} aria-hidden />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
