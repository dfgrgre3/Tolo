"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CreditCard,
  Wallet,
  Smartphone,
  ShieldCheck,
  Tag,
  Loader2,
  CheckCircle2,
  AlertCircle,
  GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

interface CourseCheckoutInfo {
  id: string;
  name: string;
  nameAr?: string;
  price: number;
  thumbnailUrl?: string;
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
  
  useEffect(() => {
    if (!courseId) return;

    fetch(`/api/courses/${courseId}`)
      .then(res => res.json())
      .then(data => {
        if (data.subject) {
          setCourse({
            id: data.subject.id,
            name: data.subject.name,
            nameAr: data.subject.nameAr,
            price: data.subject.price || 0,
            thumbnailUrl: data.subject.thumbnailUrl
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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
          couponCode: couponCode || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
         toast.error(data.error || "حدث خطأ أثناء تهيئة الدفع");
         return;
      }

      if (data.success && data.finalAmount === 0) {
        toast.success("تم تسجيلك في الدورة بنجاح!");
        router.push(`/courses/${courseId}`);
        return;
      }

      if (paymentMethod === "internal_wallet" && data.success) {
        toast.success("تم الشراء باستخدام الرصيد بنجاح!");
        router.push(`/courses/${courseId}`);
        return;
      }

      if (data.paymentKey && data.iframeId) {
        setIframeUrl(`https://accept.paymob.com/api/acceptance/iframes/${data.iframeId}?payment_token=${data.paymentKey}`);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0B0D14]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0B0D14] text-gray-800 dark:text-white">
        <div className="text-center">
          <AlertCircle className="mx-auto w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">الدورة غير موجودة</h2>
          <p className="text-gray-500">لم يتم العثور على الدورة المطلوبة.</p>
        </div>
      </div>
    );
  }
  
  if (iframeUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0B0D14] flex flex-col pt-[72px]" dir="rtl">
        <div className="bg-white/10 text-white p-4 flex justify-between items-center shadow-md">
          <h2 className="font-bold">إتمام الدفع</h2>
          <button 
            onClick={() => setIframeUrl(null)}
            className="text-white hover:text-red-400 font-medium px-4 py-2 bg-white/5 rounded-xl transition"
          >
            إلغاء العملية ويرجوع للدورة
          </button>
        </div>
        <iframe
          src={iframeUrl}
          className="flex-1 w-full bg-white"
          allow="payment"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0D14] py-12 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left column: Course Details */}
        <div className="order-2 md:order-1">
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/80 p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="text-primary w-6 h-6" />
              تفاصيل الدورة
            </h2>
            
            <div className="aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4">
              {course.thumbnailUrl ? (
                <img src={course.thumbnailUrl} alt={course.nameAr || course.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <GraduationCap className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>

            <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">{course.nameAr || course.name}</h3>
            
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/10">
              <div className="flex justify-between items-center mb-4 text-lg">
                <span className="text-gray-600 dark:text-gray-400">سعر الدورة</span>
                <span className="font-bold text-gray-900 dark:text-white">{course.price} ج.م</span>
              </div>
              <div className="flex justify-between items-center text-xl font-black text-primary">
                <span>الإجمالي الدفع</span>
                <span>{course.price} ج.م</span>
              </div>
            </div>
            
            <div className="mt-6 flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-sm">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <p>عملية الدفع آمنة ومشفرة بالكامل. ستحصل على وصول فوري للدورة فور إتمام الدفع بنجاح.</p>
            </div>
          </div>
        </div>

        {/* Right column: Payment Methods */}
        <div className="order-1 md:order-2 space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/80 p-6 shadow-xl">
             <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">طريقة الدفع</h2>

             <div className="space-y-3 mb-8">
              {[
                { id: "card", icon: CreditCard, label: "بطاقة ائتمان / مدى", sub: "دفع آمن وفوري باستخدام بطاقتك البنكية" },
                { id: "wallet", icon: Smartphone, label: "المحافظ الإلكترونية", sub: "فودافون كاش، اتصالات، أورانج" },
                { id: "fawry", icon: Wallet, label: "نقداً عبر فوري", sub: "ادفع في أي منفذ فوري يقبل المدفوعات" },
                { id: "internal_wallet", icon: Wallet, label: "رصيد المحفظة", sub: "خصم من رصيد محفظتك على المنصة" }
              ].map((m) => (
                <label 
                  key={m.id} 
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentMethod === m.id ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-800 hover:border-primary/50'}`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={m.id}
                    checked={paymentMethod === m.id}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-5 h-5 accent-primary"
                  />
                  <div className={"flex items-center justify-center w-10 h-10 rounded-lg " + (paymentMethod === m.id ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500")}>
                    <m.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{m.label}</h4>
                    <p className="text-xs text-gray-500">{m.sub}</p>
                  </div>
                </label>
              ))}
             </div>

             <div className="relative mb-8">
               <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                 <Tag className="w-5 h-5" />
               </div>
               <input 
                 type="text" 
                 placeholder="لديك كود خصم؟" 
                 value={couponCode}
                 onChange={(e) => setCouponCode(e.target.value)}
                 className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl py-3 px-10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-left"
                 dir="ltr"
               />
             </div>

             <button
               disabled={processing || !user}
               onClick={handleCheckout}
               className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
             >
               {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
               <span>{processing ? "جاري المعالجة..." : "إتمام الشراء والانضمام"}</span>
             </button>
             {!user && <p className="text-center text-red-500 text-sm mt-3 font-medium">الرجاء تسجيل الدخول أولاً</p>}
          </div>
        </div>

      </div>
    </div>
  );
}

const Lock = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
)
