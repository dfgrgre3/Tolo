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

export function FormItem({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2">{children}</div>;
}

export function FormLabel({ children }: { children: React.ReactNode }) {
  return <label className="font-medium">{children}</label>;
}

export function FormControl({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function FormMessage({ children }: { children?: React.ReactNode }) {
  return children ? <p className="text-red-500 text-sm">{children}</p> : null;
}
