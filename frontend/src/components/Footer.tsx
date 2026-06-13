"use client";

import React from "react";
import {
  CheckCircle2,
  Map,
  BookOpen,
  Shield,
  History,
  Twitter,
  Github,
  Linkedin,
  Sparkles,
  Trophy,
  Info,
  Bell } from
"lucide-react";

import { m } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const { user } = useAuth();
  const isMounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const footerLinks = [
  { title: "الأكاديمية", items: [
    { name: "جميع الدورات", href: "/courses", icon: BookOpen },
    { name: "المسارات التعليمية", href: "/pathways", icon: Map },
    { name: "سجل الإنجازات", href: "/courses", icon: Trophy }]
  },
  { title: "المجتمع", items: [
    { name: "المنتدى", href: "/forum", icon: Shield },
    { name: "لوحة الصدارة", href: "/courses", icon: Sparkles },
    { name: "المدونة", href: "/blog", icon: History }]
  },
  { title: "تواصل معنا", items: [
    { name: "عن المنصة", href: "/about", icon: Info },
    { name: "اتصل بنا", href: "/contact", icon: Bell },
    { name: "الشروط والخصوصية", href: "/privacy", icon: Shield }]
  }];


  return (
    <footer className="relative mt-12 sm:mt-16 md:mt-20 border-t border-border bg-background pt-12 sm:pt-16 md:pt-20 pb-8 sm:pb-10 overflow-hidden" dir="rtl">
      {/* --- Ambient Background Effects --- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -bottom-24 -left-24 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-primary/10 blur-[100px] sm:blur-[120px] md:blur-[130px] rounded-full opacity-20" />
        <div className="absolute -top-24 -right-24 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-blue-600/10 blur-[100px] sm:blur-[120px] md:blur-[130px] rounded-full opacity-20" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 md:gap-12 mb-12 sm:mb-14 md:mb-16">
          {/* Brand Section */}
          <div className="space-y-5 sm:space-y-6 sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-xl overflow-hidden bg-white border border-primary/20 transition-all group-hover:scale-110 group-hover:rotate-6 shrink-0">
                <Image
                  src="/logo-tolo.jpg"
                  alt="TOLO"
                  fill
                  priority
                  sizes="48px"
                  className="object-cover" />

              </div>
              <div className="min-w-0">
                <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">TOLO</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1 whitespace-nowrap">المستقبل يبدأ هنا</p>
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs font-medium">
              ساحة المعركة بانتظارك! أكمل مهماتك اليومية، ارفع مستواك، وسيطر على لوحة الصدارة في أكبر منصة تعليمية بأسلوب RPG.
            </p>
            <div className="flex items-center gap-3 sm:gap-4">
              {[Twitter, Github, Linkedin].map((Icon, i) =>
              <button
                key={i}
                aria-label={['Twitter', 'GitHub', 'LinkedIn'][i]}
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-primary/50 transition-all hover:scale-110 min-w-[36px] min-h-[36px]"
              >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Links Sections */}
          {footerLinks.map((section, idx) =>
          <div key={idx} className="space-y-4 sm:space-y-5 md:space-y-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-s-2 border-primary ps-4">
                {section.title}
              </h3>
              <ul className="space-y-3 sm:space-y-4">
                {section.items.map((item, i) =>
                <li key={i}>
                    <Link href={item.href} className="text-gray-500 text-sm font-bold hover:text-primary transition-colors flex items-center gap-2 sm:gap-3 group py-1">
                      {item.icon && <item.icon className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />}
                      <span className="truncate">{item.name}</span>
                    </Link>
                  </li>
              )}
              </ul>
            </div>
          )}
        </div>

        {/* --- Bottom Barrier --- */}
        <div className="relative pt-6 sm:pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex flex-col md:flex-row items-center gap-3 sm:gap-6 text-center md:text-start w-full md:w-auto">
            <p className="font-bold text-gray-600 text-xs sm:text-sm">© {new Date().getFullYear()} TOLO. جميع الحقوق محفوظة.</p>
            {isMounted && user &&
            <m.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 sm:gap-3 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-black max-w-full truncate">

                <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                <span className="truncate">المحارب المتصل: {user.name || user.username || user.email}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              </m.div>
            }
          </div>

          <div className="flex flex-col items-center md:items-end gap-1 opacity-40 text-center md:text-end">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">REALM STATUS: ONLINE</p>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ENGINE VERSION: 4.0.0-RPG</p>
          </div>
        </div>
      </div>
    </footer>);
}
