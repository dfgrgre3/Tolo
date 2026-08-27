"use client";

import React, { useMemo } from "react";
import { StatCardProps } from "./types";
import { DASH_CARD } from "./design-system";

/** Compact Noon-style metric tile: small icon square + bold value + label. */
const StatCard = ({ icon, value, label, color }: StatCardProps) => {
  const { displayValue, suffix } = useMemo(() => {
    const stringValue = String(value);
    const match = stringValue.match(/(\d+)(.*)/);
    if (match) {
      return { displayValue: parseInt(match[1]!, 10), suffix: match[2] };
    }
    return { displayValue: 0, suffix: "" };
  }, [value]);

  // The `color`/`delay` props are kept in the signature for backward
  // compatibility; Noon style uses a single flat accent tone.
  void color;

  return (
    <div className={`${DASH_CARD.stat} flex items-center gap-3 group hover:border-primary transition-colors`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary-strong">
        {React.cloneElement(icon, { className: "h-5 w-5" })}
      </div>
      <div className="min-w-0">
        <div className={`${DASH_CARD.statValue} leading-tight flex items-baseline gap-0.5`}>
          <span>{displayValue.toLocaleString("ar-EG")}</span>
          {suffix && <span className="text-xs font-bold text-muted-foreground">{suffix}</span>}
        </div>
        <p className={`${DASH_CARD.statLabel} mt-0.5 truncate`}>{label}</p>
      </div>
    </div>
  );
};

export default StatCard;
