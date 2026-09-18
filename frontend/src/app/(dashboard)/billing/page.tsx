"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
// استيراد مباشر: الصفحة "use client" أصلاً، والتحميل الكسول عبر next/dynamic
// يتعطل مع Turbopack في بيئة التطوير (module factory is not available).
import WalletDashboard from "@/components/billing/WalletDashboard";
import SubscriptionPlans from "@/components/billing/SubscriptionPlans";
import {
  BillingPageHeader,
} from "@/components/billing/billing-ui";
import {
  CreditCard,
  Wallet,
  Sparkles,
  LayoutDashboard,
  ShieldCheck,
  Receipt,
  Gift,
  Crown,
  ArrowUpLeft,
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

type BillingTab = "wallet" | "upgrade";

function BillingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab: BillingTab = searchParams.get("tab") === "upgrade" ? "upgrade" : "wallet";
  const [activeTab, setActiveTab] = useState<BillingTab>(initialTab);

  const switchTab = (tab: BillingTab) => {
    setActiveTab(tab);
    // مزامنة التبويب مع الرابط حتى تعمل مشاركة الروابط وزري الرجوع/التقدم
    router.replace(tab === "upgrade" ? "/billing?tab=upgrade" : "/billing", { scroll: false });
  };

  return (
    <div className="min-h-screen bg-transparent py-12 px-4 md:px-8 xl:px-12" dir="rtl">
      <BillingPageHeader
        badge="لوحة التحكم المالية"
        BadgeIcon={LayoutDashboard}
        title="المركز المالي"
        description="تحكم كامل في رصيد محفظتك، اشتراكاتك، وتاريخ معاملاتك المالية في مكان واحد آمن ومميز."
        action={
          <div
            className="flex bg-gray-50 dark:bg-white/5 p-2 rounded-[2.5rem] border border-gray-200 dark:border-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative"
            role="tablist"
            aria-label="أقسام المركز المالي"
          >
            <button
              role="tab"
              aria-selected={activeTab === "wallet"}
              onClick={() => switchTab("wallet")}
              className={`relative flex items-center gap-3 px-8 md:px-10 py-4 rounded-[2rem] font-black transition-all duration-500 z-10 ${activeTab === "wallet" ? "text-gray-900" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}
            >
              {activeTab === "wallet" &&
                <m.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-white rounded-[2rem] shadow-2xl -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
              }
              <Wallet className="w-5 h-5" />
              <span>المحفظة والفواتير</span>
            </button>

            <button
              role="tab"
              aria-selected={activeTab === "upgrade"}
              onClick={() => switchTab("upgrade")}
              className={`relative flex items-center gap-3 px-8 md:px-10 py-4 rounded-[2rem] font-black transition-all duration-500 z-10 ${activeTab === "upgrade" ? "text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"}`}
            >
              {activeTab === "upgrade" &&
                <m.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-primary rounded-[2rem] shadow-[0_10px_30px_rgba(var(--primary-rgb),0.4)] -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />
              }
              <Sparkles className={`w-5 h-5 ${activeTab === "upgrade" ? "text-amber-300" : "text-amber-500"}`} />
              <span>ترقية الحساب</span>
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto">
        {/* اختصارات سريعة لأقسام النظام المالي */}
        <nav aria-label="اختصارات مالية" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { href: "/subscription", icon: Receipt, title: "الاشتراك والفواتير", hint: "خطتك الحالية وسجل المدفوعات", active: false },
            { href: "/billing/referrals", icon: Gift, title: "برنامج الإحالة", hint: "ادعُ أصدقاءك واكسب رصيداً", active: false },
            { href: "/billing?tab=upgrade", icon: Crown, title: "ترقية الحساب", hint: "قارن الباقات واشترك", active: activeTab === "upgrade" },
          ].map((s) => (
            <Link
              key={s.href + s.title}
              href={s.href}
              onClick={s.href.includes("tab=upgrade") ? (e) => { e.preventDefault(); switchTab("upgrade"); } : undefined}
              className={`group flex items-center gap-4 rounded-[1.8rem] border p-5 transition-all hover:-translate-y-1 ${
                s.active
                  ? "border-primary/40 bg-primary/5"
                  : "border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary/40 hover:bg-primary/5"
              }`}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary transition-transform group-hover:scale-110">
                <s.icon size={22} />
              </span>
              <span className="flex-1 text-start">
                <span className="block font-black text-gray-900 dark:text-white">{s.title}</span>
                <span className="block text-xs text-gray-500 font-medium">{s.hint}</span>
              </span>
              <ArrowUpLeft size={18} className="text-gray-400 shrink-0 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1" />
            </Link>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <m.div
            key={activeTab}
            role="tabpanel"
            initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -40, filter: "blur(10px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>

            {activeTab === "wallet" ? <WalletDashboard /> : <SubscriptionPlans />}
          </m.div>
        </AnimatePresence>
      </div>

      {/* Footer Assurance */}
      <div className="mt-20 flex flex-col md:flex-row items-center justify-center gap-8 py-10 border-t border-gray-200 dark:border-white/5">
        <div className="flex items-center gap-3 text-gray-500 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span>تشفير بيانات بنكي (256-bit SSL)</span>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-gray-200 dark:bg-white/10 hidden md:block" />
        <div className="flex items-center gap-3 text-gray-500 font-bold text-sm">
          <CreditCard className="w-5 h-5 text-primary" />
          <span>دعم فوري لجميع طرق الدفع في مصر</span>
        </div>
      </div>
    </div>);
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="h-[400px] w-full bg-gray-50 dark:bg-white/5 animate-pulse rounded-2xl" />}>
      <BillingPageContent />
    </Suspense>
  );
}
