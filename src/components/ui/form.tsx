import React from "react";
import { useFormContext, Controller, ControllerProps, FieldValues, Path } from "react-hook-form";

export function Form({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) {
  return <form {...props}>{children}</form>;
}

export function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends Path<TFieldValues> = Path<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) {
  return <Controller {...props} />;
}

export function FormItem({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className || "space-y-2"} {...props}>{children}</div>;
}

export function FormLabel({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`${className || "font-medium"}`} {...props}>{children}</label>;
}

export function FormControl({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={className} {...props}>{children}</div>;
}

export function FormMessage({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return children ? <p className={`${className || "text-red-500 text-sm"}`} {...props}>{children}</p> : null;
}

export function FormDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return children ? <p className={`${className || "text-muted-foreground text-sm"}`} {...props}>{children}</p> : null;
}
