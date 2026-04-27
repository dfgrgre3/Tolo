"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
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

  Tag,
  Loader2,
  ChevronLeft,
  Star,
  Info } from
"lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api/api-client";

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
type PaymentMethod = "card" | "wallet" | "internal_wallet";

const yearlyDiscount = 0.2;

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
  id: "internal_wallet",
  title: "رصيد المحفظة",
  subtitle: "استخدم رصيدك الحالي داخل المنصة",
  accent: "from-amber-500/30 to-orange-600/10 border-amber-400/30",
  icon: Wallet
}];


function getPlanPrice(price: number, cycle: BillingCycle) {
  if (cycle === "yearly") {
    return Math.round(price * 12 * (1 - yearlyDiscount));
  }
  return price;
}

export default function SubscriptionPlans() {
  const _router = useRouter();
  const _searchParams = useSearchParams();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [paymentStep, setPaymentStep] = useState<"plans" | "checkout">("plans");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponData, setCouponData] = useState<{
    discountAmount: number;
    finalAmount: number;
    description?: string;
  } | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const data = await apiClient.get<any>("/subscriptions/plans");
        const plansList = Array.isArray(data) ? data : (data?.plans || []);
        setPlans(plansList);
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
  const _yearlySavings = selectedPlanData && billingCycle === "yearly" ?
  selectedPlanData.price * 12 - getPlanPrice(selectedPlanData.price, "yearly") :
  0;
  const finalAmount = couponData?.finalAmount ?? basePrice;

  const applyCoupon = async () => {
    if (!couponCode || !selectedPlanData) return;
    setValidatingCoupon(true);
    try {
      const data = await apiClient.post<any>("/coupons/validate", {
        code: couponCode.trim().toUpperCase(),
        amount: basePrice
      });
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
      const data = await apiClient.post<any>("/subscriptions/checkout", {
        planId: selectedPlan,
        billingCycle,
        paymentMethod,
        couponCode: couponData ? couponCode.trim().toUpperCase() : undefined
      });

      if (paymentMethod === "internal_wallet" && data.success) {
        toast.success("تم تفعيل الاشتراك من رصيد الحساب");
        window.location.reload();
        return;
      }

      if (paymentMethod === "card") {
        window.location.href = `https://egypt.paymob.com/api/acceptance/iframes/${data.iframeId}?payment_token=${data.paymentKey}`;
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
      <div className="flex py-32 items-center justify-center">
        <div className="relative">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
          <div className="absolute inset-0 bg-primary/20 blur-xl animate-pulse rounded-full" />
        </div>
      </div>);

  }

  return (
    <div className="space-y-12 pb-20">
      {/* Header & Toggle */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-right bg-white dark:bg-white/5 p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-2xl backdrop-blur-xl">
        <div className="space-y-3">
          <div className="flex items-center gap-3 justify-center md:justify-start">
             <div className="p-2 bg-primary/20 rounded-xl">
               <Star className="w-6 h-6 text-primary" />
             </div>
             <h2 className="text-3xl font-black text-white">ترقية عضويتك</h2>
          </div>
          <p className="text-gray-400 font-medium text-lg leading-relaxed">استثمر في مستقبلك باختيار الباقة التي تناسب تطلعاتك الأكاديمية.</p>
        </div>

        <div className="flex bg-gray-100 dark:bg-[#151729] p-2 rounded-2xl border border-gray-200 dark:border-white/10 relative">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`relative z-10 px-10 py-3 rounded-xl text-sm font-black transition-all ${billingCycle === "monthly" ? "text-gray-900" : "text-gray-400 hover:text-white"}`}>
            
            شهرياً
            {billingCycle === "monthly" && <m.div layoutId="cycle" className="absolute inset-0 bg-white rounded-xl -z-10 shadow-lg" />}
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`relative z-10 px-10 py-3 rounded-xl text-sm font-black transition-all ${billingCycle === "yearly" ? "text-gray-900" : "text-gray-400 hover:text-white"}`}>
            
            سنوياً
            {billingCycle === "yearly" && <m.div layoutId="cycle" className="absolute inset-0 bg-white rounded-xl -z-10 shadow-lg" />}
            <span className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[10px] px-3 py-1 rounded-full font-black shadow-lg shadow-emerald-500/20">وفر 20%</span>
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {paymentStep === "plans" ?
        <m.div
          key="plans"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
            {plans.map((plan, _idx) =>
          <m.div
            key={plan.id}
            whileHover={{ y: -12, scale: 1.02 }}
            className={`relative group rounded-[3rem] p-10 border-2 transition-all duration-500 flex flex-col ${plan.popular ? "border-primary bg-gradient-to-b from-primary/10 via-primary/5 to-transparent shadow-[0_30px_60px_-15px_rgba(var(--primary-rgb),0.2)]" : "border-white/5 bg-white/5 hover:border-white/20"}`}>
            
                {plan.popular &&
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-black py-2 px-6 rounded-full flex items-center gap-2 shadow-xl shadow-primary/40 animate-bounce">
                    <Sparkles className="w-4 h-4" />
                    الخيار الأفضل
                  </div>
            }
                
                <div className="mb-8">
                  <h3 className="text-3xl font-black text-white mb-3 group-hover:text-primary transition-colors">{plan.nameAr || plan.name}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed font-medium min-h-[40px]">{plan.descriptionAr || plan.description}</p>
                </div>

                <div className="mb-10 p-6 rounded-3xl bg-white/5 border border-white/10 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                  <div className="flex items-baseline gap-2">
                    <m.span
                  key={`${plan.id}-${billingCycle}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-5xl font-black text-white">
                  
                      {getPlanPrice(plan.price, billingCycle).toLocaleString()}
                    </m.span>
                    <span className="text-gray-400 font-black text-lg">ج.م <span className="text-sm font-bold opacity-50">/ {billingCycle === "monthly" ? "شهر" : "سنة"}</span></span>
                  </div>
                  {billingCycle === "yearly" &&
              <div className="mt-4 flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-xl border border-emerald-500/20 w-fit">
                       <BadgePercent className="w-4 h-4" />
                       <span className="text-xs font-black tracking-tight">وفرت {(plan.price * 12 - getPlanPrice(plan.price, "yearly")).toLocaleString()} ج.م سنوياً</span>
                     </div>
              }
                </div>

                <div className="space-y-4 mb-12 flex-grow">
                  {(plan.featuresAr || plan.features).map((feature, i) =>
              <div key={i} className="flex items-start gap-4 text-sm text-gray-300 group/item">
                      <div className="mt-1 bg-emerald-500/20 p-1 rounded-full group-hover/item:bg-emerald-500 group-hover/item:text-white transition-all">
                        <Check className="w-3 h-3 text-emerald-500 group-hover/item:text-inherit" />
                      </div>
                      <span className="font-medium">{feature}</span>
                    </div>
              )}
                </div>

                <button
              onClick={() => {setSelectedPlan(plan.id);setPaymentStep("checkout");}}
              className={`w-full py-5 rounded-[2rem] font-black text-lg transition-all transform active:scale-95 group/btn flex items-center justify-center gap-3 ${plan.popular ? "bg-primary text-white hover:bg-primary/90 shadow-2xl shadow-primary/30" : "bg-white/10 text-white hover:bg-white/20"}`}>
              
                  <span>اختيار هذه الخطة</span>
                  <ChevronLeft className="w-5 h-5 group-hover/btn:-translate-x-1 transition-transform" />
                </button>
              </m.div>
          )}
          </m.div> :

        <m.div
          key="checkout"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-6xl mx-auto">
          
            {/* Payment Method Selection */}
            <div className="space-y-8">
              <div className="rounded-[3rem] bg-white dark:bg-[#111322] border border-gray-100 dark:border-white/10 p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1 h-full bg-primary" />
                
                <div className="flex items-center gap-6 mb-10">
                  <button
                  onClick={() => setPaymentStep("plans")}
                  className="p-4 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-primary hover:text-white text-gray-400 transition-all transform hover:rotate-6 shadow-sm">
                  
                    <ArrowLeft className="w-6 h-6 rotate-180" />
                  </button>
                  <div>
                    <h3 className="text-2xl font-black text-white">طريقة الدفع</h3>
                    <p className="text-gray-400 text-sm font-medium">اختر الوسيلة المفضلة لدفع مبلغ الاشتراك.</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {paymentOptions.map((opt) =>
                <label
                  key={opt.id}
                  className={`group flex items-center gap-5 p-6 rounded-[2.2rem] border-2 cursor-pointer transition-all ${paymentMethod === opt.id ? 'border-primary bg-primary/5 shadow-inner' : 'border-white/5 bg-white/5 hover:border-primary/30 hover:bg-primary/5'}`}>
                  
                      <div className="relative">
                        <input type="radio" name="pay" checked={paymentMethod === opt.id} onChange={() => setPaymentMethod(opt.id)} className="w-6 h-6 accent-primary" />
                      </div>
                      <div className={`w-16 h-16 rounded-[1.3rem] flex items-center justify-center transition-all ${paymentMethod === opt.id ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' : 'bg-white/10 text-gray-500 group-hover:text-primary group-hover:scale-105'}`}>
                        <opt.icon className="w-8 h-8" />
                      </div>
                      <div className="flex-grow">
                        <span className="block font-black text-white text-lg group-hover:text-primary transition-colors">{opt.title}</span>
                        <span className="text-sm text-gray-400 font-medium">{opt.subtitle}</span>
                      </div>
                      {paymentMethod === opt.id &&
                  <m.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-primary/20 text-primary p-1.5 rounded-full">
                          <Check className="w-4 h-4" />
                        </m.div>
                  }
                    </label>
                )}
                </div>

                <div className="mt-10 pt-10 border-t border-white/10">
                  <div className="relative">
                    <Tag className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                    <input
                    type="text"
                    placeholder="هل لديك كود خصم؟"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-white/5 border border-transparent dark:border-white/5 rounded-[1.8rem] py-5 px-14 text-white outline-none focus:border-primary/50 transition-all font-black tracking-widest text-lg shadow-inner" />
                  
                    <button
                    onClick={applyCoupon}
                    disabled={!couponCode || validatingCoupon}
                    className="absolute left-3 top-3 bottom-3 px-8 rounded-2xl bg-primary text-white text-sm font-black disabled:opacity-50 hover:bg-primary/90 transition-all shadow-xl shadow-primary/20">
                    
                      {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : "تطبيق"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="space-y-8">
              <div className="rounded-[3rem] bg-gradient-to-br from-[#1a1c2e] to-[#0d0f1a] border border-white/10 p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 blur-[100px] rounded-full -mr-32 -mt-32 group-hover:scale-125 transition-transform duration-1000" />
                 
                 <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                   <Info className="w-6 h-6 text-primary" />
                   ملخص الاشتراك
                 </h3>
                 
                 <div className="space-y-5 mb-10">
                   <div className="bg-white/5 p-6 rounded-[2.2rem] border border-white/10 shadow-inner group/summary">
                     <div className="flex justify-between items-start mb-6">
                       <div className="space-y-1">
                         <span className="block font-black text-2xl text-white tracking-wide">{selectedPlanData?.nameAr || selectedPlanData?.name}</span>
                         <span className="text-sm text-primary font-black uppercase tracking-widest">{billingCycle === "monthly" ? "دورة شهرية" : "دورة سنوية"}</span>
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
                        {couponData &&
                    <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex justify-between items-center text-emerald-400 px-2 bg-emerald-500/5 py-2 rounded-xl border border-emerald-500/10">
                            <span className="text-sm font-black">خصم الكوبون</span>
                            <span className="font-black">-{couponData.discountAmount.toLocaleString()} ج.م</span>
                          </m.div>
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
                     <m.span
                    key={finalAmount}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="text-6xl font-black text-primary drop-shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]">
                    
                        {finalAmount.toLocaleString()}
                      </m.span>
                     <span className="text-xl font-bold text-gray-500 block">جنيهاً مصرياً</span>
                   </div>
                 </div>

                 <button
                disabled={processing}
                onClick={startPayment}
                className="w-full py-6 rounded-[2.5rem] bg-primary hover:bg-primary/90 text-white font-black text-xl transition-all shadow-[0_20px_40px_-5px_rgba(var(--primary-rgb),0.4)] flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-70 group/pay">
                
                   {processing ? <Loader2 className="w-7 h-7 animate-spin" /> : <Lock className="w-6 h-6 group-hover/pay:scale-110 transition-transform" />}
                   {processing ? "جاري معالجة طلبك..." : "تأكيد والاشتراك الآن"}
                 </button>

                 <div className="mt-8 flex items-center justify-center gap-6 opacity-40">
                    <img src="/images/payments/paymob.png" alt="Paymob" className="h-6 grayscale hover:grayscale-0 transition-all cursor-crosshair" />
                    <div className="w-px h-4 bg-white/20" />
                    <img src="/images/payments/visa-master.png" alt="Visa Mastercard" className="h-4 grayscale hover:grayscale-0 transition-all cursor-crosshair" />
                 </div>

                 <p className="mt-8 text-center text-[10px] text-gray-500 leading-relaxed font-medium uppercase tracking-widest px-6">
                   بإتمام عملية الدفڡ أنت تؤكد موافقتك على <span className="underline cursor-pointer hover:text-white">شروط الخدمة</span> و <span className="underline cursor-pointer hover:text-white">سياسة الاسترجاع</span> الخاصة بنا.
                 </p>
              </div>
            </div>
          </m.div>
        }
      </AnimatePresence>
    </div>);

}