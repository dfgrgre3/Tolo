"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { 
  Settings,
  TrendingUp,
  Ticket,
  Plus,
  Trash2,
  XCircle,
  Search,
  Percent,
  Activity } from

"lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxUses: number | null;
  usedCount: number;
  expiryDate: string | null;
  isActive: boolean;
  minOrderAmount: number;
  createdAt: string;
  _count?: {
    payments: number;
  };
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

  // Form State
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    discountValue: "",
    description: "",
    maxUses: "",
    expiryDate: "",
    minOrderAmount: ""
  });

  const fetchCoupons = async () => {
    try {
      const res = await fetch("/api/admin/coupons");
      if (res.ok) {
        const data = await res.json();
        setCoupons(data);
      }
    } catch (_err) {
      toast.error("خطأ في جلب الأكواد");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCoupon.code || !newCoupon.discountValue) {
      return toast.error("يرجى إكمال البيانات الأساسية");
    }

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCoupon)
      });

      if (res.ok) {
        toast.success("تم إنشاء الكود بنجاح!");
        fetchCoupons();
        setIsAdding(false);
        setNewCoupon({
          code: "",
          discountType: "PERCENTAGE",
          discountValue: "",
          description: "",
          maxUses: "",
          expiryDate: "",
          minOrderAmount: ""
        });
      } else {
        const data = await res.json();
        toast.error(data.error || "فشل إنشاء الكود");
      }
    } catch (_err) {
      toast.error("حدث خطأ غير متوقع");
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !current })
      });
      if (res.ok) {
        toast.success("تم تحديث الحالة");
        fetchCoupons();
      }
    } catch (_err) {
      toast.error("فشل التحديث");
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الكود؟ لا يمكن التراجع!")) return;
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("تم حذف الكود");
        fetchCoupons();
      }
    } catch (_err) {
      toast.error("فشل الحذف");
    }
  };

  const filtered = coupons.filter((c) => {
    const matchesSearch = c.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === "all" || (activeFilter === "active" ? c.isActive : !c.isActive);
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: coupons.length,
    active: coupons.filter((c) => c.isActive).length,
    totalUses: coupons.reduce((sum, c) => sum + (c._count?.payments || c.usedCount), 0)
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-white p-8 font-inter" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 text-blue-500 text-sm mb-2">
                <Settings size={16} />
                لوحة تحكم الإدارة
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
               <Ticket size={28} className="text-blue-500" />
               إدارة أكواد الخصم والترويج
            </h1>
          </div>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95">
            
            {isAdding ? <XCircle size={18} /> : <Plus size={18} />}
            {isAdding ? "إلغاء العملية" : "إنشاء كود جديد"}
          </button>
        </header>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
           <div className="bg-[#111114] border border-white/5 p-6 rounded-2xl flex items-center gap-6">
               <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                   <Ticket size={24} />
               </div>
               <div>
                   <p className="text-gray-400 text-xs">إجمالي الأكواد</p>
                   <h3 className="text-2xl font-bold">{stats.total}</h3>
               </div>
           </div>
           <div className="bg-[#111114] border border-white/5 p-6 rounded-2xl flex items-center gap-6">
               <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                   <Activity size={24} />
               </div>
               <div>
                   <p className="text-gray-400 text-xs">الأكواد الفعالة</p>
                   <h3 className="text-2xl font-bold text-green-400">{stats.active}</h3>
               </div>
           </div>
           <div className="bg-[#111114] border border-white/5 p-6 rounded-2xl flex items-center gap-6">
               <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                   <TrendingUp size={24} />
               </div>
               <div>
                   <p className="text-gray-400 text-xs">إجمالي مرات الاستخدام</p>
                   <h3 className="text-2xl font-bold">{stats.totalUses}</h3>
               </div>
           </div>
        </div>

        <AnimatePresence>
          {isAdding &&
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#111114] border border-blue-500/20 rounded-3xl p-8 mb-12 overflow-hidden">
            
              <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
                  <Plus size={20} className="text-blue-500" />
                  إضافة كود خصم جديد
              </h2>
              <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">الكود (Code)</label>
                   <input
                  type="text"
                  placeholder="مثلاً: EID2024"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all" />
                
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">نوع الخصم</label>
                   <select
                  value={newCoupon.discountType}
                  onChange={(e) => setNewCoupon({ ...newCoupon, discountType: e.target.value as "PERCENTAGE" | "FIXED" })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all">
                  
                       <option value="PERCENTAGE">نسبة مئوية (%)</option>
                       <option value="FIXED">قيمة ثابتة (ج.م)</option>
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">القيمة</label>
                   <div className="relative">
                       <input
                    type="number"
                    placeholder="مثلاً: 50"
                    value={newCoupon.discountValue}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discountValue: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pr-10 pl-4 py-3 text-sm focus:border-blue-500 outline-none transition-all text-left" />
                  
                       <div className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400">
                           {newCoupon.discountType === "PERCENTAGE" ? <Percent size={14} /> : <span className="text-xs">ج.م</span>}
                       </div>
                   </div>
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">تاريخ الانتهاء (اختياري)</label>
                   <input
                  type="date"
                  value={newCoupon.expiryDate}
                  onChange={(e) => setNewCoupon({ ...newCoupon, expiryDate: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all" />
                
                </div>
                <div className="md:col-span-2">
                   <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">الوصف</label>
                   <input
                  type="text"
                  placeholder="مثلاً: خصم العيد الكبير لكل الطلاب"
                  value={newCoupon.description}
                  onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all" />
                
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">أقصى استخدام</label>
                   <input
                  type="number"
                  placeholder="مثلاً: 100"
                  value={newCoupon.maxUses}
                  onChange={(e) => setNewCoupon({ ...newCoupon, maxUses: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all" />
                
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">الحد الأدنى للشراء</label>
                   <input
                  type="number"
                  placeholder="0"
                  value={newCoupon.minOrderAmount}
                  onChange={(e) => setNewCoupon({ ...newCoupon, minOrderAmount: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none transition-all" />
                
                </div>
                <div className="md:col-span-4 flex justify-end gap-3 mt-4">
                    <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm transition-all">
                  
                        إلغاء
                    </button>
                    <button
                  type="submit"
                  className="px-8 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-600/20">
                  
                        حفظ الكود
                    </button>
                </div>
              </form>
            </motion.div>
          }
        </AnimatePresence>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
              type="text"
              placeholder="ابحث عن كود معين..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#111114] border border-white/5 rounded-2xl pr-12 pl-4 py-4 text-sm focus:border-blue-500 outline-none transition-all" />
            
            </div>
            <div className="flex bg-[#111114] border border-white/5 rounded-2xl p-1 gap-1">
                <button
              onClick={() => setActiveFilter("all")}
              className={`px-6 py-3 rounded-xl text-sm transition-all ${activeFilter === "all" ? "bg-white/10 text-white" : "text-gray-400 hover:text-white"}`}>
              
                    الكل
                </button>
                <button
              onClick={() => setActiveFilter("active")}
              className={`px-6 py-3 rounded-xl text-sm transition-all ${activeFilter === "active" ? "bg-green-500/10 text-green-400" : "text-gray-400 hover:text-white"}`}>
              
                    مفعل
                </button>
                <button
              onClick={() => setActiveFilter("inactive")}
              className={`px-6 py-3 rounded-xl text-sm transition-all ${activeFilter === "inactive" ? "bg-red-500/10 text-red-500" : "text-gray-400 hover:text-white"}`}>
              
                    معطل
                </button>
            </div>
        </div>

        {/* Coupons Table */}
        <div className="bg-[#111114] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-white/5 bg-white/2">
                  <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">الكود</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">الخصم</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">الاستخدام</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider">تاريخ الصلاحية</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider text-center">الحالة</th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-400 uppercase tracking-wider text-left">أدوات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((coupon) =>
                <tr key={coupon.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                           <Ticket size={20} />
                        </div>
                        <div>
                           <div className="font-mono font-bold text-lg">{coupon.code}</div>
                           <div className="text-xs text-gray-400">{coupon.description || "لا يوجد وصف"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <span className={`inline-flex items-center gap-1 font-bold ${coupon.discountType === 'PERCENTAGE' ? 'text-purple-400' : 'text-orange-400'}`}>
                           {coupon.discountValue} {coupon.discountType === 'PERCENTAGE' ? "%" : "ج.م"}
                       </span>
                    </td>
                    <td className="px-6 py-5">
                        <div className="flex flex-col gap-1 w-24">
                           <div className="flex justify-between text-[10px] text-gray-400">
                               <span>استخدم {coupon._count?.payments || coupon.usedCount}</span>
                               {coupon.maxUses && <span>من {coupon.maxUses}</span>}
                           </div>
                           <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                               <div
                          className="h-full bg-blue-500"
                          style={{ width: `${coupon.maxUses ? coupon.usedCount / coupon.maxUses * 100 : 100}%` }} />
                        
                           </div>
                        </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-400">
                        {coupon.expiryDate ? format(new Date(coupon.expiryDate), "dd MMMM yyyy", { locale: ar }) : "مفتوح"}
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex justify-center">
                        <button
                        onClick={() => toggleStatus(coupon.id, coupon.isActive)}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                        coupon.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`
                        }>
                        
                           {coupon.isActive ? "مفعل" : "معطل"}
                        </button>
                       </div>
                    </td>
                    <td className="px-6 py-5">
                       <div className="flex items-center justify-end gap-2">
                          <button
                        onClick={() => deleteCoupon(coupon.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                        
                            <Trash2 size={18} />
                          </button>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 &&
          <div className="p-20 text-center flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
                    <Search size={32} />
                </div>
                <p className="text-gray-400">لم يتم العثور على أي أكواد خصم تطابق بحثك.</p>
                <button onClick={() => setIsAdding(true)} className="text-blue-500 hover:underline">أضف كود جديد الآن</button>
            </div>
          }
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Cairo', 'Inter', sans-serif; }
      `}</style>
    </div>);

}
