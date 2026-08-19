"use client";

import React, { memo } from "react";
import { rpgCommonStyles } from "../../shared/styles";

interface SubjectCardProps {
  emoji: string;
  name: string;
  onClick: () => void;
}

export const SubjectCard = memo(({ emoji, name, onClick }: SubjectCardProps) => (
  <button
    onClick={onClick}
    className={`${rpgCommonStyles.card} group w-full flex flex-col items-center justify-center gap-5 hover:border-red-500/40 hover:bg-black/40 min-h-[180px] relative overflow-hidden backdrop-blur-2xl p-6`}
    aria-label={`تحدي مادة ${name}`}
  >
    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100" />
    <div className="text-6xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] filter group-hover:brightness-125 relative z-10" role="img" aria-hidden="true">{emoji}</div>
    <div className="text-xl font-black text-gray-100 group-hover:text-red-400 tracking-tight relative z-10">{name}</div>
    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/0 group-hover:text-red-500/100 mt-1 relative z-10">بداية المعركة</div>
  </button>
));

SubjectCard.displayName = "SubjectCard";

export default SubjectCard;
