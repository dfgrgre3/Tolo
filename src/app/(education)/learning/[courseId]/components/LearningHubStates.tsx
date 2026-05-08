"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface LearningHubErrorProps {
  courseId: string;
}

export function LearningHubError({ courseId }: LearningHubErrorProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffdf9] dark:bg-[#09090b]">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 text-center dark:border-white/10 dark:bg-slate-950/70">
        <h2 className="text-2xl font-black">تعذر فتح الدرس الحالي</h2>
        <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400">
          قد تكون الدورة فارغة أو أن تحميل المحتوى لم يكتمل.
        </p>
        <Button
          className="mt-6 rounded-2xl bg-orange-500 text-white hover:bg-orange-600"
          onClick={() => router.push(`/courses/${courseId}`)}
        >
          العودة إلى صفحة الدورة
        </Button>
      </div>
    </div>
  );
}

export function LearningHubLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffdf9] dark:bg-[#09090b]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-orange-500/20" />
          <div className="absolute inset-0 animate-spin rounded-full border-t-2 border-orange-500" />
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          جارٍ تجهيز بيئة التعلّم...
        </p>
      </div>
    </div>
  );
}
