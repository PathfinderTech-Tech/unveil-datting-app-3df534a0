import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const gradientBase =
  "bg-[linear-gradient(135deg,oklch(0.78_0.18_340)_0%,oklch(0.62_0.22_310)_55%,oklch(0.50_0.20_290)_100%)]";
const gradientHover =
  "hover:bg-[linear-gradient(135deg,oklch(0.82_0.19_340)_0%,oklch(0.66_0.23_310)_55%,oklch(0.54_0.21_290)_100%)]";
const gradientActive =
  "active:bg-[linear-gradient(135deg,oklch(0.70_0.18_340)_0%,oklch(0.55_0.22_310)_55%,oklch(0.42_0.20_290)_100%)]";
const gradientShadow =
  "shadow-[0_4px_20px_-4px_oklch(0.65_0.24_330/0.55)] hover:shadow-[0_6px_28px_-4px_oklch(0.65_0.24_330/0.75)]";
const gradientAll = `text-white ${gradientBase} ${gradientHover} ${gradientActive} ${gradientShadow}`;

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: gradientAll,
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: `border border-white/10 ${gradientAll}`,
        secondary: `${gradientAll} opacity-90 hover:opacity-100`,
        ghost: `text-white ${gradientHover} ${gradientActive}`,
        link: "underline-offset-4 hover:underline text-transparent bg-clip-text bg-[linear-gradient(135deg,oklch(0.78_0.18_340)_0%,oklch(0.62_0.22_310)_55%,oklch(0.50_0.20_290)_100%)] hover:bg-[linear-gradient(135deg,oklch(0.82_0.19_340)_0%,oklch(0.66_0.23_310)_55%,oklch(0.54_0.21_290)_100%)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
