import React from "react";
import { FormProvider, Controller, ControllerProps, FieldValues, Path } from "react-hook-form";

const Form = FormProvider;

export { Form };

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends Path<TFieldValues> = Path<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) {
  return <Controller {...props} />;
}

export function FormItem({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className || "space-y-2 w-full"} {...props}>{children}</div>;
}

export function FormLabel({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`${className || "font-medium text-sm block leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"}`}
      {...props}
    >
      {children}
    </label>
  );
}

export function FormControl({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className || "w-full"} {...props}>{children}</div>;
}

export function FormMessage({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return children ? <p className={`${className || "text-red-500 text-xs sm:text-sm mt-1"}`} {...props}>{children}</p> : null;
}

export function FormDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return children ? <p className={`${className || "text-muted-foreground text-xs sm:text-sm mt-1"}`} {...props}>{children}</p> : null;
}

// New: Responsive form section with grid layout for multiple fields
export function FormSection({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={className || "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"}
      {...props}
    >
      {children}
    </div>
  );
}
