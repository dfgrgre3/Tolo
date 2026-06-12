"use client";

import React from "react";
import Link from "next/link";

export function LandingFooter() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 opacity-30">
      <p className="font-black text-[10px] uppercase tracking-[0.2em] text-gray-500">
        TOLO &copy; {new Date().getFullYear()} - THE REALM OF KNOWLEDGE
      </p>
      <div className="flex gap-8">
        <Link href="/terms" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors">
          قوانين المملكة
        </Link>
        <Link href="/privacy" className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors">
          ميثاق الخصوصية
        </Link>
      </div>
    </div>
  );
}
