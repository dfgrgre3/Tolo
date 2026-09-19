import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * Rendered when a course slug does not resolve (unknown slug, deleted course,
 * or a draft that is not public). The server component calls notFound(), which
 * makes this a real HTTP 404 rather than a soft "not found" 200 page.
 */
export default function CourseNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0D14] flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <ChevronLeft className="h-16 w-16 text-gray-300 mx-auto" />
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">
          لم يتم العثور على الدورة
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          رابط الدورة غير صحيح أو لم تعد الدورة متاحة على المنصة.
        </p>
        <Link href="/courses">
          <span className="mt-4 inline-block bg-primary text-white px-4 py-2 rounded-lg font-bold">
            العودة إلى الدورات
          </span>
        </Link>
      </div>
    </div>
  );
}
