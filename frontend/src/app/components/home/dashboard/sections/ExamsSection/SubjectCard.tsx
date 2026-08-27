"use client";

import React, { memo } from "react";
import { DASH_CARD } from "../../shared/design-system";

interface SubjectCardProps {
  emoji: string;
  name: string;
  onClick: () => void;
}

/** Compact Noon-style subject tile for the exams grid. */
export const SubjectCard = memo(({ emoji, name, onClick }: SubjectCardProps) => (
  <button
    onClick={onClick}
    className={`${DASH_CARD.inner} group flex w-full flex-col items-center justify-center gap-2.5 p-5 text-center transition-colors hover:border-primary`}
    aria-label={`امتحانات مادة ${name}`}
  >
    <div className="text-4xl transition-transform group-hover:scale-110" role="img" aria-hidden="true">
      {emoji}
    </div>
    <div className="text-sm font-black text-foreground group-hover:text-primary-strong transition-colors line-clamp-1">
      {name}
    </div>
    <span className="text-[10px] font-black text-primary-strong transition-colors group-hover:text-primary-strong">
      ابدأ الامتحان
    </span>
  </button>
));

SubjectCard.displayName = "SubjectCard";

export default SubjectCard;
