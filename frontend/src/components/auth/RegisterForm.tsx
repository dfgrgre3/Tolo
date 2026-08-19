"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, AlertCircle, User, Mail, Lock, Gift, Users, Phone } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api/api-client";

export default function RegisterForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("STUDENT");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password || !username || !phone) {
      setError("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    if (password.length < 8) {
      setError("يجب أن تكون كلمة المرور 8 أحرف على الأقل");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // apiClient routes /api/auth/register → Next.js proxy → Go backend.
      // It also attaches CSRF + idempotency headers and unwraps the envelope.
      await apiClient.post("/auth/register", {
        firstName,
        lastName,
        email,
        password,
        username,
        phone,
        role,
        referralCode: referralCode || undefined,
      });

      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err?.message || "حدث خطأ غير متوقع أثناء إنشاء الحساب");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full border border-slate-200/50 dark:border-slate-800/80 shadow-2xl bg-white dark:bg-slate-900">
      <CardHeader className="space-y-2 text-center pb-6">
        <div className="flex justify-center mb-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <UserPlus className="h-6 w-6" />
          </div>
        </div>
        <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50">إنشاء حساب جديد</CardTitle>
        <CardDescription className="text-slate-500 dark:text-slate-400">أدخل بياناتك لإنشاء حساب والبدء في استخدام المنصة</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          {error && (
            <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="font-semibold mr-2">خطأ في إنشاء الحساب</AlertTitle>
              <AlertDescription dir="rtl" className="mr-2">{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="firstName" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">الاسم الأول</Label>
              <div className="relative">
                <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <Input
                  id="firstName"
                  placeholder="أحمد"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lastName" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">الاسم الأخير</Label>
              <div className="relative">
                <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <Input
                  id="lastName"
                  placeholder="علي"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">البريد الإلكتروني</Label>
            <div className="relative">
              <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                <Mail className="h-4 w-4" />
              </span>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                dir="ltr"
                className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">كلمة المرور</Label>
            <div className="relative">
              <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                <Lock className="h-4 w-4" />
              </span>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                dir="ltr"
                className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">اسم المستخدم</Label>
              <div className="relative">
                <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                  <User className="h-4 w-4" />
                </span>
                <Input
                  id="username"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">رقم الهاتف</Label>
              <div className="relative">
                <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                  <Phone className="h-4 w-4" />
                </span>
                <Input
                  id="phone"
                  placeholder="01xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="role" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">نوع الحساب</Label>
              <Select value={role} onValueChange={setRole} disabled={isLoading}>
                <SelectTrigger id="role" className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary text-right flex-row-reverse">
                  <SelectValue placeholder="اختر نوع الحساب" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <SelectItem value="STUDENT" className="text-right justify-end font-medium">طالب</SelectItem>
                  <SelectItem value="PARENT" className="text-right justify-end font-medium">ولي أمر</SelectItem>
                  <SelectItem value="TEACHER" className="text-right justify-end font-medium">معلم</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="referralCode" className="text-slate-700 dark:text-slate-300 font-semibold text-sm">كود الإحالة (اختياري)</Label>
              <div className="relative">
                <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                  <Gift className="h-4 w-4" />
                </span>
                <Input
                  id="referralCode"
                  placeholder="REF-1234"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value)}
                  disabled={isLoading}
                  className="bg-white dark:bg-slate-950 pr-10 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-primary/50 focus:border-primary text-center"
                />
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-4">
          <Button type="submit" className="w-full bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-500/90 text-white font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري التسجيل...
              </>
            ) : (
              "إنشاء الحساب"
            )}
          </Button>
          <div className="text-sm text-center text-slate-500 dark:text-slate-400 font-medium">
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-primary hover:text-primary/80 font-bold hover:underline underline-offset-4">
              تسجيل الدخول
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
