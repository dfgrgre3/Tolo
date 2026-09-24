"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgePercent,
  Banknote,
  CalendarDays,
  Check,
  CreditCard,
  Crown,
  Lock,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,

  Tag,
  Loader2,
  ChevronLeft,
  Star,
  Info } from
"lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  checkoutSubscriptionRaw,
  fetchBillingSummaryRaw,
  fetchCurrentSubscriptionRaw,
  fetchSubscriptionPlansRaw,
} from "@/features/payments/api/payments-gateway";
import {
  getFawryCode,
  resolvePaymentAction,
  validateCoupon,
  type PaymentMethod,
} from "@/features/payments";
import { BillingPageHeader } from "@/components/billing/billing-ui";

interface Plan {
  id: string;
  name: string;
  nameAr: string;
  price: number;
  description: string;
  descriptionAr: string;
  features: string[];
  featuresAr: string[];
  interval: string; // "MONTHLY" | "YEARLY" | "FOREVER"
  groupKey?: string;
  popular?: boolean;
}

// A plan "tier" groups the interval variants (monthly/yearly rows) an admin
// linked together via groupKey, so the billing-cycle toggle switches
// between two real, separately-priced plan records instead of guessing a
// yearly price client-side.
interface PlanTier {
  groupKey: string;
  monthly: Plan | null;
  yearly: Plan | null;
  // Representative plan for display when a tier has only one variant.
  fallback: Plan;
}

type BillingCycle = "monthly" | "yearly";

// مُصدَّرة للاختبار — منطق خالص لتجميع متغيرات الخطة (شهري/سنوي) تحت مستوى واحد.
export function groupPlansByTier(plans: Plan[]): PlanTier[] {
  const groups = new Map<string, Plan[]>();
  for (const plan of plans) {
    const key = plan.groupKey || plan.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(plan);
  }
  return Array.from(groups.entries()).
  filter(([, members]) => members.length > 0).
  map(([groupKey, members]) => ({
    groupKey,
    monthly: members.find((p) => p.interval === "MONTHLY") || null,
    yearly: members.find((p) => p.interval === "YEARLY") || null,
    fallback: members[0]!
  }));
}

// Resolves the plan record to actually display/charge for a tier given the
// selected billing cycle: the matching-interval variant if the admin set
// one up, otherwise whichever variant exists (e.g. a lifetime-only plan).
export function planForCycle(tier: PlanTier, cycle: BillingCycle): Plan {
  if (cycle === "yearly") return tier.yearly || tier.monthly || tier.fallback;
  return tier.monthly || tier.yearly || tier.fallback;
}

interface ActivePlan {
  id: string;
  planId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  plan?: { id?: string; name?: string; nameAr?: string };
}

function normalizeActivePlans(value: unknown): ActivePlan[] {
  const unwrap = (v: unknown): unknown => {
    if (v && typeof v === "object" && !Array.isArray(v) && "data" in (v as Record<string, unknown>)) {
      const inner = (v as { data?: unknown }).data;
      if (inner !== undefined) return unwrap(inner);
    }
    return v;
  };
  const root = unwrap(value);
  const rawList: unknown[] = Array.isArray(root)
    ? root
    : root && typeof root === "object" && Array.isArray((root as { subscriptions?: unknown }).subscriptions)
      ? ((root as { subscriptions: unknown[] }).subscriptions)
      : root && typeof root === "object" && (root as { activeSubscription?: unknown }).activeSubscription
        ? [(root as { activeSubscription: unknown }).activeSubscription]
        : root && typeof root === "object" && "id" in (root as Record<string, unknown>)
          ? [root]
          : [];
  return rawList
    .filter((s): s is Record<string, unknown> => typeof s === "object" && s !== null)
    .map((s) => {
      const plan = (s.plan ?? {}) as Record<string, unknown>;
      const id = typeof s.id === "string" ? s.id : typeof plan.id === "string" ? plan.id : "";
      if (!id) return null;
      return {
        id,
        planId: typeof s.planId === "string" ? s.planId : typeof plan.id === "string" ? plan.id : undefined,
        status: typeof s.status === "string" ? s.status : undefined,
        startDate: typeof s.startDate === "string" ? s.startDate : undefined,
        endDate: typeof s.endDate === "string" ? s.endDate : undefined,
        plan: {
          id: typeof plan.id === "string" ? plan.id : undefined,
          name: typeof plan.name === "string" ? plan.name : undefined,
          nameAr: typeof plan.nameAr === "string" ? plan.nameAr : undefined,
        },
      } as ActivePlan;
    })
    .filter((s): s is ActivePlan => s !== null);
}

function formatArDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(d);
  } catch {
    return d.toLocaleDateString("ar-EG");
  }
}

function daysLeft(endDate?: string): number | null {
  if (!endDate) return null;
  const d = new Date(endDate);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
}

const paymentOptions: Array<{
  id: PaymentMethod;
  title: string;
  subtitle: string;
  accent: string;
  icon: React.ComponentType<{className?: string;size?: number;}>;
}> = [
{
  id: "card",
  title: "بطاقة بنكية آمنة",
  subtitle: "Visa / Mastercard مع تفعيل فوري",
  accent: "from-sky-500/30 to-blue-600/10 border-sky-400/30",
  icon: CreditCard
},
{
  id: "wallet",
  title: "محفظة إلكترونية",
  subtitle: "Vodafone Cash والمحافظ المدعومة",
  accent: "from-emerald-500/30 to-green-600/10 border-emerald-400/30",
  icon: Smartphone
},
{
  id: "fawry",
  title: "فوري",
  subtitle: "كود دفع نقدي عبر منافذ فوري",
  accent: "from-amber-500/40 to-yellow-600/10 border-amber-400/30",
  icon: Banknote
},
{
  id: "internal_wallet",
  title: "رصيد المحفظة",
  subtitle: "استخدم رصيدك الحالي داخل المنصة",
  accent: "from-amber-500/30 to-orange-600/10 border-amber-400/30",
  icon: Wallet
}];


interface PlanCardProps {
  tier: PlanTier;
  billingCycle: BillingCycle;
  isCurrentPlan: boolean;
  onSelect: (groupKey: string) => void;
}

const PlanCard = React.memo(function PlanCard({ tier, billingCycle, isCurrentPlan, onSelect }: PlanCardProps) {
  const plan = planForCycle(tier, billingCycle);
  const yearlySaved = useMemo(
    () =>
      billingCycle === "yearly" && tier.monthly && tier.yearly
        ? Math.max(0, tier.monthly.price * 12 - plan.price)
        : 0,
    [tier, billingCycle, plan.price]
  );
  const handleSelect = useCallback(() => onSelect(tier.groupKey), [onSelect, tier.groupKey]);

  return (
    <div
      className={`relative group rounded-[3rem] p-10 border-2 flex flex-col ${plan.popular ? "border-primary bg-gradient-to-b from-primary/10 via-primary/5 to-transparent shadow-[0_30px_60px_-15px_rgba(var(--primary-rgb),0.2)]" : "border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 hover:border-white/20"}`}>

      {plan.popular &&
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-black py-2 px-6 rounded-full flex items-center gap-2 shadow-xl shadow-primary/40">
          <Sparkles className="w-4 h-4" />
          الخيار الأفضل
        </div>
      }
      {isCurrentPlan &&
        <div className="absolute -top-5 right-6 bg-emerald-500 text-white text-xs font-black py-2 px-5 rounded-full flex items-center gap-2 shadow-xl shadow-emerald-500/40">
          <Crown className="w-4 h-4" />
          خطتك الحالية
        </div>
      }

      <div className="mb-8">
        <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-3 group-hover:text-primary">{plan.nameAr || plan.name}</h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-medium min-h-[40px]">{plan.descriptionAr || plan.description}</p>
      </div>

      <div className="mb-10 p-6 rounded-3xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 group-hover:bg-primary/5 group-hover:border-primary/20">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-black text-gray-900 dark:text-white">
            {plan.price.toLocaleString()}
          </span>
          <span className="text-gray-500 dark:text-gray-400 font-black text-lg">ج.م <span className="text-sm font-bold opacity-50">/ {plan.interval === "YEARLY" ? "سنة" : plan.interval === "FOREVER" ? "مدى الحياة" : "شهر"}</span></span>
        </div>
        {yearlySaved > 0 &&
          <div className="mt-4 flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
            <BadgePercent className="w-4 h-4" />
            <span className="text-xs font-black tracking-tight">وفرت {yearlySaved.toLocaleString()} ج.م سنوياً</span>
          </div>
        }
      </div>

      <div className="space-y-4 mb-12 flex-grow">
        {(plan.featuresAr || plan.features || []).map((feature, i) =>
          <div key={i} className="flex items-start gap-4 text-sm text-gray-600 dark:text-gray-300 group/item">
            <div className="mt-1 bg-emerald-500/20 p-1 rounded-full group-hover/item:bg-emerald-500 group-hover/item:text-white">
              <Check className="w-3 h-3 text-emerald-500 group-hover/item:text-inherit" />
            </div>
            <span className="font-medium">{feature}</span>
          </div>
        )}
      </div>

      <button
        onClick={handleSelect}
        disabled={isCurrentPlan}
        className={`w-full py-5 rounded-[2rem] font-black text-lg group/btn flex items-center justify-center gap-3 ${isCurrentPlan ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 cursor-default" : plan.popular ? "bg-primary text-white hover:bg-primary/90 shadow-2xl shadow-primary/30" : "bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20"}`}>

        <span>{isCurrentPlan ? "خطتك الحالية" : "اختيار هذه الخطة"}</span>
        {!isCurrentPlan && <ChevronLeft className="w-5 h-5" />}
      </button>
    </div>
  );
});
PlanCard.displayName = "PlanCard";


