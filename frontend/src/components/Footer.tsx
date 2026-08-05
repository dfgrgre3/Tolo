"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import {
  Twitter,
  Github,
  Linkedin,
  BookOpen,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
} from "lucide-react";
import { SITE, APP_VERSION } from "@thanawy/shared/site-config";

export default function Footer() {
  const pathname = usePathname();

  // Hide footer on teaching pages
  if (pathname?.startsWith('/teaching')) {
    return null;
  }
  // Top 6 categories from backend API (using Next.js API proxy to avoid CSP issues)
  const { data: topCategories = [] } = useQuery({
    queryKey: ["footer-top-categories"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/categories?limit=6');
        if (!response.ok) return [];
        const data = await response.json();
        return data.data || [];
      } catch {
        return [];
      }
    },
  });

  return (
    <footer className="bg-[#0F172A] text-white border-t border-slate-800 pt-16 pb-8 font-sans dir-rtl" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Column 1: About & Social */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-white p-1">
                <Image 
                  src={SITE.logo} 
                  alt={SITE.name} 
                  fill 
                  sizes="40px"
                  className="object-contain" 
                />
              </div>
              <span className="text-xl font-black font-alexandria text-white">{SITE.name}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              المنصة التعليمية العربية الأولى لتطوير المهارات واحتراف البرمجة والتصميم وإدارة الأعمال بشهادات معتمدة.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a href="#" className="h-9 w-9 rounded-md bg-slate-800 hover:bg-[#0F766E] flex items-center justify-center text-slate-300 hover:text-white transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="h-9 w-9 rounded-md bg-slate-800 hover:bg-[#0F766E] flex items-center justify-center text-slate-300 hover:text-white transition-colors">
                <Github className="h-4 w-4" />
              </a>
              <a href="#" className="h-9 w-9 rounded-md bg-slate-800 hover:bg-[#0F766E] flex items-center justify-center text-slate-300 hover:text-white transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-r-2 border-[#0F766E] pr-3">
              روابط سريعة
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
              <li>
                <Link href="/about" className="hover:text-[#F59E0B] transition-colors flex items-center gap-1.5">
                  <ChevronLeft className="h-3 w-3 text-[#0F766E]" /> من نحن
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#F59E0B] transition-colors flex items-center gap-1.5">
                  <ChevronLeft className="h-3 w-3 text-[#0F766E]" /> الشروط والأحكام
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#F59E0B] transition-colors flex items-center gap-1.5">
                  <ChevronLeft className="h-3 w-3 text-[#0F766E]" /> سياسة الخصوصية
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-[#F59E0B] transition-colors flex items-center gap-1.5">
                  <ChevronLeft className="h-3 w-3 text-[#0F766E]" /> الأسئلة الشائعة
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#F59E0B] transition-colors flex items-center gap-1.5">
                  <ChevronLeft className="h-3 w-3 text-[#0F766E]" /> اتصل بنا
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Top Categories */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-r-2 border-[#0F766E] pr-3">
              أهم المجالات
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-400 font-medium">
              {topCategories.map((cat: any) => (
                <li key={cat.id}>
                  <Link href={`/courses?category=${cat.slug}`} className="hover:text-[#F59E0B] transition-colors flex items-center gap-1.5">
                    <ChevronLeft className="h-3 w-3 text-[#0F766E]" /> {cat.name || cat.title}
                  </Link>
                </li>
              ))}
              {topCategories.length === 0 && (
                <>
                  <li><Link href="/courses" className="hover:text-[#F59E0B]">تطوير الويب</Link></li>
                  <li><Link href="/courses" className="hover:text-[#F59E0B]">تطبيقات الموبايل</Link></li>
                  <li><Link href="/courses" className="hover:text-[#F59E0B]">الذكاء الاصطناعي</Link></li>
                </>
              )}
            </ul>
          </div>

          {/* Column 4: Contact Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider border-r-2 border-[#0F766E] pr-3">
              تواصل معنا
            </h3>
            <ul className="space-y-3 text-xs text-slate-400 font-medium">
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-[#0F766E] shrink-0" />
                <span>support@platform.com</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-[#0F766E] shrink-0" />
                <span>+20 100 000 0000</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-[#0F766E] shrink-0" />
                <span>القاهرة، جمهورية مصر العربية</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Rights Bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} {SITE.name}. جميع الحقوق محفوظة.</p>
          <p>الإصدار الحالي: {APP_VERSION}</p>
        </div>
      </div>
    </footer>
  );
}
