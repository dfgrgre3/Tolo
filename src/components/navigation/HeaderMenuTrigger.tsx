"use client";

import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { triggerStyles } from "./navigationTokens";

interface HeaderMenuTriggerProps {
  label: string;
  isOpen?: boolean;
  onClick: () => void;
  className?: string;
  badge?: string;
}

export function HeaderMenuTrigger({ label, isOpen = false, onClick, className, badge }: HeaderMenuTriggerProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(triggerStyles({ variant: "header", open: isOpen, size: "header" }), className)}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-label={`${label} - ${isOpen ? "مفتوح" : "مغلق"}`}
    >
      <span className="font-medium">{label}</span>
      <ChevronDown className={cn("h-4 w-4 transition-all duration-300", isOpen && "rotate-180")} aria-hidden="true" />
      {badge && (
        <span className="absolute -top-1 -right-1 h-4 px-2 bg-primary text-black text-[9px] font-black italic rounded-full flex items-center justify-center border border-black shadow-[0_0_10px_rgba(var(--primary),0.5)]">
          {badge}
        </span>
      )}
      {isOpen && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full"
          layoutId={`menu-trigger-indicator-${label}`}
          initial={false}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          aria-hidden="true"
        />
      )}
    </Button>
  );
}

