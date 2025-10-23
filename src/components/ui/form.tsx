import React from "react";
import { useFormContext, Controller } from "react-hook-form";

export function Form({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) {
  return <form {...props}>{children}</form>;
}

export function FormField({ name, control, render }: { name: string; control: any; render: any }) {
  return <Controller name={name} control={control} render={render} />;
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
