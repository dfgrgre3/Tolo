"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { m } from "framer-motion";
import { Loader2, ShoppingCart, Trash2, Tag, ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type CartItem = {
  id: string;
  subjectId: string;
  subject: {
    id: string;
    name: string;
    nameAr?: string | null;
    price: number;
    thumbnailUrl?: string | null;
    instructorName?: string | null;
  };
};

type CouponState = {
  code: string;
  discountType: string;
  discount: number;
  message: string;
} | null;

const PAYMENT_METHODS = [
  { method: "internal_wallet", label: "الدفع من المحفظة" },
  { method: "card", label: "الدفع بالبطاقة" },
  { method: "wallet", label: "محفظة موبايل (فودافون كاش وغيرها)" },
  { method: "fawry", label: "فوري" },
];

function CartItemSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/[0.06] dark:bg-gray-900/70">
      <div className="h-20 w-28 shrink-0 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="h-5 w-16 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<Record<string, boolean>>({});
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponState>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [checkingOutMethod, setCheckingOutMethod] = useState<string | null>(null);

  const fetchCart = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart");
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
    fetchCart();
  }, []);

  const handleRemove = async (subjectId: string) => {
    setRemoving((prev) => ({ ...prev, [subjectId]: true }));
    try {
      const res = await fetch(`/api/cart/items/${subjectId}`, { method: "DELETE" });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.subjectId !== subjectId));
        toast.success("تم الحذف من السلة");
      } else {
        toast.error("فشل الحذف");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setRemoving((prev) => ({ ...prev, [subjectId]: false }));
    }
  };

  const rawTotal = items.reduce((sum, item) => sum + (item.subject?.price || 0), 0);
  const discountAmount = coupon
    ? coupon.discountType === "PERCENTAGE"
      ? rawTotal * (coupon.discount / 100)
      : coupon.discount
    : 0;
  const finalTotal = Math.max(0, rawTotal - discountAmount);

  const handleValidateCoupon = async () => {
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim() }),
      });
      const data = await res.json();
      const payload = data.data || data;
      if (payload.valid) {
        setCoupon({
          code: couponInput.trim(),
          discountType: payload.discountType,
          discount: Number(payload.discount) || 0,
          message: payload.message,
        });
        toast.success(payload.message || "تم تطبيق الخصم");
      } else {
        setCoupon(null);
        setCouponError(payload.message || "كود الخصم غير صالح");
      }
    } catch {
      setCouponError("تعذّر التحقق من الكود، حاول مرة أخرى");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const clearCoupon = () => {
    setCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  const handleCheckout = async (paymentMethod: string) => {
    setCheckingOutMethod(paymentMethod);
    try {
      const res = await fetch("/api/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethod, couponCode: coupon?.code || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        const payload = data.data || data;
        if (payload.redirectUrl) {
          window.location.href = payload.redirectUrl;
          return;
        }
        if (payload.paymentKey && payload.iframeId) {
          window.location.href = `https://accept.paymob.com/api/acceptance/iframes/${payload.iframeId}?payment_token=${payload.paymentKey}`;
          return;
        }
        toast.success("تم الشراء بنجاح!");
        router.push("/courses");
      } else if (res.status === 401) {
        toast.error("سجّل الدخول أولاً لإتمام الشراء");
        router.push("/login?redirect=/cart");
      } else if (res.status === 409) {
        toast.error(data.error || "أنت مسجّل بالفعل في إحدى دورات السلة");
        fetchCart();
      } else {
        toast.error(data.error || "فشلت عملية الدفع، حاول مرة أخرى");
      }
    } catch {
      toast.error("حدث خطأ أثناء الدفع، تحقق من اتصالك وحاول مرة أخرى");
    } finally {
      setCheckingOutMethod(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10" dir="rtl">
      <h1 className="mb-8 flex items-center gap-3 text-2xl font-black text-gray-900 dark:text-white">
        <ShoppingCart className="h-7 w-7" />
        سلة التسوق
      </h1>

      {loading ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {[1, 2].map((i) => (
              <CartItemSkeleton key={i} />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center dark:border-white/10">
          <ShoppingCart className="mx-auto mb-4 h-14 w-14 text-gray-300" />
          <p className="text-lg font-bold text-gray-500">سلتك فارغة</p>
          <Link href="/courses" className="mt-4 inline-flex items-center gap-2 text-primary font-bold">
            تصفح الدورات <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => (
              <m.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/[0.06] dark:bg-gray-900/70"
              >
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                  {item.subject?.thumbnailUrl && (
                    <Image src={item.subject.thumbnailUrl} alt={item.subject.name} fill className="object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 dark:text-white">
                    {item.subject?.nameAr || item.subject?.name}
                  </p>
                  {item.subject?.instructorName && (
                    <p className="text-xs text-gray-400">{item.subject.instructorName}</p>
                  )}
                </div>
                <p className="font-black text-gray-900 dark:text-white">
                  {(item.subject?.price || 0).toLocaleString("ar-EG")} ج.م
                </p>
                <button
                  onClick={() => handleRemove(item.subjectId)}
                  disabled={removing[item.subjectId]}
                  className="text-gray-400 transition-colors hover:text-red-500 disabled:opacity-50"
                  aria-label="حذف"
                >
                  {removing[item.subjectId] ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Trash2 className="h-5 w-5" />
                  )}
                </button>
              </m.div>
            ))}
          </div>

          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 h-fit dark:border-white/[0.06] dark:bg-gray-900/70">
            <h2 className="font-bold text-gray-900 dark:text-white">ملخص الطلب</h2>

            {coupon ? (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 dark:bg-emerald-500/10">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-bold">{coupon.code}</span>
                </div>
                <button onClick={clearCoupon} className="text-xs font-bold text-gray-400 hover:text-red-500">
                  إزالة
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      setCouponError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleValidateCoupon()}
                    placeholder="كود الخصم"
                    className="h-10 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm dark:border-white/10 dark:bg-gray-800"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleValidateCoupon}
                    disabled={validatingCoupon || !couponInput.trim()}
                    className="h-10 shrink-0 rounded-xl px-4 text-xs font-bold"
                  >
                    {validatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "تحقق"}
                  </Button>
                </div>
                {couponError && (
                  <p className="flex items-center gap-1 text-xs font-bold text-red-500">
                    <XCircle className="h-3.5 w-3.5" />
                    {couponError}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1 border-t border-gray-100 pt-4 dark:border-white/5">
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">السعر قبل الخصم</span>
                  <span className="text-gray-400 line-through">{rawTotal.toLocaleString("ar-EG")} ج.م</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-500 font-bold">الخصم</span>
                  <span className="text-emerald-500 font-bold">-{discountAmount.toLocaleString("ar-EG")} ج.م</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm font-bold text-gray-500">الإجمالي</span>
                <span className="text-xl font-black text-gray-900 dark:text-white">
                  {finalTotal.toLocaleString("ar-EG")} ج.م
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {PAYMENT_METHODS.map(({ method, label }) => (
                <Button
                  key={method}
                  onClick={() => handleCheckout(method)}
                  disabled={checkingOutMethod !== null}
                  variant={method === "internal_wallet" ? "default" : "outline"}
                  className="h-12 w-full gap-2 rounded-xl font-bold"
                >
                  {checkingOutMethod === method && <Loader2 className="h-4 w-4 animate-spin" />}
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
