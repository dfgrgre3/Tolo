import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const cardVariants = cva(
  "rounded-xl border bg-background shadow transition-all duration-300",
  {
    variants: {
      padding: {
        none: "",
        sm: "p-3",
        default: "p-4",
        md: "p-5",
        lg: "p-6",
        xl: "p-8",
      },
      shadow: {
        none: "shadow-none",
        sm: "shadow-sm",
        default: "shadow",
        md: "shadow-md",
        lg: "shadow-lg",
        xl: "shadow-xl",
      },
    },
    defaultVariants: {
      padding: "none",
      shadow: "default",
    },
  }
);

export interface CardProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding, shadow, ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(cardVariants({ padding, shadow }), className)} 
      {...props} 
    />
  )
);
Card.displayName = "Card";

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "default" | "md" | "lg";
}

const headerPaddingMap = {
  none: "",
  sm: "p-2 sm:p-3",
  default: "p-4 sm:p-5",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, padding = "default", ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        "flex flex-col space-y-1.5 sm:space-y-2",
        headerPaddingMap[padding],
        className
      )} 
      {...props} 
    />
  )
);
CardHeader.displayName = "CardHeader";

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  size?: "sm" | "default" | "lg" | "xl";
}

const titleSizeMap = {
  sm: "text-base sm:text-lg",
  default: "text-lg sm:text-xl",
  lg: "text-xl sm:text-2xl",
  xl: "text-2xl sm:text-3xl",
};

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, size = "default", ...props }, ref) => (
    <h3 
      ref={ref} 
      className={cn(
        "font-semibold leading-tight tracking-tight",
        titleSizeMap[size],
        className
      )} 
      {...props} 
    />
  )
);
CardTitle.displayName = "CardTitle";

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "default" | "md" | "lg";
}

const contentPaddingMap = {
  none: "",
  sm: "p-2 sm:p-3",
  default: "p-4 pt-0 sm:p-5 sm:pt-0",
  md: "p-5 pt-0 sm:p-6 sm:pt-0",
  lg: "p-6 pt-0 sm:p-8 sm:pt-0",
};

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding = "default", ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(contentPaddingMap[padding], className)} 
      {...props} 
    />
  )
);
CardContent.displayName = "CardContent";

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: "xs" | "sm" | "default";
}

const descriptionSizeMap = {
  xs: "text-xs",
  sm: "text-xs sm:text-sm",
  default: "text-sm sm:text-base",
};

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, size = "default", ...props }, ref) => (
    <p 
      ref={ref} 
      className={cn(
        "text-muted-foreground leading-relaxed",
        descriptionSizeMap[size],
        className
      )} 
      {...props} 
    />
  )
);
CardDescription.displayName = "CardDescription";

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "default" | "md";
}

const footerPaddingMap = {
  none: "",
  sm: "p-2 sm:p-3",
  default: "p-4 pt-0 sm:p-5 sm:pt-0",
  md: "p-5 pt-0 sm:p-6 sm:pt-0",
};

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, padding = "default", ...props }, ref) => (
    <div 
      ref={ref} 
      className={cn(
        "flex items-center",
        footerPaddingMap[padding],
        className
      )} 
      {...props} 
    />
  )
);
CardFooter.displayName = "CardFooter";
