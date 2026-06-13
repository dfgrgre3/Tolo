"use client";

import React from "react";
import { m } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Award,
  Download,
  ExternalLink,
  User,
  Calendar,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MyCourse } from "../types";

interface CertificateCardProps {
  course: MyCourse;
  index: number;
}

export const CertificateCard = React.memo(function CertificateCard({
  course,
  index
}: CertificateCardProps) {
  const router = useRouter();

  const issuedDate = React.useMemo(() => {
    if (!course.certificate) return "";
    return new Date(course.certificate.issuedAt).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [course.certificate]);

  if (!course.certificate) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative flex flex-col rounded-3xl border bg-white dark:bg-gray-900/80 border-gray-200 dark:border-white/[0.06] overflow-hidden transition-all duration-300",
        "hover:shadow-2xl hover:shadow-primary/5 hover:border-amber-500/30"
      )}
    >
      {/* Top Accent Card Style */}
      <div className="relative h-36 bg-gradient-to-br from-amber-500/10 via-primary/5 to-transparent flex items-center justify-center border-b border-gray-100 dark:border-white/5">
        <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-0.5 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>موثقة</span>
        </div>

        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white dark:bg-gray-800 shadow-lg border border-gray-100 dark:border-white/10 transition-transform group-hover:scale-110 duration-300">
          <Award className="h-8 w-8 text-amber-500" />
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-6 gap-4">
        <div className="space-y-2">
          <h3 className="line-clamp-2 text-lg font-bold text-gray-900 dark:text-white group-hover:text-amber-500 transition-colors">
            {course.title}
          </h3>

          <div className="flex flex-col gap-1.5 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-gray-400" />
              <span>المحاضر: {course.instructor}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <span>تاريخ الإصدار: {issuedDate}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-white/5 mt-auto">
          <Button
            className="flex-1 gap-2 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20"
            onClick={() => router.push(`/certificates/${course.certificate!.id}`)}
          >
            <ExternalLink className="h-4 w-4" />
            <span>عرض الشهادة</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-xl border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5"
            onClick={() => window.open(`/api/certificates/${course.certificate!.id}/pdf`, "_blank")}
            title="تحميل PDF"
          >
            <Download className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          </Button>
        </div>
      </div>
    </m.div>
  );
});
