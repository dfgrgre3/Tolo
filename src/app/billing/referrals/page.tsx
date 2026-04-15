"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  Gift, 
  Share2, 
  Copy, 
  CheckCircle2, 
  TrendingUp,
  Wallet,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { logger } from '@/lib/logger';

interface ReferralStats {
  referralCode: string;
  referralCount: number;
  totalEarned: number;
  pendingRewards: number;
  history: any[];
}

export default function ReferralsPage() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

   useEffect(() => {
     async function fetchStats() {
       try {
         const res = await fetch('/api/users/referrals');
         if (res.ok) {
           const data = await res.json();
           setStats(data);
         }
       } catch (err) {
         logger.error("Error: " + (err instanceof Error ? err.message : String(err)));
       } finally {
         setLoading(false);
       }
     }
     fetchStats();
   }, []);

  const copyCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      setCopied(true);
      toast.success("تم نسخ الكود بنجاح");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/register?ref=${stats?.referralCode}`
    : '';

  if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0c]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500 border-r-2" />
        </div>
      );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white pt-24 pb-12 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-full text-sm font-bold mb-4"
            >
                <Gift size={16} />
                برنامج الإحالة والمكافآت
            </motion.div>
            <h1 className="text-4xl font-extrabold mb-4">ادعُ أصدقاءك واكسب رصيداً!</h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
                شارك كود الإحالة الخاص بك مع زملائك. عند اشتراك أي صديق باستخدام كودك، ستحصل أنت على <span className="text-green-400 font-bold">20 ج.م</span> في محفظتك فوراً.
            </p>
        </header>

        {/* Share Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="md:col-span-2 bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-blue-500/20 rounded-full blur-[100px]" />
                
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Share2 size={20} className="text-blue-400" />
                    كود الإحالة الخاص بك
                </h3>
                
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 bg-black/40 border border-white/10 p-4 rounded-2xl flex items-center justify-between group-hover:border-blue-500/30 transition-all">
                        <span className="text-2xl font-black text-white tracking-widest uppercase">{stats.referralCode}</span>
                        <button 
                            onClick={copyCode}
                            className="p-2 hover:bg-white/10 rounded-lg transition-all text-gray-400 hover:text-white"
                        >
                            {copied ? <CheckCircle2 size={20} className="text-green-500" /> : <Copy size={20} />}
                        </button>
                    </div>
                    <button 
                        onClick={() => {
                            navigator.clipboard.writeText(referralLink);
                            toast.success("تم نسخ رابط الدعوة");
                        }}
                        className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                    >
                        نسخ رابط الدعوة
                        <ArrowRight size={18} className="rotate-180" />
                    </button>
                </div>
            </div>

            <div className="bg-[#111114] border border-white/5 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center text-green-500 mb-4">
                    <Wallet size={32} />
                </div>
                <div className="text-3xl font-black mb-1">{stats.totalEarned.toLocaleString()} ج.م</div>
                <div className="text-gray-500 text-sm font-bold uppercase tracking-widest">إجمالي أرباحك</div>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
            <div className="bg-[#111114] border border-white/5 p-6 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                    <Users size={24} />
                </div>
                <div>
                    <div className="text-2xl font-bold">{stats.referralCount}</div>
                    <div className="text-gray-500 text-xs">أصدقاء انضموا عبر كودك</div>
                </div>
            </div>
            <div className="bg-[#111114] border border-white/5 p-6 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-500">
                    <TrendingUp size={24} />
                </div>
                <div>
                    <div className="text-2xl font-bold">{stats.pendingRewards}</div>
                    <div className="text-gray-500 text-xs">مكافآت قيد الانتظار</div>
                </div>
            </div>
        </div>

        {/* History Table */}
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            سجل المكافآت
        </h2>
        <div className="bg-[#111114] border border-white/5 rounded-3xl overflow-hidden">
            <table className="w-full text-right">
                <thead>
                    <tr className="border-b border-white/5 bg-white/2">
                        <th className="px-6 py-4 text-sm font-bold text-gray-400">الصديق</th>
                        <th className="px-6 py-4 text-sm font-bold text-gray-400">القيمة</th>
                        <th className="px-6 py-4 text-sm font-bold text-gray-400">الحالة</th>
                        <th className="px-6 py-4 text-sm font-bold text-gray-400">التاريخ</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {stats.history.map((reward) => (
                        <tr key={reward.id} className="hover:bg-white/2 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-bold">{reward.referred?.name || "طالب جديد"}</div>
                            </td>
                            <td className="px-6 py-4 text-green-400 font-bold">+{reward.amount} ج.م</td>
                            <td className="px-6 py-4">
                                <span className="px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold">مكتمل</span>
                            </td>
                            <td className="px-6 py-4 text-gray-500 text-sm">
                                {new Date(reward.createdAt).toLocaleDateString('ar-EG')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {stats.history.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                    <p>لم تقم بدعوة أي أصدقاء حتى الآن. ابدأ بالمشاركة الآن!</p>
                </div>
            )}
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
        body { font-family: 'Cairo', sans-serif; }
      `}</style>
    </div>
  );
}
