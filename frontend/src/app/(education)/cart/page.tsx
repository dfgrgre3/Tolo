"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ShoppingCart, Trash2, Tag, ArrowLeft, CheckCircle2, XCircle, Wallet, CreditCard, Smartphone, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/api-client";
import {
  addCartItem,
  calcCartTotals,
  checkoutCart,
  clearCartItems,
  emitCartUpdated,
  fetchCart,
  removeCartItem,
  type CartCoupon,
  type CartItem,
} from "@/features/cart";
import { fetchWalletBalance } from "@/features/payments";
import {
  getFawryCode,
  resolvePaymentAction,
  validateCoupon,
  type PaymentMethod,
} from "@/features/payments";


function navigate(url: string): void {
  window.location.href = url;
}

const PAYMENT_METHODS: { method: PaymentMethod; label: string; sub: string; icon: typeof Wallet }[] = [
  { method: "internal_wallet", label: "الدفع من المحفظة", sub: "استخدم رصيدك داخل المنصة", icon: Wallet },
  { method: "card", label: "الدفع بالبطاقة", sub: "Visa / Mastercard / Meeza", icon: CreditCard },
  { method: "wallet", label: "محفظة موبايل (فودافون كاش وغيرها)", sub: "Vodafone Cash والمحافظ المدعومة", icon: Smartphone },
  { method: "fawry", label: "فوري", sub: "كود دفع نقدي عبر منافذ فوري", icon: Banknote },
];

