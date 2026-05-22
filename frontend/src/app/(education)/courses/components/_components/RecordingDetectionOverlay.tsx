"use client";

import { AnimatePresence, m } from "framer-motion";
import { Lock } from "lucide-react";

interface RecordingDetectionOverlayProps {
  isDetected: boolean;
}

export function RecordingDetectionOverlay({ isDetected }: RecordingDetectionOverlayProps) {
  return (
    <AnimatePresence>
      {isDetected && (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center text-center p-8"
        >
          <div className="space-y-4">
            <Lock className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
            <h3 className="text-2xl font-bold text-white">حماية المحتوى نشطة</h3>
            <p className="text-gray-400 max-w-md">
              يرجى العودة إلى نافذة المتصفح للمتابعة. يمنع تسجيل الشاشة أو تصوير المحتوى حرصاً على حقوق المنصة.
            </p>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
