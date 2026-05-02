"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminButton } from "./admin-button";
import { AlertTriangle, Info, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive" | "premium" | "success" | "warning";
  loading?: boolean;
}

export function AdminConfirm({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "تأكيد",
  cancelText = "إلغاء",
  onConfirm,
  variant = "default",
  loading = false,
}: AdminConfirmProps) {
  const Icon = variant === "destructive" ? Trash2 : 
                variant === "warning" ? AlertTriangle :
                variant === "success" ? CheckCircle2 : Info;

  const colorClass = variant === "destructive" ? "text-destructive" :
                    variant === "premium" ? "text-amber-500" :
                    variant === "success" ? "text-green-500" :
                    variant === "warning" ? "text-yellow-500" : "text-primary";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-[2rem] border-white/10 bg-card/95 backdrop-blur-xl max-w-md">
        <AlertDialogHeader className="space-y-4">
          <div className={cn("mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5 border border-white/5", colorClass)}>
            <Icon className="h-8 w-8" />
          </div>
          <AlertDialogTitle className="text-center text-2xl font-black tracking-tight">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-muted-foreground font-medium px-4">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-8 flex-col-reverse sm:flex-row gap-3 sm:gap-0">
          <AlertDialogCancel asChild>
            <AdminButton variant="outline" className="rounded-2xl h-12 flex-1">
              {cancelText}
            </AdminButton>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <AdminButton
              variant={variant === "premium" ? "premium" : variant === "destructive" ? "destructive" : "default"}
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
              loading={loading}
              className="rounded-2xl h-12 flex-1"
            >
              {confirmText}
            </AdminButton>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
