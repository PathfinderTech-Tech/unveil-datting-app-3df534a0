import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent text-white shadow-[0_2px_10px_-2px_oklch(0.65_0.24_330/0.5)] bg-[linear-gradient(135deg,oklch(0.78_0.18_340)_0%,oklch(0.62_0.22_310)_55%,oklch(0.50_0.20_290)_100%)] hover:bg-[linear-gradient(135deg,oklch(0.82_0.19_340)_0%,oklch(0.66_0.23_310)_55%,oklch(0.54_0.21_290)_100%)] hover:shadow-[0_4px_16px_-2px_oklch(0.65_0.24_330/0.7)]",
        secondary:
          "border-transparent text-white opacity-90 hover:opacity-100 bg-[linear-gradient(135deg,oklch(0.78_0.18_340)_0%,oklch(0.62_0.22_310)_55%,oklch(0.50_0.20_290)_100%)] hover:bg-[linear-gradient(135deg,oklch(0.82_0.19_340)_0%,oklch(0.66_0.23_310)_55%,oklch(0.54_0.21_290)_100%)]",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline:
          "text-foreground border-white/15 hover:bg-[linear-gradient(135deg,oklch(0.78_0.18_340/0.15)_0%,oklch(0.50_0.20_290/0.15)_100%)] hover:text-white hover:border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
