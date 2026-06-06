"use client"

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>(
  ({ children, ...props }, ref) => {
    if (React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      const childRef = (child as any).ref;
      return React.cloneElement(child, {
        ...props,
        ...child.props,
        ref: (node: any) => {
          if (typeof ref === 'function') ref(node)
          else if (ref && "current" in ref) (ref as React.MutableRefObject<any>).current = node

          if (typeof childRef === 'function') childRef(node)
        },
        style: {
          ...props.style,
          ...child.props.style,
        },
        className: cn(props.className, child.props.className),
      } as any);
    }
    return <span {...props} ref={ref}>{children}</span>;
  }
);
Slot.displayName = "Slot";

const buttonVariants = cva(
  // Base: include touch target minimum size (44x44 on touch devices)
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none no-tap-highlight",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-violet-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300",
        gradient: "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-lg",
        success: "bg-green-500 text-white hover:bg-green-600 shadow-sm",
        warning: "bg-yellow-500 text-white hover:bg-yellow-600 shadow-sm",
        neon: "bg-black text-primary border border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.3)] hover:shadow-[0_0_25px_rgba(var(--primary),0.5)] hover:bg-primary hover:text-white",
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
