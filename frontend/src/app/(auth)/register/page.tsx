import Link from "next/link";
import { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";
import { BookOpenCheck, GraduationCap, ShieldCheck, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "إنشاء حساب | Tolo",
  description: "أنشئ حساباً جديداً في منصة Tolo التعليمية للبدء في التعلم واكتساب مهارات جديدة.",
};

export default function RegisterPage() {
  return (
    <div className="grid w-full items-center gap-8 lg:grid-cols-12">
      <section className="hidden min-h-[560px] flex-col justify-between rounded-3xl border border-[#0f766e]/20 bg-[#0f766e] p-10 text-white shadow-xl lg:col-span-6 lg:flex xl:col-span-7" aria-labelledby="register-benefits-title">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <GraduationCap className="h-6 w-6" />
          </div>
          <Link href="/" className="text-2xl font-black tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f766e]">Tolo</Link>
        </div>

        <div className="max-w-lg space-y-6">
          <p className="text-sm font-bold text-teal-100">منصة تعلم موثوقة للطلاب</p>
          <h2 id="register-benefits-title" className="text-3xl font-black leading-tight">ابدأ رحلتك التعليمية بخطوة واضحة</h2>
          <p className="text-base leading-8 text-teal-50">أنشئ حسابك للوصول إلى الدورات والاختبارات ومتابعة تقدمك في مساحة تعليمية منظمة.</p>
          <ul className="grid gap-4 text-sm font-semibold text-teal-50">
            <li className="flex items-center gap-3"><BookOpenCheck className="h-5 w-5 shrink-0" />محتوى ودورات مرتبة حسب احتياجك</li>
            <li className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 shrink-0" />حماية للحساب وتحقق متعدد المراحل</li>
            <li className="flex items-center gap-3"><Users className="h-5 w-5 shrink-0" />متابعة تقدمك في مكان واحد</li>
          </ul>
        </div>

        <p className="border-t border-white/20 pt-5 text-sm text-teal-100">تعلمك اليوم يبني فرصك غداً.</p>
      </section>

      <div className="flex w-full items-center justify-center py-4 lg:col-span-6 xl:col-span-5">
        <div className="mx-auto w-full max-w-[500px]">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}