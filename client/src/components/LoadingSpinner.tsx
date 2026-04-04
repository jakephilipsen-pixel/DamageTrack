import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  fullPage?: boolean;
}

export function LoadingSpinner({
  size = 32,
  className,
  fullPage = false,
}: LoadingSpinnerProps) {
  if (fullPage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2
          size={size}
          className={cn("animate-spin text-primary", className)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-8">
      <Loader2
        size={size}
        className={cn("animate-spin text-primary", className)}
      />
    </div>
  );
}
