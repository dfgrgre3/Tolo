"use client";

import { m, AnimatePresence } from "framer-motion";
import { X, Award, ShieldCheck, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  courseTitle: string;
  instructorName: string;
}

export function CertificatePreviewModal({
  isOpen,
  onClose,
  studentName,
  courseTitle,
  instructorName,
}: CertificatePreviewModalProps) {
  const currentDate = new Date().toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-4xl bg-white dark:bg-[#11131C] rounded-[24px] border border-gray-200 dark:border-white/[0.08] shadow-2xl overflow-hidden z-10 p-6 sm:p-8"
            dir="rtl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 start-4 p-2 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="mb-6 text-start">
              <span className="flex items-center gap-2 text-primary font-bold text-sm">
                <Award className="h-5 w-5" />
                <span>شهادة إتمام تفاعلية</span>
              </span>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
                معاينة شهادة التخرج الخاصة بك
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                احصل على هذه الشهادة المعتمدة فور إكمال جميع دروس واختبارات الدورة بنجاح.
              </p>
            </div>

            {/* Certificate Frame */}
            <div className="relative border-8 border-amber-500/20 dark:border-amber-500/10 rounded-2xl p-6 sm:p-10 bg-gradient-to-br from-amber-500/[0.02] via-transparent to-primary/[0.01] overflow-hidden shadow-inner">
              {/* Decorative corners */}
              <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-amber-500/40 rounded-tr-lg" />
              <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-amber-500/40 rounded-tl-lg" />
              <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-amber-500/40 rounded-br-lg" />
              <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-amber-500/40 rounded-bl-lg" />

              {/* Watermark Logo background */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <Award className="w-[300px] h-[300px]" />
              </div>

              {/* Certificate Content */}
              <div className="text-center space-y-6">
                <div className="flex justify-center mb-2">
                  <div className="h-16 w-16 bg-amber-500/10 dark:bg-amber-500/20 rounded-full flex items-center justify-center text-amber-500 border border-amber-500/30">
                    <Award className="h-8 w-8" />
                  </div>
                </div>

                <h4 className="text-xs font-bold tracking-widest text-amber-600 dark:text-amber-500 uppercase">
                  شهادة إكمال دورة تعليمية
                </h4>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  تشهد إدارة المنصة بأن الطالب / الطالبة:
                </p>

                <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white underline decoration-amber-500/40 decoration-wavy underline-offset-8">
                  {studentName || "طالب متفوق"}
                </h2>

                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                  قد أتم بنجاح وبأداء متميز متطلبات الدورة التدريبية الشاملة بعنوان:
                </p>

                <h3 className="text-xl sm:text-2xl font-black text-primary">
                  {courseTitle}
                </h3>

                <p className="text-xs text-gray-400 dark:text-gray-500">
                  تحت إشراف المعلم القدير: <strong className="text-gray-700 dark:text-gray-300 font-bold">{instructorName}</strong>
                </p>

                {/* Footer signatures & Badges */}
                <div className="grid grid-cols-3 gap-4 items-end pt-6 border-t border-gray-200/50 dark:border-white/5 mt-8">
                  <div className="text-start">
                    <p className="text-[10px] text-gray-400">تاريخ الإصدار</p>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">{currentDate}</p>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center">
                    <ShieldCheck className="h-8 w-8 text-emerald-500 mb-1" />
                    <span className="text-[9px] font-bold text-emerald-500 tracking-wider">آمن ومعتمد</span>
                  </div>

                  <div className="text-left">
                    <p className="text-[10px] text-gray-400">توقيع الموجه العام</p>
                    <div className="font-serif italic text-amber-600/80 text-sm mt-1 select-none">
                      {instructorName.split(" ").slice(0, 2).join(" ")}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 mt-6">
              <p className="text-xs text-gray-400 max-w-sm">
                * هذه معاينة تفاعلية فقط. سيتم تفعيل خيار التحميل الفعلي بصيغة PDF فور إتمامك للدورة بنسبة 100%.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => window.print()}
                  className="rounded-xl border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 font-bold text-xs gap-1.5 h-10"
                >
                  <Printer className="h-4 w-4" />
                  <span>طباعة الشهادة</span>
                </Button>
                <Button
                  disabled
                  className="rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 cursor-not-allowed font-bold text-xs gap-1.5 h-10"
                >
                  <Download className="h-4 w-4" />
                  <span>تحميل PDF</span>
                </Button>
              </div>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
