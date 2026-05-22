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


  if (!isMounted) return null;

  return (
    <footer className="relative mt-20 border-t border-border bg-background pt-20 pb-10 overflow-hidden" dir="rtl">
      {/* --- Ambient Background Effects --- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/10 blur-[130px] rounded-full opacity-20" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 blur-[130px] rounded-full opacity-20" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand Section */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative h-12 w-12 rounded-xl overflow-hidden bg-white border border-primary/20 transition-all group-hover:scale-110 group-hover:rotate-6">
                <Image
                  src="/logo-tolo.jpg"
                  alt="TOLO"
                  fill
                  priority
                  sizes="48px"
                  className="object-cover" />
                
              </div>
              <div>
                <h2 className="text-3xl font-black text-foreground tracking-tight">TOLO</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">المستقبل يبدأ هنا</p>
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs font-medium">
              ساحة المعركة بانتظارك! أكمل مهماتك اليومية، ارفع مستواك، وسيطر على لوحة الصدارة في أكبر منصة تعليمية بأسلوب RPG.
            </p>
            <div className="flex items-center gap-4">
              {[Twitter, Github, Linkedin].map((Icon, i) =>
              <button key={i} className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-primary/50 transition-all hover:scale-110">
                  <Icon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Links Sections */}
          {footerLinks.map((section, idx) =>
          <div key={idx} className="space-y-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-r-2 border-primary pr-4">
                {section.title}
              </h3>
              <ul className="space-y-4">
                {section.items.map((item, i) =>
                <li key={i}>
                    <Link href={item.href} className="text-gray-500 text-sm font-bold hover:text-primary transition-colors flex items-center gap-3 group">
                      {item.icon && <item.icon className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity whitespace-nowrap" />}
                      <span>{item.name}</span>
                    </Link>
                  </li>
              )}
              </ul>
            </div>
          )}
        </div>

        {/* --- Bottom Barrier --- */}
        <div className="relative pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <p className="font-bold text-gray-600 text-sm">© {new Date().getFullYear()} TOLO. جميع الحقوق محفوظة.</p>
            {user &&
            <m.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black">
              
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>المحارب المتصل: {user.name || user.username || user.email}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </m.div>
            }
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-1 opacity-40">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">REALM STATUS: ONLINE</p>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">ENGINE VERSION: 4.0.0-RPG</p>
          </div>
        </div>
      </div>
    </footer>);
}