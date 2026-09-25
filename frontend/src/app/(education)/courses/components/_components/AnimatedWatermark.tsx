import { cn } from "@/lib/utils";

interface StaticWatermarkProps {
  text: string;
  positionClass: string | undefined;
}

// اسم موحد: علامة مائية ثابتة — بدون "use client" (مكون ثابت خالص يُرسم
// من الخادم) وبدون backdrop-blur (فلتر ثقيل على الـ GPU) وبدون أي أنيميشن.
export function StaticWatermark({ text, positionClass }: StaticWatermarkProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-20 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-bold text-white/40",
        positionClass
      )}
    >
      {text}
    </div>
  );
}

// alias للتوافق مع الاستيرادات القديمة.
export { StaticWatermark as AnimatedWatermark };
