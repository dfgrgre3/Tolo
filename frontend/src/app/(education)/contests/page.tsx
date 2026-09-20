import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "المسابقات | منصة ثنائي",
  description: "تصفح تحديات المملكة وشارك في المسابقات الدراسية.",
};

export default function ContestsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16 text-center">
      <h1 className="text-4xl font-black mb-4">تحديات المملكة</h1>
      <p className="text-gray-500 mb-8">
        المسابقات التفصيلية تُعرض داخل ساحة الإعلانات. أنشئ تحديًا جديدًا أو
        تصفح البلاغات الملكية.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          href="/contests/new"
          className="px-6 py-3 rounded-2xl bg-black text-white font-bold dark:bg-white dark:text-black"
        >
          إنشاء تحدي جديد
        </Link>
        <Link
          href="/announcements"
          className="px-6 py-3 rounded-2xl border border-black/10 font-bold"
        >
          ساحة الإعلانات
        </Link>
      </div>
    </main>
  );
}
