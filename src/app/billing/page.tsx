"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BadgePercent,
  Check,
  CreditCard,
  Lock,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  description: string;
  descriptionAr: string;
  features: string[];
  featuresAr: string[];
  interval: string;
  popular?: boolean;
}

type BillingCycle = "monthly" | "yearly";
type PaymentStep = "plans" | "checkout";
type PaymentMethod = "card" | "wallet" | "internal_wallet";

const yearlyDiscount = 0.2;

const paymentOptions: Array<{
  id: PaymentMethod;
  title: string;
  subtitle: string;
  accent: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}> = [
  {
    id: "card",
    title: "بطاقة بنكية",
    subtitle: "Visa / Mastercard مع تفعيل فوري",
    accent: "from-sky-500/30 to-blue-600/10 border-sky-400/30",
    icon: CreditCard,
  },
  {
    id: "wallet",
    title: "محفظة إلكترونية",
    subtitle: "Vodafone Cash والمحافظ المدعومة عبر Paymob",
    accent: "from-emerald-500/30 to-green-600/10 border-emerald-400/30",
    icon: Smartphone,
  },
  {
    id: "internal_wallet",
    title: "رصيد الحساب",
    subtitle: "استخدم رصيدك الحالي داخل المنصة مباشرة",
    accent: "from-amber-500/30 to-orange-600/10 border-amber-400/30",
    icon: Wallet,
  },
];

function getPlanPrice(price: number, cycle: BillingCycle) {
  if (cycle === "yearly") {
    return Math.round(price * 12 * (1 - yearlyDiscount));
  }

  return price;
}

