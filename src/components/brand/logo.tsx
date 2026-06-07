import { cn } from "@/lib/utils";

/**
 * Strata logo — three stacked strata (layers), echoing the dual-layer
 * coding methodology and the platform's name (層次分析).
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
      <rect x="4" y="6" width="24" height="3" rx="0.5" fill="hsl(30 17% 14%)" />
      <rect x="6" y="14" width="20" height="3" rx="0.5" fill="hsl(199 21% 42%)" />
      <rect x="8" y="22" width="16" height="3" rx="0.5" fill="hsl(13 39% 47%)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Logo size={20} />
      <span className="text-[15px] font-medium tracking-tightish">Strata</span>
      <span className="text-[11px] tracking-widish text-muted-foreground">層次分析</span>
    </div>
  );
}
