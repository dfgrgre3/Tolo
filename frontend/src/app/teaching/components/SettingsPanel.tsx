"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/api-client";
import { User, CreditCard, Key, Check } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface SettingsData {
  bio?: string;
  experience?: string;
  paypalEmail?: string;
  apiKey?: string;
}

export default function SettingsPanel() {
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data } = useQuery<SettingsData>({
    queryKey: ["teaching", "settings"],
    queryFn: () => apiClient.get<SettingsData>("/api/teaching/settings"),
    retry: 1,
  });

  useEffect(() => {
    if (data) {
      if (data.bio !== undefined) setBio(data.bio);
      if (data.experience !== undefined) setExperience(data.experience);
      if (data.paypalEmail !== undefined) setPaypalEmail(data.paypalEmail);
      if (data.apiKey !== undefined) setApiKey(data.apiKey);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (body: SettingsData) => apiClient.patch("/api/teaching/settings", body),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ bio, experience, paypalEmail, apiKey });
  };

  const generateNewKey = () => {
    apiClient
      .post<{ apiKey: string }>("/api/teaching/settings/api-key", {})
      .then((res) => {
        if (res.apiKey) setApiKey(res.apiKey);
      })
      .catch(() => {
        setApiKey("");
      });
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
                placeholder="اكتب نبذة تعريفية عن خبراتك الأكاديمية..."
                rows={4}
                className="rounded-xl border-slate-200 dark:border-slate-800 text-xs text-right"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-slate-500">سنوات الخبرة التعليمية</label>
              <Input
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="مثال: 5 سنوات"
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
                placeholder="email@paypal.com"
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
                  placeholder="لا يوجد مفتاح مجدد حالياً"
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
          <Button type="submit" disabled={saveMutation.isPending} className="bg-primary hover:bg-primary/95 text-white rounded-xl px-6">
            {saveMutation.isPending ? "جاري الحفظ..." : "حفظ إعدادات الحساب"}
          </Button>
        </div>
      </form>
    </div>
  );
}
