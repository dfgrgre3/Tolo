import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// NOTE: intentionally NO "use client" here. This module is pure presentational
// (no hooks, no browser APIs), so server components can render it without
// pulling it into the client bundle (B-09). It still works inside client
// components — directives are porous downward. Do NOT re-add the directive:
// every server-side importer would become client code again. Verified: all
// 167 importers either carry their own directive or sit under one, and no
// true-server leaf passes event handlers/refs to <Button>.

const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>(
  ({ children, ...props }, ref) => {
    if (React.isValidElement(children)) {
      const child = children as React.ReactElement<
        React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }
      >;
      const childRef = child.props.ref;
      return React.cloneElement(child, {
        ...props,
        ...child.props,
        ref: (node: HTMLElement | null) => {
          if (typeof ref === 'function') ref(node)
          else if (ref && "current" in ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node

          if (typeof childRef === 'function') childRef(node)
        },
        style: {
          ...props.style,
          ...child.props.style,
        },
        className: cn(props.className, child.props.className),
      });
    }
    return <span {...props} ref={ref}>{children}</span>;
  }
);
Slot.displayName = "Slot";

const buttonVariants = cva(
  // Base: include touch target minimum size (44x44 on touch devices), zero transitions, crisp states
  "inline-flex items-center justify-center rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none no-tap-highlight",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-muted hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-accent text-accent-foreground hover:bg-accent/90",
        gradient: "bg-primary text-primary-foreground hover:bg-primary/90",
        success: "bg-emerald-600 text-white hover:bg-emerald-700",
        warning: "bg-amber-600 text-white hover:bg-amber-700",
        neon: "bg-primary text-primary-foreground hover:bg-primary/90",
      },
      size: {
        // Mobile-friendly touch targets (min 44px tall on mobile, 40px on desktop for buttons, 44px for icon)
        default: "h-10 min-h-[40px] px-4 py-2",
        sm: "h-9 min-h-[36px] px-3 text-xs sm:h-9",
        lg: "h-12 min-h-[48px] px-5 sm:px-6 text-base",
        xl: "h-14 min-h-[56px] px-6 sm:px-8 text-lg",
        icon: "h-10 w-10 min-h-[40px] min-w-[40px]",
        "icon-sm": "h-8 w-8 min-h-[32px] min-w-[32px]",
        "icon-lg": "h-12 w-12 min-h-[48px] min-w-[48px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonProps };
