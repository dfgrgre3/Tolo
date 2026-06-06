import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const containerVariants = cva(
  // Mobile-first responsive container
  "mx-auto w-full transition-all duration-300",
  {
    variants: {
      size: {
        sm: "max-w-screen-sm px-3 sm:px-4 md:px-6",
        md: "max-w-screen-md px-3 sm:px-4 md:px-6 md:px-8",
        lg: "max-w-screen-lg px-3 sm:px-4 md:px-6 lg:px-8",
        xl: "max-w-screen-xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10",
        "2xl": "max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-12",
        full: "max-w-full px-3 sm:px-4 md:px-6 lg:px-8",
      },
      spacing: {
        none: "py-0",
        sm: "py-4 sm:py-6",
        default: "py-5 sm:py-6 md:py-8 lg:py-10",
        md: "py-6 sm:py-8 md:py-10 lg:py-12",
        lg: "py-8 sm:py-10 md:py-12 lg:py-16 xl:py-20",
      },
    },
    defaultVariants: {
      size: "xl",
      spacing: "default",
    },
  }
);

interface PageContainerProps
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
