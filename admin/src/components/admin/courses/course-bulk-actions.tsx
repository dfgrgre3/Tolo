"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Globe,
  EyeOff,
  X,
  Download,
  Trash2,
  Power,
  AlertTriangle,
} from "lucide-react";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { cn } from "@/lib/utils";

interface CourseBulkActionsProps {
  selectedCount: number;
  onPublish: () => void;
  onUnpublish: () => void;
  onActivate: () => void;
  onDeactivate?: () => void;
  onDelete: () => void;
  onExport?: () => void;
  onClear: () => void;
  className?: string;
}

export function CourseBulkActions({
  selectedCount,
  onPublish,
  onUnpublish,
  onActivate,
  onDeactivate,
  onDelete,
  onExport,
  onClear,
  className,
}: CourseBulkActionsProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: -20, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -20, opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/[0.02] px-5 py-3.5 backdrop-blur-sm",
            className,
          )}
          dir="rtl"
        >
          {/* Selected Count */}
          <div className="flex items-center gap-2.5 pl-4 border-l border-primary/15">
            <motion.div
              key={selectedCount}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10"
            >
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </motion.div>
            <div>
              <motion.span
                key={selectedCount}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-sm font-black text-primary"
              >
                {selectedCount}
              </motion.span>
              <span className="text-xs font-bold text-muted-foreground mr-1.5">
                دورة مختارة
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-1.5 mr-auto">
            <AdminButton
              variant="outline"
              size="sm"
              className="h-8 rounded-xl text-[11px] font-black gap-1.5 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-600"
              onClick={onPublish}
            >
              <Globe className="h-3.5 w-3.5 text-emerald-500" />
              نشر
            </AdminButton>
            <AdminButton
              variant="outline"
              size="sm"
              className="h-8 rounded-xl text-[11px] font-black gap-1.5 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-600"
              onClick={onUnpublish}
            >
              <EyeOff className="h-3.5 w-3.5 text-amber-500" />
              إخفاء
            </AdminButton>
            <AdminButton
              variant="outline"
              size="sm"
              className="h-8 rounded-xl text-[11px] font-black gap-1.5 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-600"
              onClick={onActivate}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
              تفعيل
            </AdminButton>
            {onDeactivate && (
              <AdminButton
                variant="outline"
                size="sm"
                className="h-8 rounded-xl text-[11px] font-black gap-1.5 border-slate-500/20 hover:bg-slate-500/10"
                onClick={onDeactivate}
              >
                <Power className="h-3.5 w-3.5 text-slate-500" />
                إيقاف
              </AdminButton>
            )}

            <div className="h-6 w-px bg-border/40 mx-1" />

            {onExport && (
              <AdminButton
                variant="ghost"
                size="sm"
                className="h-8 rounded-xl text-[11px] font-bold gap-1.5"
                onClick={onExport}
              >
                <Download className="h-3.5 w-3.5" />
                تصدير
              </AdminButton>
            )}

            <AdminButton
              variant="outline"
              size="sm"
              className="h-8 rounded-xl text-[11px] font-black gap-1.5 border-red-500/20 text-red-500 hover:bg-red-500/10 hover:text-red-600"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </AdminButton>

            <div className="h-6 w-px bg-border/40 mx-1" />

            <AdminButton
              variant="ghost"
              size="sm"
              className="h-8 rounded-xl text-[11px] font-bold gap-1"
              onClick={onClear}
            >
              <X className="h-3.5 w-3.5" />
              إلغاء
            </AdminButton>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
