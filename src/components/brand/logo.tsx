import { cn } from "@/lib/utils";

/**
 * Strata logo — three stacked strata (layers), echoing the dual-layer
 * coding methodology and the platform's name (層析).
 */
export function Logo({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="stratagrad" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="hsl(199 89% 48%)" />
          <stop offset="50%" stopColor="hsl(224 76% 48%)" />
          <stop offset="100%" stopColor="hsl(262 83% 58%)" />
        </linearGradient>
      </defs>
      <rect x="4" y="6" width="24" height="4" rx="1.5" fill="url(#stratagrad)" opacity="0.95" />
      <rect x="6" y="14" width="20" height="4" rx="1.5" fill="url(#stratagrad)" opacity="0.7" />
      <rect x="8" y="22" width="16" height="4" rx="1.5" fill="url(#stratagrad)" opacity="0.45" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Logo size={22} />
      <span className="text-base font-semibold tracking-tight">Strata</span>
      <span className="text-xs text-muted-foreground">層析</span>
    </div>
  );
}
