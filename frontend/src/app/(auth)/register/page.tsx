import Link from "next/link";
import { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";
import { GraduationCap } from "lucide-react";

export const metadata: Metadata = {
  title: "إنشاء حساب | Tolo",
  description: "أنشئ حساباً جديداً في منصة Tolo التعليمية للبدء في التعلم واكتساب مهارات جديدة.",
};

export default function RegisterPage() {
  return (
    <div className="w-full min-h-[75vh] grid lg:grid-cols-12 gap-8 items-center justify-center">
      {/* Visual / Info Left Panel (Desktop only) */}
      <div className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 h-full min-h-[600px] flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-10 text-white shadow-2xl border border-slate-800">
        {/* Soft grid background */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/20 rounded-full blur-[80px]" />
        
        {/* Branding header */}
        <div className="relative z-20 flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-orange-400 flex items-center justify-center shadow-lg shadow-primary/20">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <Link href="/" className="text-2xl font-black tracking-wider bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent hover:opacity-90 transition-opacity">
            Tolo
          </Link>
        </div>

        {/* Dynamic center info */}
        <div className="relative z-20 my-auto max-w-lg space-y-6">
          <h2 className="text-3xl font-black leading-tight text-white/95">
            ابدأ رحلتك التعليمية معنا اليوم واكتشف طرقاً جديدة للتعلم
          </h2>
          <p className="text-slate-400 text-base leading-relaxed">
            أنشئ حسابك الآن وانضم إلى آلاف الطلاب المتفوقين. اختر دورتك التدريبية المفضلة، تفاعل مع المعلمين، واحصل على شهادات معتمدة تسهم في بناء مستقبلك.
          </p>
        </div>

        {/* Info footer */}
        <div className="relative z-20 mt-auto bg-slate-900/60 backdrop-blur-md p-6 rounded-xl border border-white/5 shadow-xl">
          <div className="flex gap-6 justify-around text-center">
            <div>
              <p className="text-2xl font-black text-primary">+15K</p>
              <p className="text-xs text-slate-400">طالب نشط</p>
            </div>
            <div className="border-r border-slate-800" />
            <div>
              <p className="text-2xl font-black text-primary">+200</p>
              <p className="text-xs text-slate-400">معلم خبير</p>
            </div>
            <div className="border-r border-slate-800" />
            <div>
              <p className="text-2xl font-black text-primary">+500</p>
              <p className="text-xs text-slate-400">دورة تعليمية</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Right Panel */}
      <div className="lg:col-span-6 xl:col-span-5 w-full flex items-center justify-center py-4">
        <div className="w-full max-w-[500px] mx-auto">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}