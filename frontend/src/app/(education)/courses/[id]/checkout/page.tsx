"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { m } from "framer-motion";
import {
  CreditCard,
  Wallet,
  Smartphone,
  ShieldCheck,
  Tag,
  Loader2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  ArrowRight,
  Sparkles,

  Zap,
  Info } from
"lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

interface CourseCheckoutInfo {
  id: string;
  name: string;
  nameAr?: string;
  price: number;
  thumbnailUrl?: string;
  description?: string;
}

export default function CourseCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { user } = useAuth();

  const [course, setCourse] = useState<CourseCheckoutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "fawry" | "wallet" | "internal_wallet">("card");
  const [couponCode, setCouponCode] = useState("");
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!courseId) return;

    const fetchData = async () => {
      try {
        const [courseRes, walletRes] = await Promise.all([
        fetch(`/api/courses/${courseId}`),
        fetch(`/api/billing/wallet`)]
        );

        const courseData = await courseRes.json();
        const walletData = await walletRes.json();

        if (courseData.subject) {
          setCourse({
            id: courseData.subject.id,
            name: courseData.subject.name,
            nameAr: courseData.subject.nameAr,
            price: courseData.subject.price || 0,
            thumbnailUrl: courseData.subject.thumbnailUrl,
            description: courseData.subject.description
          });
        }
        setWalletBalance(walletData.balance || 0);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  const handleCheckout = async () => {
    if (!user) {
      toast.error("يرجى تسجيل الدخول قبل الدفع");
      router.push(`/login?redirect=/courses/${courseId}/checkout`);
      return;
    }
    setProcessing(true);
    setIframeUrl(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          couponCode: couponCode || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "حدث خطأ أثناء تهيئة الدفع");
        return;
      }

      if (data.success) {
        toast.success("تم تسجيلك في الدورة بنجاح!");
        router.push(`/courses/${courseId}?payment_success=true`);
        return;
      }

      if (data.paymentKey && data.iframeId) {
        setIframeUrl(`https://egypt.paymob.com/api/acceptance/iframes/${data.iframeId}?payment_token=${data.paymentKey}`);
      } else {
        toast.error("تكوين الدفع غير مكتمل من السيرفر");
      }
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء الاتصال بنظام الدفع");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09111f]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-gray-400 font-bold">جاري تجهيز طلبك...</p>
        </div>
      </div>);

  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09111f]">
        <div className="text-center p-8 bg-white/5 border border-white/10 rounded-[2rem] max-w-md">
          <AlertCircle className="mx-auto w-20 h-20 text-rose-500 mb-6" />
          <h2 className="text-3xl font-black text-white mb-2">الدورة غير موجودة</h2>
          <p className="text-gray-400 mb-8">لم يتم العثور على الدورة المطلوبة، ربما تم نقلها أو حذفها.</p>
          <button onClick={() => router.push('/courses')} className="w-full py-4 bg-white text-gray-900 font-bold rounded-2xl">العودة للدورات</button>
        </div>
      </div>);

  }

  if (iframeUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0D14] flex flex-col" dir="rtl">
        <div className="bg-[#101222] border-b border-white/10 text-white p-4 flex justify-between items-center shadow-2xl">
          <div className="flex items-center gap-3">
             <div className="bg-primary/20 p-2 rounded-xl">
                <ShieldCheck className="w-6 h-6 text-primary" />
             </div>
             <h2 className="font-black text-xl">بوابة الدفع الآمنة</h2>
          </div>
          <button
            onClick={() => setIframeUrl(null)}
            className="text-white hover:text-rose-400 font-black px-6 py-2.5 bg-white/5 border border-white/10 rounded-2xl transition-all active:scale-95 flex items-center gap-2">
            
            <span>إلغاء العملية</span>
            <ArrowRight className="w-4 h-4 rotate-180" />
          </button>
        </div>
        <div className="flex-1 bg-white relative">
           <iframe src={iframeUrl} className="w-full h-full" allow="payment" />
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-[#09111f] text-white py-12 px-4 md:px-8" dir="rtl">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tight">إتمام التسجيل</h1>
              <p className="text-gray-400 font-medium">خطوة واحدة تفصلك عن البدء في رحلة تعليمية جديدة</p>
           </div>
           <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-bold group">
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              <span>الرجوع للدورة</span>
           </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Order Details Column */}
          <div className="lg:col-span-4 space-y-8">
            <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[2.5rem] bg-gradient-to-b from-white/10 to-transparent border border-white/10 p-2 overflow-hidden shadow-2xl">
               <div className="aspect-video rounded-[2rem] overflow-hidden relative">
                  {course.thumbnailUrl ?
                <img src={course.thumbnailUrl} alt={course.nameAr} className="w-full h-full object-cover" /> :

                <div className="w-full h-full bg-[#101222] flex items-center justify-center">
                       <GraduationCap className="w-20 h-20 text-gray-700" />
                    </div>
                }
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12">
                     <span className="text-xs bg-primary/80 text-white font-black px-3 py-1 rounded-full uppercase tracking-widest mb-2 inline-block">دورة تدريبية</span>
                     <h2 className="text-2xl font-black text-white">{course.nameAr || course.name}</h2>
                  </div>
               </div>
               
               <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center">
                     <span className="text-gray-400 font-bold">سعر الدورة</span>
                     <span className="text-2xl font-black text-white">{course.price} ج.م</span>
                  </div>
                  
                  <div className="space-y-3 pt-6 border-t border-white/10">
                     {[
                  "وصول مدى الحياة للمحتوى",
                  "شهادة إكمال معتمدة",
                  "ملفات مساعدة للتحميل"].
                  map((text, i) =>
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>{text}</span>
                       </div>
                  )}
                  </div>

                  <div className="pt-6 border-t border-white/10 flex justify-between items-center text-3xl font-black text-primary">
                    <span>الإجمالي</span>
                    <span>{course.price} <span className="text-lg">ج.م</span></span>
                  </div>
               </div>
            </m.div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-[2rem] flex gap-4">
               <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0" />
               <p className="text-sm font-medium text-emerald-100/80 leading-relaxed">
                  نحن نستخدم أحدث أنظمة التشفير لضمان أمان مدفوعاتك. بيانات بطاقتك لا تخزن أبداً على أنظمتنا.
               </p>
            </div>
          </div>

          {/* Payment Selection Column */}
          <div className="lg:col-span-8 space-y-8">
            <div className="rounded-[2.5rem] bg-white/5 border border-white/10 p-8 md:p-12 shadow-2xl backdrop-blur-xl relative overflow-hidden">
               <div className="absolute -top-20 -left-20 w-60 h-60 bg-primary/5 rounded-full blur-[100px]" />
               
               <h3 className="text-2xl font-black mb-10 flex items-center gap-3">
                  <CreditCard className="text-primary w-8 h-8" />
                  اختر وسيلة الدفع المناسبة
               </h3>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                 {[
                { id: "card", icon: CreditCard, label: "بطاقة الائتمان", sub: "Visa / Mastercard / Meeza", accent: "primary" },
                { id: "wallet", icon: Smartphone, label: "محافظ إلكترونية", sub: "Vodafone Cash / Instant Pay", accent: "emerald" },
                { id: "fawry", icon: Wallet, label: "كود فوري", sub: "دفع نقدي عبر منافذ فوري", accent: "amber" },
                { id: "internal_wallet", icon: Zap, label: "رصيد المنصة", sub: "استخدم محفظتك الإلكترونية", accent: "indigo" }].
                map((opt) =>
                <label
                  key={opt.id}
                  onClick={() => setPaymentMethod(opt.id as any)}
                  className={`group relative flex items-center gap-4 p-6 rounded-[2rem] border-2 cursor-pointer transition-all active:scale-[0.98] ${paymentMethod === opt.id ? `border-primary bg-primary/10 shadow-lg shadow-primary/5` : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10'}`}>
                  
                     <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${paymentMethod === opt.id ? 'bg-primary text-white scale-110' : 'bg-white/5 text-gray-500 group-hover:text-white'}`}>
                        <opt.icon className="w-7 h-7" />
                     </div>
                     <div className="flex-1">
                        <span className="block font-black text-lg transition-colors">{opt.label}</span>
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wide">{opt.sub}</span>
                        {opt.id === 'internal_wallet' && walletBalance !== null &&
                    <div className={`mt-2 text-xs font-bold ${walletBalance >= course.price ? 'text-emerald-400' : 'text-rose-400'}`}>
                             رصيدك الحالي: {walletBalance.toLocaleString()} ج.م
                          </div>
                    }
                     </div>
                     <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === opt.id ? 'border-primary' : 'border-white/20'}`}>
                        {paymentMethod === opt.id && <div className="w-3 h-3 rounded-full bg-primary" />}
                     </div>
                   </label>
                )}
               </div>

               <div className="space-y-6">
                  <div className="relative group">
                     <Tag className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-500 group-focus-within:text-primary transition-colors" />
                     <input
                    type="text"
                    placeholder="هل لديك كود خصم؟ (أدخل الكود هنا)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-14 text-white font-bold outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all text-center tracking-[0.2em]" />
                  
                  </div>

                  <div className="flex flex-col gap-4">
                     <button
                    disabled={processing || !user || paymentMethod === 'internal_wallet' && (walletBalance || 0) < course.price}
                    onClick={handleCheckout}
                    className="w-full py-6 rounded-3xl bg-primary hover:bg-primary/90 text-white font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-primary/20 transition-all active:scale-[0.96] disabled:opacity-50 disabled:grayscale">
                    
                        {processing ? <Loader2 className="w-7 h-7 animate-spin" /> : <Sparkles className="w-7 h-7" />}
                        <span>{processing ? "جاري الاتصال بالنظام..." : "تأكيد الحجز والبدء الآن"}</span>
                     </button>
                     
                     {paymentMethod === 'internal_wallet' && (walletBalance || 0) < course.price &&
                  <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center gap-3 text-rose-400 text-sm font-bold justify-center">
                          <Info className="w-5 h-5" />
                          <span>رصيد محفظتك غير كافٍ. يرجى الشحن أولاً أو اختيار وسيلة دفع أخرى.</span>
                       </div>
                  }
                  </div>

                  <p className="text-center text-xs text-gray-500 font-medium px-10">
                     بالضغط على تأكيد، أنت توافق على سياسة شحن المحتوى وشروط الخدمة. سيتم إرسال فاتورة إلكترونية مفصلة إلى بريدك المسجل فور النجاح.
                  </p>
               </div>
            </div>

            {/* Support section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                     <HelpCircleIcon className="w-6 h-6" />
                  </div>
                  <div>
                     <h4 className="font-bold text-white tracking-tight">تحتاج مساعدة؟</h4>
                     <p className="text-xs text-gray-500">فريق الدعم متاح 24/7 لمساعدتك</p>
                  </div>
               </div>
               <div className="p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                     <Zap className="w-6 h-6" />
                  </div>
                  <div>
                     <h4 className="font-bold text-white tracking-tight">تفعيل فوري</h4>
                     <p className="text-xs text-gray-500">تمتع بالوصول للمحتوى خلال ثوانٍ</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>);

}

const HelpCircleIcon = ({ className }: {className?: string;}) =>
<svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
  </svg>;