"use client";

import React, { useState } from "react";
import { User, CreditCard, Key, ShieldCheck, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function SettingsPanel() {
  const [bio, setBio] = useState("مدرب ومطور تطبيقات واجهات المستخدم بمجموعة متميزة من اللغات مثل JavaScript, TypeScript و React.");
  const [experience, setExperience] = useState("5 سنوات");
  const [paypalEmail, setPaypalEmail] = useState("instructor.paypal@tolo.edu");
  const [apiKey, setApiKey] = useState("tolo_sk_live_583920194857201945");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const generateNewKey = () => {
    setApiKey(`tolo_sk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div>
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">إعدادات المعلم</h3>
        <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">تخصيص ملفك الشخصي كمعلم، وضبط وسائل الدفع وأمن الحساب</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-card">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-850 flex flex-row items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            <CardTitle className="text-sm font-bold text-slate-850 dark:text-slate-100">الملف الشخصي للمدرب</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs font-semibold">
            <div className="space-y-1.5">
              <label className="text-slate-500">النبذة التعريفية (Biography)</label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-xs text-right"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-500">سنوات الخبرة التعليمية</label>
              <Input
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-right"
              />
            </div>
          </CardContent>
        </Card>

        {/* Payout Channels Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-card">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-850 flex flex-row items-center gap-3">
            <CreditCard className="w-5 h-5 text-primary" />
            <CardTitle className="text-sm font-bold text-slate-850 dark:text-slate-100">تفاصيل وسائل سحب الأرباح</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs font-semibold">
            <div className="space-y-1.5">
              <label className="text-slate-500">حساب PayPal الرئيسي لاستلام الأرباح</label>
              <Input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-right"
              />
            </div>
          </CardContent>
        </Card>

        {/* API keys Card */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-card">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-850 flex flex-row items-center gap-3">
            <Key className="w-5 h-5 text-primary" />
            <CardTitle className="text-sm font-bold text-slate-850 dark:text-slate-100">إعدادات المطور ومفاتيح الوصول (API Keys)</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs font-semibold">
            <div className="space-y-1.5">
              <label className="text-slate-500">مفتاح الوصول السري للربط البرمجي (Secret Key)</label>
              <div className="flex gap-2">
                <Input
                  type={showKey ? "text" : "password"}
                  readOnly
                  value={apiKey}
                  className="rounded-xl border-slate-200 dark:border-slate-800 font-mono text-left"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowKey(!showKey)}
                  className="rounded-xl"
                >
                  {showKey ? "إخفاء" : "إظهار"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateNewKey}
                  className="rounded-xl"
                >
                  تجديد المفتاح
                </Button>
              </div>
              <span className="text-[10px] text-slate-400">تحذير: لا تقم بمشاركة هذا المفتاح مع أي شخص أو نشره على واجهات العميل.</span>
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex gap-3 justify-end items-center">
          {saved && (
            <span className="text-xs text-emerald-500 font-bold flex items-center gap-1">
              <Check className="w-4 h-4" />
              تم حفظ الإعدادات بنجاح
            </span>
          )}
          <Button type="submit" className="bg-primary hover:bg-primary/95 text-white rounded-xl px-6">
            حفظ إعدادات الحساب
          </Button>
        </div>
      </form>
    </div>
  );
}