function CartItemSkeleton() {
  return (
    <div role="status" aria-label="جاري تحميل السلة…" className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/[0.06] dark:bg-gray-900/70">
      <div className="h-20 w-28 shrink-0 rounded-xl bg-gray-100 dark:bg-gray-800" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="h-5 w-16 rounded bg-gray-100 dark:bg-gray-800" />
    </div>
  );
}

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<Record<string, boolean>>({});
  const [clearing, setClearing] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CartCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [checkingOutMethod, setCheckingOutMethod] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const loadCart = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const list = await fetchCart();
      setItems(list);
      emitCartUpdated(list.length);
    } catch {
      if (!silent) toast.error("تعذر تحميل السلة — تحقق من الاتصال");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching external data on mount/param change; setState in async callback is intentional sync
    loadCart();
    // رصيد المحفظة للتحقق المسبق قبل الدفع الداخلي (أفضل جهد — يبقى صامتاً عند الفشل)
    fetchWalletBalance()
      .then((w) => {
        const b = typeof w?.balance === "number" ? w.balance : Number(w?.balance);
        if (Number.isFinite(b) && (b as number) >= 0) setWalletBalance(b as number);
      })
      .catch(() => {});
  }, [loadCart]);

  const handleRemove = async (subjectId: string) => {
    setRemoving((prev) => ({ ...prev, [subjectId]: true }));
    const snapshot = items;
    setItems((prev) => prev.filter((item) => (item.subjectId || item.id) !== subjectId));
    try {
      await removeCartItem(subjectId);
      emitCartUpdated(Math.max(0, snapshot.length - 1));
      toast.success("تم الحذف من السلة — تراجع؟", {
        action: {
          label: "تراجع",
          onClick: async () => {
            try {
              await addCartItem(subjectId);
              loadCart(true);
            } catch {
              toast.error("تعذر التراجع");
            }
          },
        },
      });
    } catch {
      setItems(snapshot);
      toast.error("فشل الحذف");
    } finally {
      setRemoving((prev) => ({ ...prev, [subjectId]: false }));
    }
  };

  const handleClearAll = async () => {
    if (items.length === 0 || clearing) return;
    setClearing(true);
    try {
      await clearCartItems(items);
      setItems([]);
      emitCartUpdated(0);
      toast.success("تم إفراغ السلة");
    } catch {
      toast.error("تعذر إفراغ السلة");
      loadCart(true);
    } finally {
      setClearing(false);
    }
  };

  const { rawTotal, discountAmount, finalTotal } = calcCartTotals(items, coupon);

  const handleValidateCoupon = async () => {
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    setCouponError(null);
    try {
      const result = await validateCoupon(couponInput, rawTotal);
      if (result.valid) {
        setCoupon({
          code: couponInput.trim().toUpperCase(),
          discountType: result.discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
          discount: Number(result.discount ?? result.discountAmount ?? 0) || 0,
          message: result.message || "تم تطبيق الخصم",
        });
        toast.success(result.message || "تم تطبيق الخصم");
      } else {
        setCoupon(null);
        setCouponError(result.message || "كود الخصم غير صالح");
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

  const handleCheckout = async (paymentMethod: PaymentMethod) => {
    if (paymentMethod === "internal_wallet" && walletBalance !== null && walletBalance < finalTotal) {
      toast.error("رصيد محفظتك غير كافٍ — اشحن رصيدك أو اختر وسيلة دفع أخرى");
      return;
    }
    setCheckingOutMethod(paymentMethod);
    try {
      const payload = await checkoutCart(
        paymentMethod,
        coupon?.code || undefined
      );
      const action = resolvePaymentAction(paymentMethod, payload);
      switch (action.kind) {
        case "redirect":
        case "iframe":
        case "wallet":
          navigate(action.url);
          return;
        case "fawry-code":
          toast.success(`كود فوري الخاص بك: ${action.code}`);
          return;
        case "success":
          toast.success("تم الشراء بنجاح!");
          router.push("/courses");
          return;
        case "pending": {
          const code = getFawryCode(payload);
          if (code) {
            toast.success(`كود فوري الخاص بك: ${code}`);
            return;
          }
          toast.success("تم الشراء بنجاح!");
          router.push("/courses");
          return;
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        toast.error("سجّل الدخول أولاً لإتمام الشراء");
        router.push("/login?redirect=/cart");
      } else if (error instanceof ApiError && error.status === 409) {
        toast.error(error.message || "أنت مسجّل بالفعل في إحدى دورات السلة");
        loadCart(true);
      } else if (error instanceof ApiError) {
        toast.error(error.message || "فشلت عملية الدفع، حاول مرة أخرى");
      } else {
        toast.error("حدث خطأ أثناء الدفع، تحقق من اتصالك وحاول مرة أخرى");
      }
    } finally {
      setCheckingOutMethod(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10" dir="rtl">
      <div className="mb-8 flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-black text-gray-900 dark:text-white">
          <ShoppingCart className="h-7 w-7" />
          سلة التسوق
          {items.length > 0 && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
              {items.length.toLocaleString("ar-EG")}
            </span>
          )}
        </h1>
        {items.length > 0 && !loading && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClearAll}
            disabled={clearing}
            className="gap-2 text-sm font-bold text-red-500 hover:text-red-600"
          >
            {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            إفراغ السلة
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3" role="status" aria-label="جاري تحميل السلة…">
          <div className="space-y-4 lg:col-span-2">
            {[1, 2].map((i) => (
              <CartItemSkeleton key={i} />
            ))}
          </div>
          <div className="h-64 rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center dark:border-white/10">
          <ShoppingCart className="mx-auto mb-4 h-14 w-14 text-gray-300" />
          <p className="text-lg font-bold text-gray-500">سلتك فارغة — ابدأ التعلم الآن</p>
          <Link href="/courses" className="mt-4 inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-primary px-8 text-base font-extrabold text-white">
            تصفح الدورات <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-white/[0.06] dark:bg-gray-900/70"
              >
                <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                  {item.subject?.thumbnailUrl && (
                    <Image src={item.subject.thumbnailUrl} alt={item.subject.name} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
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
              </div>
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
              <p className="text-xs font-black text-gray-500">اختر طريقة الدفع المناسبة:</p>
              {walletBalance !== null && walletBalance < finalTotal && (
                <p className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  رصيد محفظتك ({walletBalance.toLocaleString("ar-EG")} ج.م) غير كافٍ للدفع الداخلي — اشحن رصيدك أو اختر وسيلة أخرى
                </p>
              )}
              {PAYMENT_METHODS.map(({ method, label, sub, icon: Icon }) => (
                <Button
                  key={method}
                  onClick={() => handleCheckout(method)}
                  disabled={checkingOutMethod !== null}
                  variant={method === "internal_wallet" ? "default" : "outline"}
                  className="h-auto w-full gap-3 rounded-xl px-4 py-3 font-bold"
                >
                  {checkingOutMethod === method ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Icon className="h-5 w-5 shrink-0" />
                  )}
                  <span className="flex flex-1 flex-col items-start gap-0.5">
                    <span className="text-sm">{label}</span>
                    <span className="text-[11px] font-medium opacity-60">{sub}</span>
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
