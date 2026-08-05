"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { SITE } from '@thanawy/shared/site-config';


export function HeaderLogo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-3 relative z-50"
      prefetch={true}
      scroll={true}>
      
      <div
        className="relative flex items-center justify-center w-12 h-12 rounded-xl overflow-hidden bg-white border border-primary/20 shadow-sm"
      >
        <Image
          src={SITE.logo}
          alt={SITE.name}
          width={48}
          height={48}
          className="h-full w-full object-cover"
          sizes="48px"
          priority />
      </div>
      
      <div className="flex flex-col">
        <h1 className="text-3xl font-black tracking-tighter leading-none text-foreground uppercase">
          {SITE.name}
        </h1>
        <div className="flex items-center gap-1.5 mt-0.5 overflow-hidden">
           <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary whitespace-nowrap">
             {SITE.tagline}
           </span>
        </div>
      </div>
    </Link>);
}