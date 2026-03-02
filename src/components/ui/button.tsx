"use client"

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>(
  ({ children, ...props }, ref) => {
    if (React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      return React.cloneElement(child, {
        ...props,
        ...child.props,
        ref: (node: any) => {
          if (typeof ref === 'function') ref(node)
          else if (ref) (ref as any).current = node

          const childRef = (child as any).ref
          if (typeof childRef === 'function') childRef(node)
          else if (childRef) childRef.current = node
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
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
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
