import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-normal transition-colors",
  {
    variants: {
      variant: {
        default: "border-foreground/15 bg-transparent text-foreground/80",
        secondary: "border-transparent bg-muted text-muted-foreground",
        outline: "border-border text-foreground",
        surface: "border-surface_axis/30 bg-surface_axis/8 text-surface_axis",
        deep: "border-deep_axis/30 bg-deep_axis/8 text-deep_axis",
        hybrid: "border-hybrid_axis/30 bg-hybrid_axis/8 text-hybrid_axis",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
