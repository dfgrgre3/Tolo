"use client";

import React, { useState } from "react";
import { DollarSign, Landmark, CreditCard, ArrowDownCircle, Download, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Transaction } from "../hooks/use-teaching-data";

interface EarningsPanelProps {
  transactions: Transaction[];
}

export default function EarningsPanel({ transactions }: EarningsPanelProps) {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const totalEarnings = transactions
    .filter((tr) => tr.type === "sale")
    .reduce((sum, tr) => sum + tr.amount, 0);

  const totalPayouts = transactions
    .filter((tr) => tr.type === "payout")
    .reduce((sum, tr) => sum + tr.amount, 0);

  const availableBalance = Math.max(0, totalEarnings - totalPayouts);

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    setWithdrawSuccess(true);
    setTimeout(() => {
      setShowWithdrawModal(false);
      setWithdrawSuccess(false);
      setWithdrawAmount("");
    }, 2000);
  };

  const handleExportCSV = () => {
    if (!transactions.length) return;
    const headers = ["ID", "Type", "Course/Description", "Date", "Status", "Amount"];
    const rows = transactions.map((t) => [
      t.id,
      t.type,
      `"${t.courseTitle || (t.type === "payout" ? "Withdrawal" : "Sale")}"`,
      t.date,
      t.status,
      t.amount,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `teaching_transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans">إدارة الأرباح والمستحقات</h3>
          <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">تفاصيل المبيعات وسحوبات الأرباح المصرفية</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-1.5 rounded-xl text-xs">
            <Download className="w-4 h-4" />
            تصدير تقرير CSV
          </Button>
          <Button onClick={() => setShowWithdrawModal(true)} className="bg-primary hover:bg-primary/95 text-white flex items-center gap-1.5 rounded-xl text-xs">
            <ArrowDownCircle className="w-4 h-4" />
            طلب سحب أرباح
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-450 block">إجمالي أرباح المنصة</span>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">${totalEarnings.toLocaleString()}</h3>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500">
              <DollarSign className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 dark:text-slate-450 block">الرصيد المتاح للسحب</span>
              <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">${availableBalance.toLocaleString()}</h3>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-500">
              <Landmark className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout dialog modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-850">
              <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100">طلب سحب رصيد</h4>
              <button onClick={() => setShowWithdrawModal(false)} className="text-slate-400 hover:text-slate-650">X</button>
            </div>
            
            {withdrawSuccess ? (
              <div className="text-center p-6 space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">تم تسجيل طلب السحب بنجاح</p>
                <p className="text-[10px] text-slate-450">سيتم معالجة الطلب وتحويله إلى حسابك خلال 24 - 48 ساعة.</p>
              </div>
            ) : (
              <form onSubmit={handleWithdraw} className="space-y-4 text-xs font-semibold">
                <div className="space-y-1.5">
                  <label className="text-slate-500">المبلغ المطلوب سحبه (بالدولار $)</label>
                  <input
                    type="number"
                    max={availableBalance}
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="مثال: 500"
                    className="w-full text-right px-3 py-2 border border-slate-200 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-700 dark:text-slate-200"
                  />
                  <span className="text-[10px] text-slate-400">الحد الأقصى المتاح: ${availableBalance}</span>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500">طريقة التحويل والسحب</label>
                  <select className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-card text-slate-700 dark:text-slate-200 p-2 text-right focus:outline-none text-xs">
                    <option value="bank">الحساب البنكي الرئيسي (نهاية الرقم *5820)</option>
                    <option value="instapay">انستا باي (InstaPay)</option>
                    <option value="vodafone">فودافون كاش (Vodafone Cash)</option>
                    <option value="paypal">حساب PayPal الرئيسي</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1 bg-primary text-white rounded-xl text-xs">تأكيد طلب السحب</Button>
                  <Button type="button" variant="outline" onClick={() => setShowWithdrawModal(false)} className="rounded-xl text-xs">إلغاء</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Transaction History Table */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-card overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-slate-850 dark:text-slate-100">سجل المعاملات والتحويلات المالية</CardTitle>
          <Button onClick={handleExportCSV} variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-slate-400" title="تصدير ملف CSV">
            <Download className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/20 dark:bg-slate-900/10 border-b border-slate-200 dark:border-slate-800">
                <TableHead className="text-right text-xs font-bold text-slate-500 py-3">المعاملة</TableHead>
                <TableHead className="text-right text-xs font-bold text-slate-500 py-3">تاريخ العملية</TableHead>
                <TableHead className="text-right text-xs font-bold text-slate-500 py-3">النوع</TableHead>
                <TableHead className="text-right text-xs font-bold text-slate-500 py-3">الحالة</TableHead>
                <TableHead className="text-left text-xs font-bold text-slate-500 py-3">القيمة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tr) => (
                <TableRow key={tr.id} className="border-b border-slate-100 dark:border-slate-850/60 hover:bg-slate-50/30 dark:hover:bg-slate-900/10 text-xs">
                  <TableCell className="py-3">
                    <div className="font-bold text-slate-800 dark:text-slate-250">
                      {tr.type === "sale" ? `شراء: ${tr.courseTitle}` : "تحويل أرباح إلى حساب بنكي"}
                    </div>
                    <span className="text-[9px] text-slate-400">معرف: {tr.id}</span>
                  </TableCell>
                  <TableCell className="py-3 text-slate-500">{tr.date}</TableCell>
                  <TableCell className="py-3">
                    <span className={`font-semibold ${tr.type === "sale" ? "text-emerald-500" : "text-blue-500"}`}>
                      {tr.type === "sale" ? "بيع كورس" : "سحب رصيد"}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">
                      مكتملة
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-left font-bold text-slate-800 dark:text-slate-200">
                    {tr.type === "sale" ? `+${tr.amount}$` : `-${tr.amount}$`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
