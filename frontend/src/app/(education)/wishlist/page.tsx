"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { m } from "framer-motion";
import { Loader2, Heart, Trash2, ArrowLeft, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

type WishlistItem = {
  id: string;
  subjectId: string;
  subject: {
    id: string;
    name: string;
    nameAr?: string | null;
    price: number;
    thumbnailUrl?: string | null;
    instructorName?: string | null;
    rating?: number;
  };
};

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wishlist");
      if (res.ok) {
        const data = await res.json();
        const payload = data.data || data;
        setItems(payload.items || []);
      }
    } catch {
      // silently handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (subjectId: string) => {
    setBusy((prev) => ({ ...prev, [subjectId]: true }));
    try {
      const res = await fetch(`/api/courses/${subjectId}/wishlist`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.subjectId !== subjectId));
        toast.success("تمت الإزالة من المفضلة");
      } else {
        toast.error("فشلت الإزالة");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setBusy((prev) => ({ ...prev, [subjectId]: false }));
    }
  };

  const handleAddToCart = async (subjectId: string) => {
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId }),
      });
      if (res.ok) {
        toast.success("تمت الإضافة للسلة");
      } else {
        toast.error("فشلت الإضافة للسلة");
      }
    } catch {
      toast.error("حدث خطأ");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10" dir="rtl">
      <h1 className="mb-8 flex items-center gap-3 text-2xl font-black text-gray-900 dark:text-white">
        <Heart className="h-7 w-7 fill-rose-500 text-rose-500" />
        المفضلة
      </h1>

      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center dark:border-white/10">
          <Heart className="mx-auto mb-4 h-14 w-14 text-gray-300" />
          <p className="text-lg font-bold text-gray-500">مفضلتك فارغة</p>
          <Link href="/courses" className="mt-4 inline-flex items-center gap-2 text-primary font-bold">
            تصفح الدورات <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <m.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/[0.06] dark:bg-gray-900/70"
            >
              <Link href={`/courses/${item.subjectId}`} className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                {item.subject?.thumbnailUrl && (
                  <Image src={item.subject.thumbnailUrl} alt={item.subject.name} fill className="object-cover" />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/courses/${item.subjectId}`} className="line-clamp-1 font-bold text-gray-900 dark:text-white">
                  {item.subject?.nameAr || item.subject?.name}
                </Link>
                <p className="text-sm font-black text-primary">
                  {(item.subject?.price || 0).toLocaleString("ar-EG")} ج.م
                </p>
              </div>
              <button
                onClick={() => handleAddToCart(item.subjectId)}
                className="text-gray-400 transition-colors hover:text-primary"
                aria-label="أضف للسلة"
              >
                <ShoppingCart className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleRemove(item.subjectId)}
                disabled={busy[item.subjectId]}
                className="text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50"
                aria-label="حذف"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </m.div>
          ))}
        </div>
      )}
    </div>
  );
}
