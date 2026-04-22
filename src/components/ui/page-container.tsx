import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const containerVariants = cva(
  "mx-auto w-full transition-all duration-300",
  {
    variants: {
      size: {
        sm: "max-w-screen-sm px-4 sm:px-6",
        md: "max-w-screen-md px-4 sm:px-6 md:px-8",
        lg: "max-w-screen-lg px-4 sm:px-6 md:px-8 lg:px-10",
        xl: "max-w-screen-xl px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12",
        "2xl": "max-w-screen-2xl px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12",
        full: "max-w-full px-4 sm:px-6 md:px-8 lg:px-10",
      },
      spacing: {
        none: "py-0",
        sm: "py-4 sm:py-6",
        default: "py-6 sm:py-8 md:py-10",
        md: "py-8 sm:py-10 md:py-12",
        lg: "py-10 sm:py-12 md:py-16 lg:py-20",
      },
    },
    defaultVariants: {
      size: "xl",
      spacing: "default",
    },
  }
);

export interface PageContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {}

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, size, spacing, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(containerVariants({ size, spacing }), className)}
      {...props}
    />
  )
);

PageContainer.displayName = "PageContainer";