export default function BillingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [paymentStep, setPaymentStep] = useState<PaymentStep>("plans");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState<{
    discountAmount: number;
    finalAmount: number;
    description?: string;
  } | null>(null);

  useEffect(() => {
    const status = searchParams.get("status");
    const orderId = searchParams.get("order_id");

    if (status === "success") {
      toast.success("تم استلام الدفع بنجاح", {
        description: orderId ? `رقم العملية: ${orderId}` : "تم تفعيل الاشتراك أو سيتم تفعيله بعد تأكيد الدفع.",
        duration: 8000,
      });
    }

    if (status === "fail") {
      toast.error("فشلت عملية الدفع", {
        description: "أعد المحاولة أو اختر وسيلة دفع مختلفة.",
      });
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/subscriptions/plans");
        if (!res.ok) {
          throw new Error("تعذر تحميل الباقات");
        }

        const data = await res.json();
        setPlans(data);
      } catch (error: any) {
        toast.error(error.message || "تعذر تحميل الباقات");
      } finally {
        setLoading(false);
      }
    }

    fetchPlans();
  }, []);

  const selectedPlanData = useMemo(
    () => plans.find((plan) => plan.id === selectedPlan) ?? null,
    [plans, selectedPlan]
  );

  const basePrice = selectedPlanData ? getPlanPrice(selectedPlanData.price, billingCycle) : 0;
  const yearlySavings =
    selectedPlanData && billingCycle === "yearly"
      ? selectedPlanData.price * 12 - getPlanPrice(selectedPlanData.price, "yearly")
      : 0;
  const finalAmount = couponData?.finalAmount ?? basePrice;

  useEffect(() => {
    setCouponData(null);
  }, [selectedPlan, billingCycle]);

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlan(planId);
    setPaymentStep("checkout");

    try {
      await fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CHECKOUT_VISIT",
          metadata: { planId, billingCycle },
        }),
      });
    } catch {
      return;
    }
  };

  const applyCoupon = async () => {
    if (!couponCode || !selectedPlanData) return;

    setValidatingCoupon(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          amount: basePrice,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "كود الخصم غير صالح");
      }

      setCouponData(data);
      toast.success("تم تطبيق كود الخصم");
    } catch (error: any) {
      toast.error(error.message || "تعذر تطبيق كود الخصم");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const startPayment = async () => {
    if (!selectedPlan) return;

    setProcessing(true);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          billingCycle,
          paymentMethod,
          couponCode: couponData ? couponCode.trim().toUpperCase() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر بدء عملية الدفع");
      }

      if (paymentMethod === "internal_wallet" && data.success) {
        toast.success("تم تفعيل الاشتراك من رصيد الحساب");
        router.push("/subscription/success");
        return;
      }

      if (paymentMethod === "card") {
        const iframeUrl = `https://egypt.paymob.com/api/acceptance/iframes/${data.iframeId}?payment_token=${data.paymentKey}`;
        window.location.href = iframeUrl;
        return;
      }

      if (paymentMethod === "wallet" && data.paymentKey) {
        window.location.href = `https://egypt.paymob.com/api/acceptance/wallets/v1/checkout?payment_token=${data.paymentKey}`;
        return;
      }
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء تجهيز الدفع");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09111f]">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-sky-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#09111f] px-4 pb-16 pt-24 text-white" dir="rtl">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.2),transparent_50%)]" />
        <div className="absolute -left-24 top-40 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -right-12 bottom-20 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <section className="mb-10 grid gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur md:grid-cols-[1.35fr_0.95fr] md:p-8">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
              <ShieldCheck size={16} />
              دفع آمن وتفعيل سريع داخل المنصة
            </div>
            <h1 className="max-w-2xl text-4xl font-black leading-tight md:text-6xl">
              اختر الباقة المناسبة
              <span className="block bg-gradient-to-l from-cyan-300 via-white to-emerald-300 bg-clip-text text-transparent">
                وادفع بخطوات واضحة
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              صفحة الدفع الجديدة تركّز على وضوح القرار: مقارنة أسرع بين الباقات، ملخص تكلفة مباشر، وتطبيق الخصومات قبل التحويل إلى بوابة الدفع.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-200">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">تفعيل تلقائي بعد نجاح الدفع</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">خصومات وكوبونات مدعومة</div>
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2">بطاقات ومحافظ ورصيد داخلي</div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-[#07101b] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">خطوات الاشتراك</p>
                <h2 className="mt-1 text-xl font-bold">من الاختيار حتى التفعيل</h2>
              </div>
              <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
                <Sparkles size={22} />
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {[
                { index: 1, title: "اختر الباقة", active: true },
                { index: 2, title: "حدد وسيلة الدفع", active: paymentStep === "checkout" },
                { index: 3, title: "أكّد العملية", active: paymentStep === "checkout" && !!selectedPlan },
              ].map((step) => (
                <div
                  key={step.index}
                  className={`flex items-center gap-4 rounded-2xl border px-4 py-3 ${
                    step.active ? "border-cyan-400/30 bg-cyan-400/10" : "border-white/10 bg-white/5"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${
                      step.active ? "bg-cyan-300 text-slate-950" : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {step.index}
                  </div>
                  <div>
                    <p className="font-semibold">{step.title}</p>
                    <p className="text-sm text-slate-400">
                      {step.index === 1 && "قارن الأسعار والميزات قبل الانتقال للدفع"}
                      {step.index === 2 && "طبّق الكوبون واختر الوسيلة الأنسب"}
                      {step.index === 3 && "يتم التحويل مباشرة إلى بوابة الدفع أو الرصيد الداخلي"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">دورة الفوترة</p>
            <h2 className="text-2xl font-bold">اختر طريقة الحساب</h2>
          </div>

          <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-[1rem] px-5 py-3 text-sm font-bold transition ${
                billingCycle === "monthly" ? "bg-white text-slate-950" : "text-slate-300"
              }`}
            >
              شهري
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`rounded-[1rem] px-5 py-3 text-sm font-bold transition ${
                billingCycle === "yearly" ? "bg-gradient-to-l from-emerald-300 to-cyan-300 text-slate-950" : "text-slate-300"
              }`}
            >
              سنوي
              <span className="mr-2 rounded-full bg-slate-950/10 px-2 py-1 text-xs">خصم 20%</span>
            </button>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_0.9fr]">
          <div>
            <div className="grid gap-5 lg:grid-cols-3">
              {plans.map((plan, index) => {
                const isSelected = selectedPlan === plan.id;
                const displayPrice = getPlanPrice(plan.price, billingCycle);
                const oldYearlyPrice = plan.price * 12;

                return (
                  <motion.button
                    key={plan.id}
                    type="button"
                    whileHover={{ y: -6 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleSelectPlan(plan.id)}
                    className={`group relative overflow-hidden rounded-[2rem] border p-6 text-right transition ${
                      isSelected
                        ? "border-cyan-300/50 bg-gradient-to-b from-cyan-300/15 to-white/5 shadow-[0_20px_80px_rgba(34,211,238,0.18)]"
                        : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="absolute left-0 top-0 h-24 w-24 rounded-full bg-cyan-300/10 blur-3xl transition group-hover:bg-cyan-300/20" />
                    {index === 1 && (
                      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-100">
                        <Zap size={14} />
                        الأكثر توازنًا
                      </div>
                    )}

                    <h3 className="text-2xl font-black">{plan.nameAr || plan.name}</h3>
                    <p className="mt-3 min-h-14 text-sm leading-7 text-slate-300">
                      {plan.descriptionAr || plan.description}
                    </p>

                    <div className="mt-6 flex items-end gap-2">
                      <span className="text-4xl font-black">{displayPrice}</span>
                      <span className="pb-1 text-sm text-slate-400">
                        ج.م / {billingCycle === "monthly" ? "شهر" : "سنة"}
                      </span>
                    </div>

                    {billingCycle === "yearly" && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-emerald-300">
                        <BadgePercent size={14} />
                        <span>
                          بدلًا من <span className="line-through opacity-70">{oldYearlyPrice} ج.م</span>
                        </span>
                      </div>
                    )}

                    <div className="mt-6 space-y-3">
                      {(plan.featuresAr?.length ? plan.featuresAr : plan.features).map((feature, featureIndex) => (
                        <div key={`${plan.id}-${featureIndex}`} className="flex items-start gap-3 text-sm text-slate-200">
                          <div className="mt-0.5 rounded-full bg-emerald-300/15 p-1 text-emerald-300">
                            <Check size={12} />
                          </div>
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-5 text-sm">
                      <span className="text-slate-400">{isSelected ? "تم اختيار هذه الباقة" : "اختر هذه الباقة"}</span>
                      <span className="inline-flex items-center gap-2 font-bold text-white">
                        متابعة
                        <ArrowLeft size={16} />
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {paymentStep === "checkout" && selectedPlanData && (
                <motion.section
                  key="checkout-panel"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur"
                >
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-400">الباقة المحددة</p>
                      <h3 className="text-2xl font-bold">{selectedPlanData.nameAr || selectedPlanData.name}</h3>
                    </div>

                    <button
                      onClick={() => {
                        setPaymentStep("plans");
                        setCouponCode("");
                        setCouponData(null);
                      }}
                      className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
                    >
                      الرجوع لاختيار باقة أخرى
                    </button>
                  </div>

                  <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                    <div>
                      <div className="rounded-[1.5rem] border border-white/10 bg-[#07101b] p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <Lock className="text-cyan-300" size={18} />
                          <h4 className="font-bold">اختر وسيلة الدفع</h4>
                        </div>

                        <div className="space-y-3">
                          {paymentOptions.map((option) => {
                            const Icon = option.icon;
                            const isActive = paymentMethod === option.id;

                            return (
                              <label
                                key={option.id}
                                className={`block cursor-pointer rounded-[1.25rem] border bg-gradient-to-l p-4 transition ${
                                  isActive
                                    ? `${option.accent} shadow-[0_10px_40px_rgba(0,0,0,0.18)]`
                                    : "border-white/10 from-white/5 to-white/5 hover:border-white/20"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-4">
                                    <div className="rounded-2xl bg-white/10 p-3">
                                      <Icon size={22} />
                                    </div>
                                    <div>
                                      <div className="font-bold">{option.title}</div>
                                      <div className="text-sm text-slate-300">{option.subtitle}</div>
                                    </div>
                                  </div>
                                  <input
                                    type="radio"
                                    checked={isActive}
                                    onChange={() => setPaymentMethod(option.id)}
                                    className="h-5 w-5 accent-cyan-300"
                                  />
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-[#07101b] p-5">
                        <div className="mb-4 flex items-center gap-3">
                          <BadgePercent className="text-emerald-300" size={18} />
                          <h4 className="font-bold">كود الخصم</h4>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
                            placeholder="أدخل الكود مثل: START20"
                            disabled={!!couponData || validatingCoupon}
                            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none transition placeholder:text-slate-500 focus:border-cyan-300 disabled:opacity-50"
                          />
                          {couponData ? (
                            <button
                              onClick={() => {
                                setCouponData(null);
                                setCouponCode("");
                              }}
                              className="rounded-2xl border border-red-400/20 bg-red-400/10 px-5 py-3 text-sm font-bold text-red-200 transition hover:bg-red-400/15"
                            >
                              إزالة الخصم
                            </button>
                          ) : (
                            <button
                              onClick={applyCoupon}
                              disabled={!couponCode || validatingCoupon}
                              className="rounded-2xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {validatingCoupon ? "جارٍ التحقق..." : "تطبيق الكود"}
                            </button>
                          )}
                        </div>

                        {couponData && (
                          <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                            تم تطبيق الخصم بنجاح
                            {couponData.description ? `: ${couponData.description}` : ""}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/10 bg-[#07101b] p-5">
                      <p className="text-sm text-slate-400">ملخص الطلب</p>
                      <h4 className="mt-1 text-xl font-bold">قبل تأكيد الدفع</h4>

                      <div className="mt-6 rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="font-bold">{selectedPlanData.nameAr || selectedPlanData.name}</div>
                            <div className="mt-1 text-sm text-slate-400">
                              {billingCycle === "monthly" ? "اشتراك شهري" : "اشتراك سنوي بخصم 20%"}
                            </div>
                          </div>
                          <div className="text-left text-2xl font-black">{basePrice} ج.م</div>
                        </div>
                      </div>

                      <div className="mt-6 space-y-3 border-b border-dashed border-white/10 pb-5 text-sm">
                        <div className="flex items-center justify-between text-slate-300">
                          <span>سعر الاشتراك</span>
                          <span>{basePrice} ج.م</span>
                        </div>
                        {billingCycle === "yearly" && yearlySavings > 0 && (
                          <div className="flex items-center justify-between text-emerald-300">
                            <span>وفر مع الدفع السنوي</span>
                            <span>-{yearlySavings} ج.م</span>
                          </div>
                        )}
                        {couponData && (
                          <div className="flex items-center justify-between text-emerald-300">
                            <span>خصم الكوبون</span>
                            <span>-{couponData.discountAmount} ج.م</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-slate-300">
                          <span>طريقة الدفع</span>
                          <span>{paymentOptions.find((option) => option.id === paymentMethod)?.title}</span>
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between">
                        <span className="text-lg font-semibold text-slate-300">الإجمالي المستحق</span>
                        <span className="text-4xl font-black text-cyan-300">{finalAmount} ج.م</span>
                      </div>

                      <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-4 text-sm leading-7 text-cyan-50">
                        سيتم احتساب أي رصيد داخلي أو تسوية ترقية من الخادم أثناء إنشاء الطلب النهائي إذا كانت متاحة لحسابك.
                      </div>

                      <button
                        onClick={startPayment}
                        disabled={processing}
                        className="mt-6 flex w-full items-center justify-center gap-3 rounded-[1.25rem] bg-gradient-to-l from-cyan-300 to-emerald-300 px-5 py-4 text-base font-black text-slate-950 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {processing ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-950/20 border-t-slate-950" />
                        ) : (
                          <>
                            تأكيد ومتابعة الدفع
                            <ArrowLeft size={18} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-slate-400">لماذا هذا التصميم؟</p>
              <h3 className="mt-1 text-2xl font-bold">تجربة دفع أوضح</h3>

              <div className="mt-6 space-y-4">
                {[
                  "إظهار السعر النهائي مباشرة بعد اختيار الدورة والباقات.",
                  "عزل وسائل الدفع داخل خطوة مستقلة لتقليل التشتت.",
                  "إبراز الخصومات السنوية وكوبونات التخفيض قبل التأكيد.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-7 text-slate-300">
                    <div className="mt-1 rounded-full bg-cyan-300/15 p-1 text-cyan-200">
                      <Check size={12} />
                    </div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#07101b] p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-emerald-300" size={18} />
                <h3 className="text-xl font-bold">الأسئلة الشائعة</h3>
              </div>

              <div className="mt-6 space-y-5 text-sm leading-7 text-slate-300">
                <div>
                  <div className="font-bold text-white">متى يتفعل الاشتراك؟</div>
                  <p className="mt-1 text-slate-400">البطاقات والمحافظ تتفعل مباشرة بعد نجاح الدفع، بينما رصيد الحساب يفعّل الاشتراك فورًا من داخل المنصة.</p>
                </div>
                <div>
                  <div className="font-bold text-white">هل أستطيع استخدام كود خصم مع الرصيد؟</div>
                  <p className="mt-1 text-slate-400">نعم، يتم فحص الكوبون أولًا ثم يطبّق أي رصيد أو تسوية متاحة على الخادم عند إنشاء الطلب.</p>
                </div>
                <div>
                  <div className="font-bold text-white">هل السنوي مفعّل فعليًا؟</div>
                  <p className="mt-1 text-slate-400">نعم، السعر السنوي والمدة السنوية يتم إرسالهما الآن إلى مسار الدفع ويُحتسبان فعليًا في الاشتراك.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
