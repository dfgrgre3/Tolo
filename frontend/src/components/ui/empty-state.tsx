import React, { isValidElement, createElement } from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// NOTE (B-11): canonical empty-state. Five module-specific variants
// (teaching, jobs, billing, support, ai) used to duplicate this markup with
// slightly different prop names; they are now thin delegates below-compatible
// wrappers so every empty surface shares one anatomy: icon + title +
// description + optional action. New code: import THIS, not a module variant.
// Intentionally NO "use client" — pure presentational, server-safe.

export type EmptyStateIcon =
  | LucideIcon
  | React.ComponentType<{ className?: string }>
  | React.ReactNode;

export interface CanonicalEmptyStateProps {
  title: string;
  description?: string;
  /** Icon component (LucideIcon) or a ready-made node. Defaults to Inbox. */
  icon?: EmptyStateIcon;
  /** Rich action (e.g. <Button>). Takes precedence over actionText/onAction. */
  action?: React.ReactNode;
  /** Convenience shorthand: renders a Button wired to onAction. */
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

function renderIcon(icon: EmptyStateIcon) {
  if (isValidElement(icon)) return icon;
  const Icon = (icon ?? Inbox) as React.ComponentType<{ className?: string }>;
  return <Icon className="h-8 w-8" />;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  actionText,
  onAction,
  className,
}: CanonicalEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 px-6 py-12 text-center backdrop-blur-sm",
        className,
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        {renderIcon(icon ?? Inbox)}
      </div>
      <h3 className="mb-2 text-lg font-bold text-foreground">{title}</h3>
      {description ? (
        <p className="mb-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ??
        (actionText && onAction ? (
          <Button
            onClick={onAction}
            className="bg-primary font-medium text-white hover:bg-primary/90"
          >
            {actionText}
          </Button>
        ) : null)}
    </div>
  );
}
