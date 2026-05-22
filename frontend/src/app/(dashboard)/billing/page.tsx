"use client";

import React, { useState } from "react";
import WalletDashboard from "@/components/billing/WalletDashboard";
import SubscriptionPlans from "@/components/billing/SubscriptionPlans";
import { CreditCard, Wallet, Sparkles, LayoutDashboard, ShieldCheck } from "lucide-react";
import { m, AnimatePresence } from "framer-motion";

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<"wallet" | "upgrade">("wallet");

  return (
    <div className="min-h-screen bg-transparent py-12 px-4 md:px-8 xl:px-12" dir="rtl">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 mb-16">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-black text-sm uppercase tracking-widest bg-primary/10 w-fit px-4 py-1.5 rounded-full border border-primary/20">
            <LayoutDashboard className="w-4 h-4" />
            <span>لوحة التحكم المالية</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
              المركز المالي
            </h1>
            <p className="text-gray-400 font-medium text-lg md:text-xl max-w-xl leading-relaxed">
              تحكم كامل في رصيد محفظتك، اشتراكاتك، وتاريخ معاملاتك المالية في مكان واحد آمن ومميز.
            </p>
          </div>
        </div>

        {/* Premium Tab Switcher */}
        <div className="flex bg-white/5 p-2 rounded-[2.5rem] border border-white/10 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative group">
          <div className="absolute inset-0 bg-primary/5 blur-2xl rounded-[2.5rem] -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <button
            onClick={() => setActiveTab("wallet")}
            className={`relative flex items-center gap-3 px-10 py-4 rounded-[2rem] font-black transition-all duration-500 z-10 ${activeTab === "wallet" ? "text-gray-900" : "text-gray-400 hover:text-white"}`}>
            
            {activeTab === "wallet" &&
            <m.div
              layoutId="activeTabBg"
              className="absolute inset-0 bg-white rounded-[2rem] shadow-2xl -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />

            }
            <Wallet className={`w-5 h-5 transition-transform ${activeTab === "wallet" ? "scale-110" : "group-hover:scale-110"}`} />
            <span>المحفظة والفواتير</span>
          </button>

          <button
            onClick={() => setActiveTab("upgrade")}
            className={`relative flex items-center gap-3 px-10 py-4 rounded-[2rem] font-black transition-all duration-500 z-10 ${activeTab === "upgrade" ? "text-white" : "text-gray-400 hover:text-white"}`}>
            
            {activeTab === "upgrade" &&
            <m.div
              layoutId="activeTabBg"
              className="absolute inset-0 bg-primary rounded-[2rem] shadow-[0_10px_30px_rgba(var(--primary-rgb),0.4)] -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} />

            }
            <Sparkles className={`w-5 h-5 transition-transform ${activeTab === "upgrade" ? "scale-110 text-amber-300" : "text-amber-500"}`} />
            <span>ترقية الحساب</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          <m.div
            key={activeTab}
            initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -40, filter: "blur(10px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
            
            {activeTab === "wallet" ? <WalletDashboard /> : <SubscriptionPlans />}
          </m.div>
        </AnimatePresence>
      </div>

      {/* Footer Assurance */}
      <div className="mt-20 flex flex-col md:flex-row items-center justify-center gap-8 py-10 border-t border-white/5">
        <div className="flex items-center gap-3 text-gray-500 font-bold text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span>تشفير بيانات بنكي (256-bit SSL)</span>
        </div>
        <div className="w-1.5 h-1.5 rounded-full bg-white/10 hidden md:block" />
        <div className="flex items-center gap-3 text-gray-500 font-bold text-sm">
          <CreditCard className="w-5 h-5 text-primary" />
          <span>دعم فوري لجميع طرق الدفع في مصر</span>
        </div>
      </div>
    </div>);

}