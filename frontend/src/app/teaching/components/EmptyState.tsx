"use client";

import React from "react";
import { FolderOpen, LucideIcon } from "lucide-react";
import { EmptyState as CanonicalEmptyState } from "@/components/ui/empty-state";

// NOTE (B-11): thin delegate — keeps the historic default-export + prop shape
// (`title/description/actionText/onAction/icon`) so existing call sites are
// untouched, while the markup lives once in components/ui/empty-state.

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: LucideIcon;
}

export default function EmptyState({
  title,
  description,
  actionText,
  onAction,
  icon = FolderOpen,
}: EmptyStateProps) {
  return (
    <CanonicalEmptyState
      title={title}
      description={description}
      actionText={actionText}
      onAction={onAction}
      icon={icon}
    />
  );
}
