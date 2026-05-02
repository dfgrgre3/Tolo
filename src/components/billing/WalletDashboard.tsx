"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  History,

  Plus,
  Download,
  Receipt,


  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  Activity,

  DollarSign,
  Sparkles,
  Star,
  Loader2 } from
"lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  AreaChart,
  Area,



  Tooltip,
  ResponsiveContainer } from
'recharts';
import { WalletHeroSkeleton } from "./BillingSkeletons";
import { apiClient } from "@/lib/api/api-client";

interface Transaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  issueDate: string;
  pdfUrl?: string;
}

const statusMap: Record<string, {label: string;color: string;}> = {
  "COMPLETED": { label: "مكتمل", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  "SUCCESS": { label: "ناجح", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  "PAID": { label: "مدفوع", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  "PENDING": { label: "قيد الانتظار", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  "FAILED": { label: "فشل", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
  "CANCELLED": { label: "ملغي", color: "text-gray-500 bg-gray-500/10 border-gray-500/20" }
};

const typeMap: Record<string, {label: string;icon: any;color: string;bg: string;}> = {
  "DEPOSIT": { label: "إيداع", icon: ArrowUpRight, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  "PAYMENT": { label: "مدفوعات", icon: ArrowDownLeft, color: "text-rose-500", bg: "bg-rose-500/10" },
  "REFUND": { label: "استرداد", icon: History, color: "text-blue-500", bg: "bg-blue-500/10" },
  "REFERRAL_REWARD": { label: "مكافأة", icon: TrendingUp, color: "text-amber-500", bg: "bg-amber-500/10" },
  "BONUS": { label: "بونص", icon: Zap, color: "text-purple-500", bg: "bg-purple-500/10" }
};

const handleComingSoon = () => {
  toast.info("هذه الميزة ستكون متاحة قريباً في التحديث القادم", {
    description: "نحن نعمل بجد لتوفير أفضل تجربة مالية لك.",
    duration: 3000
  });
};

// --- Enhanced Sub-components ---

const VirtualCard = ({ balance }: {balance: number;}) =>
<m.div
  whileHover={{ rotateY: 5, rotateX: -5, scale: 1.02 }}
  className="relative w-full aspect-[1.6/1] rounded-[2.5rem] p-8 overflow-hidden group shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] cursor-pointer">
  
    <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-600 to-primary/80 transition-all duration-700 group-hover:hue-rotate-30" />
    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay" />
    <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-[100px] rounded-full -mr-32 -mt-32" />
    
    <div className="relative h-full flex flex-col justify-between text-white z-10">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">تولو بريميوم</p>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="font-black text-xl italic uppercase tracking-wider">Tolo Platinum</span>
          </div>
        </div>
        <div className="w-12 h-12 bg-white/20 rounded-xl backdrop-blur-md flex items-center justify-center border border-white/30">
          <Zap className="w-6 h-6 text-amber-300" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
           <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">الرصيد المتاح</p>
           <h3 className="text-4xl font-black tracking-tight">{balance?.toLocaleString() || '0'} <span className="text-lg font-bold opacity-60">ج.م</span></h3>
        </div>
        <div className="flex justify-between items-end">
          <div className="flex gap-4">
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase opacity-40">صالح حتى</p>
              <p className="text-xs font-black">12/30</p>
            </div>
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase opacity-40">الاسم</p>
              <p className="text-xs font-black">أحمد محمد</p>
            </div>
          </div>
          <div className="flex items-center -space-x-4">
             <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/40" />
             <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/40" />
          </div>
        </div>
      </div>
    </div>
  </m.div>;


const DepositModal = ({ isOpen, onClose, onDeposit }: {isOpen: boolean;onClose: () => void;onDeposit: (amount: number) => void;}) => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return toast.error("يرجى إدخال مبلغ صحيح");
    setLoading(true);
    await onDeposit(val);
    setLoading(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen &&
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#07080f]/90 backdrop-blur-md" />
        
          <m.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-lg bg-[#111322] border border-white/10 rounded-[3rem] p-10 shadow-2xl overflow-hidden">
          
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-600" />
            
            <div className="flex justify-between items-start mb-10">
              <div className="space-y-2">
                <h3 className="text-3xl font-black text-white">شحن الرصيد</h3>
                <p className="text-gray-400 font-medium">اختر المبلغ الذي تود إضافته لمحفظتك فوراً.</p>
              </div>
              <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors">
                <ArrowRight className="w-6 h-6 text-white rotate-180" />
              </button>
            </div>

            <div className="space-y-8">
              <div className="relative">
                <DollarSign className="absolute right-6 top-1/2 -translate-y-1/2 w-8 h-8 text-primary" />
                <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-[2.2rem] py-8 px-20 text-4xl font-black text-white outline-none focus:border-primary/50 transition-all text-center" />
              
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-500">ج.م</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[50, 100, 250].map((num) =>
              <button
                key={num}
                onClick={() => setAmount(num.toString())}
                className="py-4 rounded-2xl border border-white/10 bg-white/5 hover:bg-primary hover:text-white font-black transition-all transform active:scale-95">
                
                    +{num}
                  </button>
              )}
              </div>

              <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-6 rounded-[2rem] bg-primary hover:bg-primary/90 text-white font-black text-xl transition-all shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 active:scale-[0.98] disabled:opacity-70">
              
                {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Zap className="w-6 h-6" />}
                {loading ? "جاري المعالجة..." : "تأكيد الشحن الآن"}
              </button>
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-3 text-[10px] text-gray-500 font-black uppercase tracking-widest bg-white/5 py-4 rounded-2xl border border-white/5">
               <ShieldCheck className="w-4 h-4 text-emerald-500" />
               بوابات دفع مشفرة وآمنة تماماً
            </div>
          </m.div>
        </div>
      }
    </AnimatePresence>);

};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success("تم نسخ رقم المعاملة");
};

export default function WalletDashboard() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"activity" | "invoices">("activity");
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      const walletData = await apiClient.get<any>("/billing/wallet");

      setBalance(walletData?.balance || 0);
      setTransactions(walletData?.history || walletData?.transactions || []);
      setInvoices(walletData?.invoices || []);
    } catch (_error) {
      toast.error("فشل في تحميل بيانات المحفظة");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeposit = async (amount: number) => {
    try {
      const data = await apiClient.post<any>("/billing/wallet", { amount });

      setBalance(data.balance);
      toast.success(data.message || "تم الشحن بنجاح");
      fetchData(); // Refresh history
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const chartData = useMemo(() => {
    if (transactions.length === 0) return [];

    let currentBalance = balance;
    const history = [...transactions].reverse().map((tx) => {
      const point = {
        name: format(new Date(tx.createdAt), "dd MMM", { locale: ar }),
        balance: currentBalance
      };
      currentBalance -= tx.amount;
      return point;
    }).reverse();

    return history;
  }, [transactions, balance]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = transactions.filter((tx) => {
      const date = new Date(tx.createdAt);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const spent = Math.abs(thisMonth.filter((tx) => tx.amount < 0).reduce((acc, curr) => acc + curr.amount, 0));
    const received = thisMonth.filter((tx) => tx.amount > 0).reduce((acc, curr) => acc + curr.amount, 0);

    return { spent, received };
  }, [transactions]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    transactions.forEach((tx) => {
      const date = format(new Date(tx.createdAt), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(tx);
    });
    return groups;
  }, [transactions]);

  return (
    <div className="space-y-12" dir="rtl">
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        onDeposit={handleDeposit} />
      

      {/* Hero Section */}
      {loading ?
      <WalletHeroSkeleton /> :

      <section className="relative overflow-hidden rounded-[4rem] bg-gradient-to-br from-[#1a1c2e] via-[#101222] to-[#010205] p-1 shadow-[0_40px_100px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-40 pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-purple-500/20 rounded-full blur-[100px] opacity-40 pointer-events-none" />
          
          <div className="relative rounded-[3.9rem] bg-[#101222]/40 backdrop-blur-3xl p-8 md:p-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Card & Chart Group */}
              <div className="space-y-12">
                <VirtualCard balance={balance} />
                
                <div className="flex flex-wrap gap-6">
                  <m.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsDepositModalOpen(true)}
                  className="group relative overflow-hidden bg-primary px-12 py-6 rounded-[2.2rem] font-black text-white shadow-[0_20px_50px_rgba(var(--primary-rgb),0.5)] flex items-center gap-4 transition-all">
                  
                    <Plus className="w-7 h-7" />
                    <span className="text-xl">شحن الحساب</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  </m.button>
                  <m.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleComingSoon}
                  className="group px-12 py-6 rounded-[2.2rem] border-2 border-white/10 bg-white/5 text-white font-black backdrop-blur-xl transition-all hover:bg-white/10 hover:border-white/20 flex items-center gap-4">
                  
                    <ArrowUpRight className="w-7 h-7 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    <span className="text-xl">سحب نقدي</span>
                  </m.button>
                </div>
              </div>

              {/* Progress & Stats */}
              <div className="space-y-10">
                <div className="h-[280px] w-full bg-white/5 rounded-[3rem] p-8 border border-white/10 backdrop-blur-sm relative group overflow-hidden shadow-inner">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-primary/20 rounded-xl">
                        <Activity className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-black text-gray-300 uppercase tracking-[0.2em]">تحليل النمو</span>
                    </div>
                    <div className="text-[10px] bg-emerald-500/10 text-emerald-500 font-black px-3 py-1 rounded-full border border-emerald-500/20">صاعد +12%</div>
                  </div>
                  
                  <div className="h-full">
                    {chartData.length > 1 ?
                  <ResponsiveContainer width="100%" height="80%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <Tooltip
                        contentStyle={{ backgroundColor: '#07080f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                        itemStyle={{ color: '#fff', fontWeight: '900' }}
                        cursor={{ stroke: '#8b5cf6', strokeWidth: 2, strokeDasharray: '5 5' }} />
                      
                          <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="#8b5cf6"
                        strokeWidth={6}
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                        animationDuration={2500} />
                      
                        </AreaChart>
                      </ResponsiveContainer> :

                  <div className="h-[80%] flex flex-col items-center justify-center text-gray-500 gap-4">
                        <TrendingUp className="w-16 h-16 opacity-10 animate-pulse" />
                        <p className="text-sm font-bold opacity-40">بيانات النمو ستظهر هنا قريباً</p>
                      </div>
                  }
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  {[
                { label: "منصرف هـذا الشهر", val: stats.spent, icon: ArrowDownLeft, color: "text-rose-400", bg: "bg-rose-500/10" },
                { label: "توفير تولو", val: 450, icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" }].
                map((s, i) =>
                <div key={i} className="bg-white/5 rounded-[2.2rem] p-6 border border-white/5 transition-all hover:bg-white/10">
                      <div className={`${s.bg} ${s.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
                        <s.icon className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-black text-gray-500 mb-1">{s.label}</p>
                      <h4 className="text-2xl font-black text-white">{s.val.toLocaleString()} <span className="text-xs opacity-40 font-bold">ج.م</span></h4>
                    </div>
                )}
                </div>
              </div>
            </div>
          </div>
        </section>
      }

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
           <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex bg-[#111322] p-2 rounded-3xl border border-white/10 shadow-2xl">
                <button
                onClick={() => setActiveTab("activity")}
                className={`px-10 py-4 rounded-2xl font-black transition-all text-sm flex items-center gap-3 ${activeTab === "activity" ? "bg-primary text-white shadow-xl shadow-primary/30" : "text-gray-500 hover:text-white"}`}>
                
                  <History className="w-4 h-4" />
                  السجل المالي
                </button>
                <button
                onClick={() => setActiveTab("invoices")}
                className={`px-10 py-4 rounded-2xl font-black transition-all text-sm flex items-center gap-3 ${activeTab === "invoices" ? "bg-primary text-white shadow-xl shadow-primary/30" : "text-gray-500 hover:text-white"}`}>
                
                  <Receipt className="w-4 h-4" />
                  الفواتير الضريبية
                </button>
              </div>

              <button
              onClick={handleComingSoon}
              className="group flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-2xl px-6 py-4 border border-white/10 transition-all">
              
                <Download className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                <span className="text-sm font-black text-white">تصدير PDF</span>
              </button>
           </div>

           <AnimatePresence mode="wait">
             <m.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8">
              
                {activeTab === "activity" ?
              Object.entries(groupedTransactions).length > 0 ?
              Object.entries(groupedTransactions).map(([date, txs]) =>
              <div key={date} className="space-y-4">
                        <div className="flex items-center gap-4 px-4 text-gray-400">
                           <span className="text-[10px] font-black uppercase tracking-[0.3em]">{format(new Date(date), "dd MMMM yyyy", { locale: ar })}</span>
                           <div className="h-px flex-grow bg-white/5" />
                        </div>
                        <div className="grid gap-3">
                          {txs.map((tx) => {
                    const type = typeMap[tx.type] || { label: tx.type, icon: Wallet, color: "text-gray-400", bg: "bg-gray-500/10" };
                    return (
                      <m.div
                        key={tx.id}
                        whileHover={{ x: -10 }}
                        onClick={() => copyToClipboard(tx.id)}
                        className="group p-6 rounded-[2.2rem] bg-white dark:bg-[#0c0d16] border border-gray-100 dark:border-white/5 hover:border-primary/40 transition-all flex items-center justify-between gap-6 shadow-sm hover:shadow-2xl cursor-pointer">
                        
                                <div className="flex items-center gap-6">
                                  <div className={`w-16 h-16 rounded-2xl ${type.bg} ${type.color} flex items-center justify-center transition-all group-hover:scale-110 shadow-inner`}>
                                    <type.icon className="w-7 h-7" />
                                  </div>
                                  <div className="space-y-1">
                                    <h4 className="font-black text-gray-900 dark:text-white text-lg">{tx.description}</h4>
                                    <p className="text-xs text-gray-500 flex items-center gap-2">
                                      <span className={`${type.bg} ${type.color} px-2 py-0.5 rounded-md font-black text-[8px]`}>{type.label}</span>
                                      ⬢ {format(new Date(tx.createdAt), "hh:mm a", { locale: ar })}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-left flex flex-col items-end gap-2">
                                  <h3 className={`text-2xl font-black ${tx.amount > 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                    {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} <span className="text-sm">ج.م</span>
                                  </h3>
                                  <div className={`text-[9px] font-black px-3 py-1 rounded-full border ${tx.amount > 0 ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" : "text-rose-500 bg-rose-500/10 border-rose-500/20"}`}>
                                    {tx.amount > 0 ? "مكتمل" : "تم الخصم"}
                                  </div>
                                </div>
                              </m.div>);

                  })}
                        </div>
                      </div>
              ) :

              <div className="py-32 bg-white/5 rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center gap-6">
                       <History className="w-16 h-16 text-gray-700 animate-pulse" />
                       <p className="text-gray-400 font-bold">لا يوجد سجل معاملات حتى الآن</p>
                    </div> :


              invoices.length > 0 ?
              invoices.map((inv) =>
              <div key={inv.id} className="p-8 rounded-[3rem] bg-white dark:bg-[#0c0d16] border border-white/5 flex items-center justify-between group shadow-xl">
                        <div className="flex items-center gap-8">
                           <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center transition-all group-hover:bg-primary group-hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]">
                              <Receipt className="w-10 h-10 text-primary group-hover:text-white transition-colors" />
                           </div>
                           <div className="space-y-1">
                              <h4 className="text-xl font-black text-white">{inv.invoiceNumber}</h4>
                              <p className="text-sm text-gray-500 font-bold">{format(new Date(inv.issueDate), "dd MMMM yyyy", { locale: ar })}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-10">
                           <div className="text-left">
                              <span className="block text-3xl font-black text-white">{inv.amount.toLocaleString()} ج.م</span>
                              <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase ${statusMap[inv.status]?.color}`}>{statusMap[inv.status]?.label}</span>
                           </div>
                           <button className="p-5 rounded-2xl bg-white/5 hover:bg-primary text-gray-400 hover:text-white transition-all transform hover:rotate-12">
                              <Download className="w-8 h-8" />
                           </button>
                        </div>
                      </div>
              ) :

              <div className="py-32 bg-white/5 rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center gap-6">
                       <Receipt className="w-16 h-16 text-gray-700 animate-pulse" />
                       <p className="text-gray-400 font-bold">لا يوجد فواتير صادرة حالياً</p>
                    </div>

              }
             </m.div>
           </AnimatePresence>
        </div>

        {/* Sidebar */}
        <div className="space-y-10">
           {/* Security Insight */}
           <div className="p-8 rounded-[3rem] bg-gradient-to-br from-emerald-500/20 via-emerald-500/5 to-transparent border border-emerald-500/20 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-[50px] rounded-full group-hover:scale-110 transition-transform" />
              <ShieldCheck className="w-12 h-12 text-emerald-500 mb-6" />
              <h4 className="text-2xl font-black text-white mb-2 tracking-tight">أمان بنكي 100%</h4>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">جميع معاملاتك مشفرة ومؤمنة بأحدث معايير الأمان العالمية لحمايتك.</p>
           </div>

           {/* Rewards Card */}
           <div className="p-8 rounded-[3rem] bg-gradient-to-br from-amber-500/20 via-primary/10 to-transparent border border-amber-500/10">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-amber-500 rounded-2xl shadow-xl shadow-amber-500/20">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-xl font-black text-white">نظام الولاء</h4>
              </div>
              <div className="space-y-6">
                <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                   <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-black text-gray-400">مستوى التقدم</span>
                      <span className="text-xs font-black text-amber-500">Gold Tier</span>
                   </div>
                   <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <m.div initial={{ width: 0 }} animate={{ width: "75%" }} className="h-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                   </div>
                </div>
                <button
                onClick={handleComingSoon}
                className="w-full py-4 rounded-2xl bg-white text-gray-900 font-black text-sm hover:bg-amber-500 hover:text-white transition-all transform active:scale-95">
                
                  استبدال النقاط
                </button>
              </div>
           </div>

           {/* Support */}
           <div className="p-8 rounded-[3rem] bg-[#111322] border border-white/5 flex flex-col items-center text-center gap-6 group">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                 <Zap className="w-10 h-10 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                 <h4 className="text-xl font-black text-white">دعم مالي فني</h4>
                 <p className="text-xs text-gray-500 font-medium">فريقنا متواجد 24/7 لمساعدتك في أي استفسار مالي.</p>
              </div>
              <button className="text-primary font-black text-sm hover:underline">تحدث معنا الآن</button>
           </div>
        </div>
      </div>
    </div>);

}