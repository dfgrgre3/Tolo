import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "تفاصيل التحدي | منصة ثنائي",
  description: "صفحة تحدي داخل ساحة الإعلانات.",
};

export default async function ContestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id?.trim()) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <p className="text-xs font-bold text-gray-400 mb-2">رقم التحدي: {id}</p>
      <h1 className="text-3xl font-black mb-4">تفاصيل التحدي</h1>
      <p className="text-gray-500 mb-8">
        التفاصيل الكاملة لهذا التحدي تُعرض داخل ساحة الإعلانات.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          href="/announcements"
          className="px-6 py-3 rounded-2xl bg-black text-white font-bold dark:bg-white dark:text-black"
        >
          خوض التحدي من الساحة
        </Link>
        <Link
          href="/contests"
          className="px-6 py-3 rounded-2xl border border-black/10 font-bold"
        >
          كل التحديات
        </Link>
      </div>
    </main>
  );
}