export default function SubscriptionPlans() {
  const _router = useRouter();
  const _searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlans, setActivePlans] = useState<ActivePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [paymentStep, setPaymentStep] = useState<"plans" | "checkout">("plans");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [selectedTierKey, setSelectedTierKey] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState<{
    discountAmount: number;
    finalAmount: number;
    description?: string;
  } | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const [plansRes, currentRes, summaryRes] = await Promise.allSettled([
          fetchSubscriptionPlansRaw<Plan[] | { plans?: Plan[] }>(),          fetchCurrentSubscriptionRaw(),
          fetchBillingSummaryRaw<unknown>(),
        ]);
        if (plansRes.status === "fulfilled") {
          const data = plansRes.value;
          const plansList = Array.isArray(data) ? data : (data?.plans || []);
          setPlans(plansList);
        } else {
          toast.error("تعذر تحميل الباقات");
        }

        // الخطط النشطة: ندمج اشتراكات المستخدم الحالية مع ملخص الفوترة
        const merged: ActivePlan[] = [];
        const seen = new Set<string>();
        const pushAll = (list: ActivePlan[]) => {
          for (const s of list) {
            if (!seen.has(s.id)) {
              seen.add(s.id);
              merged.push(s);
            }
          }
        };
        if (currentRes.status === "fulfilled") pushAll(normalizeActivePlans(currentRes.value));
        if (summaryRes.status === "fulfilled") pushAll(normalizeActivePlans(summaryRes.value));
        setActivePlans(merged);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "تعذر تحميل الباقات");
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const tiers = useMemo(() => groupPlansByTier(plans), [plans]);

  const selectedTier = useMemo(
    () => tiers.find((t) => t.groupKey === selectedTierKey) ?? null,
    [tiers, selectedTierKey]
  );

  // The plan actually being purchased for the chosen billing cycle — its
  // real price, straight from the SubscriptionPlan record, no client math.
  const selectedPlanData = selectedTier ? planForCycle(selectedTier, billingCycle) : null;

  const basePrice = selectedPlanData?.price ?? 0;
  const monthlyEquivalentYearly = selectedTier?.monthly ? selectedTier.monthly.price * 12 : null;
  const yearlySavings =
  billingCycle === "yearly" && selectedPlanData?.interval === "YEARLY" && monthlyEquivalentYearly ?
  Math.max(0, monthlyEquivalentYearly - basePrice) :
  0;
    const finalAmount = couponData?.finalAmount ?? basePrice;

  const handleSelectPlan = useCallback((groupKey: string) => {
    setSelectedTierKey(groupKey);
    setPaymentStep("checkout");
  }, []);

  const applyCoupon = async () => {
    if (!couponCode || !selectedPlanData) return;
    setValidatingCoupon(true);
    try {
      const result = await validateCoupon(couponCode, basePrice);
      if (!result.valid) {
        toast.error(result.message || "كود الخصم غير صالح");
        return;
      }
      setCouponData({
        discountAmount: result.discountAmount ?? 0,
        finalAmount: result.finalAmount ?? basePrice,
        description: result.description,
      });
      toast.success("تم تطبيق كود الخصم");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تطبيق كود الخصم");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const startPayment = async () => {
    if (!selectedPlanData) return;
    setProcessing(true);
    try {
      const data = await checkoutSubscriptionRaw<{
        success?: boolean;
        iframeId?: string;
        paymentKey?: string;
        redirectUrl?: string;
        fawryCode?: string;
        billReference?: string;
      }>({
        planId: selectedPlanData.id,
        billingCycle,
        paymentMethod,
        couponCode: couponData ? couponCode.trim().toUpperCase() : undefined
      });

      const action = resolvePaymentAction(paymentMethod, data);
      switch (action.kind) {
        case "success":
          toast.success(
            paymentMethod === "internal_wallet"
              ? "تم تفعيل الاشتراك من رصيد الحساب"
              : "تم تفعيل الاشتراك بنجاح",
          );
          window.location.reload();
          return;
        case "redirect":
        case "iframe":
        case "wallet":
          window.location.href = action.url;
          return;
        case "fawry-code":
          toast.success(`كود فوري الخاص بك: ${action.code}`);
          return;
        case "pending": {
          const code = getFawryCode(data);
          toast.info(
            code
              ? `كود فوري الخاص بك: ${code}`
              : "تم إنشاء طلب الدفع — تابع حالته من صفحة الفواتير",
          );
          return;
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء تجهيز الدفع");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex py-32 items-center justify-center">
        <div className="relative">
                    <Loader2 className="w-16 h-16 text-primary" />
          <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
        </div>
      </div>);

  }

  return (
    <div className="space-y-12 pb-20" dir="rtl">
      {/* Header موحد مع باقي نظام الفواتير */}
      <BillingPageHeader
        badge="ترقية العضوية"
        BadgeIcon={Star}
        title="اختر باقتك المناسبة"
        description="استثمر في مستقبلك باختيار الباقة التي تناسب تطلعاتك الأكاديمية — تفعيل فوري وآمن."
        action={
          tiers.some((t) => t.yearly) ? (
            <div className="flex bg-gray-50 dark:bg-white/5 p-2 rounded-2xl border border-gray-200 dark:border-white/10 relative">
              <button
                onClick={() => setBillingCycle("monthly")}
                                className={`relative z-10 px-8 py-3 rounded-xl text-sm font-black ${billingCycle === "monthly" ? "text-gray-900" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}>
                شهرياً
                {billingCycle === "monthly" && <div className="absolute inset-0 bg-white rounded-xl -z-10 shadow-lg" />}
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                                className={`relative z-10 px-8 py-3 rounded-xl text-sm font-black ${billingCycle === "yearly" ? "text-gray-900" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}>
                سنوياً
                {billingCycle === "yearly" && <div className="absolute inset-0 bg-white rounded-xl -z-10 shadow-lg" />}
              </button>
            </div>
          ) : undefined
        }
      />

      {/* ─── الخطط النشطة ─── */}
      {paymentStep === "plans" && (
        <section aria-label="الخطط النشطة" className="rounded-[2.5rem] border border-emerald-500/20 bg-emerald-500/5 p-6 md:p-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <Crown className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">الخطط النشطة</h2>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                اشتراكاتك الحالية وتاريخ انتهاء كل خطة
              </p>
            </div>
            {activePlans.length > 0 && (
              <span className="ms-auto rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-500">
                {activePlans.length} نشط
              </span>
            )}
          </div>

          {activePlans.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-300 dark:border-white/10 px-4 py-6 text-center text-sm font-bold text-gray-500 dark:text-gray-400">
              لا توجد خطط نشطة حالياً — اختر باقتك من الأسفل للبدء.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activePlans.map((sub) => {
                const left = daysLeft(sub.endDate);
                return (
                  <div
                    key={sub.id}
                    className="rounded-[1.8rem] border border-emerald-500/20 bg-white dark:bg-white/5 p-5 shadow-sm"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span className="font-black text-gray-900 dark:text-white">
                        {sub.plan?.nameAr || sub.plan?.name || "اشتراك نشط"}
                      </span>
                      <span className="ms-auto rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-black text-emerald-500">
                        {sub.status || "نشط"}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>ينتهي في {formatArDate(sub.endDate)}</span>
                      </div>
                      {left !== null && (
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                          <span>متبقٍ {left} يوم</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {paymentStep === "plans" ?
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

            {tiers.map((tier) => {
            const tierPlanIds = [tier.monthly?.id, tier.yearly?.id, tier.fallback?.id].filter(Boolean) as string[];
            const isCurrentPlan = activePlans.some((s) =>
              tierPlanIds.includes(s.id) ||
              (s.planId ? tierPlanIds.includes(s.planId) : false) ||
              (s.plan?.id ? tierPlanIds.includes(s.plan.id) : false)
            );
            return (
              <PlanCard
                key={tier.groupKey}
                tier={tier}
                billingCycle={billingCycle}
                isCurrentPlan={isCurrentPlan}
                onSelect={handleSelectPlan} />);

          })}
          </div> :

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-6xl mx-auto">
          
            {/* Payment Method Selection */}
            <div className="space-y-8">
              <div className="rounded-[3rem] bg-white dark:bg-[#111322] border border-gray-100 dark:border-white/10 p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-primary" />
                
                <div className="flex items-center gap-6 mb-10">
                  <button
                  onClick={() => setPaymentStep("plans")}
                                    className="p-4 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-primary hover:text-white text-gray-500 dark:text-gray-400 shadow-sm">
                  
                    <ArrowLeft className="w-6 h-6 rotate-180" />
                  </button>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">طريقة الدفع</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">اختر الوسيلة المفضلة لدفع مبلغ الاشتراك.</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {paymentOptions.map((opt) =>
                <label
                  key={opt.id}
                                    className={`group flex items-center gap-5 p-6 rounded-[2.2rem] border-2 cursor-pointer ${paymentMethod === opt.id ? 'border-primary bg-primary/5 shadow-inner' : 'border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 hover:border-primary/30 hover:bg-primary/5'}`}>
                  
                      <div className="relative">
                        <input type="radio" name="pay" checked={paymentMethod === opt.id} onChange={() => setPaymentMethod(opt.id)} className="w-6 h-6 accent-primary" />
                      </div>
                                            <div className={`w-16 h-16 rounded-[1.3rem] flex items-center justify-center ${paymentMethod === opt.id ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' : 'bg-gray-200 dark:bg-white/10 text-gray-500 group-hover:text-primary'}`}>
                        <opt.icon className="w-8 h-8" />
                      </div>
                      <div className="flex-grow">
                                                <span className="block font-black text-gray-900 dark:text-white text-lg group-hover:text-primary">{opt.title}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{opt.subtitle}</span>
                      </div>
                      {paymentMethod === opt.id &&
                  <div className="bg-primary/20 text-primary p-1.5 rounded-full">
                          <Check className="w-4 h-4" />
                        </div>
                  }
                    </label>
                )}
                </div>

                <div className="mt-10 pt-10 border-t border-gray-200 dark:border-white/10">
                  <div className="relative">
                    <Tag className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                    <input
                    type="text"
                    placeholder="هل لديك كود خصم؟"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                                        className="w-full bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[1.8rem] py-5 px-14 text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-primary/50 font-black tracking-widest text-lg shadow-inner" />
                  
                    <button
                    onClick={applyCoupon}
                    disabled={!couponCode || validatingCoupon}
                    className="absolute left-3 top-3 bottom-3 px-8 rounded-2xl bg-primary text-white text-sm font-black disabled:opacity-50 hover:bg-primary/90 shadow-xl shadow-primary/20">
                    
                      {validatingCoupon ? <Loader2 className="w-4 h-4" /> : "تطبيق"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="space-y-8">
              <div className="rounded-[3rem] bg-gradient-to-br from-[#1a1c2e] to-[#0d0f1a] border border-white/10 p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                 
                 <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                   <Info className="w-6 h-6 text-primary" />
                   ملخص الاشتراك
                 </h3>
                 
                 <div className="space-y-5 mb-10">
                   <div className="bg-white/5 p-6 rounded-[2.2rem] border border-white/10 shadow-inner group/summary">
                     <div className="flex justify-between items-start mb-6">
                       <div className="space-y-1">
                         <span className="block font-black text-2xl text-white tracking-wide">{selectedPlanData?.nameAr || selectedPlanData?.name}</span>
                         <span className="text-sm text-primary font-black uppercase tracking-widest">{selectedPlanData?.interval === "YEARLY" ? "دورة سنوية" : selectedPlanData?.interval === "FOREVER" ? "مدى الحياة" : "دورة شهرية"}</span>
                       </div>
                       <div className="text-left">
                         <span className="text-3xl font-black text-white">{basePrice.toLocaleString()}</span>
                         <span className="text-xs text-gray-500 block">ج.م</span>
                       </div>
                     </div>
                     
                     <div className="space-y-3 pt-6 border-t border-white/5">
                        <div className="flex justify-between items-center text-sm font-medium text-gray-400 px-2">
                           <span>السعر الأساسي</span>
                           <span>{basePrice.toLocaleString()} ج.م</span>
                        </div>
                        {yearlySavings > 0 &&
                    <div className="flex justify-between items-center text-emerald-400 px-2 bg-emerald-500/5 py-2 rounded-xl border border-emerald-500/10">
                            <span className="text-sm font-black">وفر الاشتراك السنوي</span>
                            <span className="font-black">-{yearlySavings.toLocaleString()} ج.م</span>
                          </div>
                    }
                        {couponData &&
                    <div className="flex justify-between items-center text-emerald-400 px-2 bg-emerald-500/5 py-2 rounded-xl border border-emerald-500/10">
                            <span className="text-sm font-black">خصم الكوبون</span>
                            <span className="font-black">-{couponData.discountAmount.toLocaleString()} ج.م</span>
                          </div>
                    }
                     </div>
                   </div>
                 </div>

                 <div className="flex justify-between items-end mb-10 px-4">
                   <div className="space-y-1">
                     <span className="text-gray-400 font-black text-sm uppercase tracking-widest block">الإجمالي النهائي</span>
                     <div className="flex items-center gap-3">
                       <ShieldCheck className="w-5 h-5 text-emerald-500" />
                       <span className="text-sm text-emerald-500/70 font-bold">تفعيل فوري وآمن</span>
                     </div>
                   </div>
                   <div className="text-left">
                     <span className="text-6xl font-black text-primary drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
                    
                        {finalAmount.toLocaleString()}
                      </span>
                     <span className="text-xl font-bold text-gray-500 block">جنيهاً مصرياً</span>
                   </div>
                 </div>

                 <button
                disabled={processing}
                onClick={startPayment}
                className="w-full py-6 rounded-[2.5rem] bg-primary hover:bg-primary/90 text-white font-black text-xl shadow-[0_20px_40px_-5px_rgba(var(--primary-rgb),0.4)] flex items-center justify-center gap-4 disabled:opacity-70 group/pay">
                
                   {processing ? <Loader2 className="w-7 h-7" /> : <Lock className="w-6 h-6" />}
                   {processing ? "جاري معالجة طلبك..." : "تأكيد والاشتراك الآن"}
                 </button>

                 <div className="mt-8 flex items-center justify-center gap-6 opacity-40">
                    <Image src="/images/payments/paymob.png" alt="Paymob" width={120} height={24} className="h-6 grayscale hover:grayscale-0 cursor-crosshair" />
                    <div className="w-px h-4 bg-white/20" />
                    <Image src="/images/payments/visa-master.png" alt="Visa Mastercard" width={64} height={16} className="h-4 grayscale hover:grayscale-0 cursor-crosshair" />
                 </div>

                 <p className="mt-8 text-center text-[10px] text-gray-500 leading-relaxed font-medium uppercase tracking-widest px-6">
                   بإتمام عملية الدفع أنت تؤكد موافقتك على <span className="underline cursor-pointer hover:text-white">شروط الخدمة</span> و <span className="underline cursor-pointer hover:text-white">سياسة الاسترجاع</span> الخاصة بنا.
                 </p>
              </div>
            </div>
          </div>
         }
    </div>);

}