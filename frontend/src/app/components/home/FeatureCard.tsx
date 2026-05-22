"use client";

import Link from "next/link";
import React from "react";
import { m } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type FeatureCardProps = {
  icon: LucideIcon | React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  color?: string;
  link?: string;
  delay?: number;
};

export default function FeatureCard({
  icon,
  title,
  description,
  badge,
  color = "text-primary",
  link = "#",
  delay = 0,
}: FeatureCardProps) {
  const renderedIcon =
    typeof icon === "function" ? React.createElement(icon, { className: "h-6 w-6" }) : icon;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.35 }}
    >
      <Link href={link}>
        <Card className="h-full rounded-2xl border-white/10 bg-white/5 transition-colors hover:bg-white/10">
          <CardContent className="p-6">
            <div className={`mb-4 inline-flex rounded-xl bg-white/10 p-3 ${color}`}>
              {renderedIcon}
            </div>
            {badge && <p className="mb-2 text-xs font-bold text-primary">{badge}</p>}
            <h3 className="mb-2 text-lg font-black text-foreground">{title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </CardContent>
        </Card>
      </Link>
    </m.div>
  );
}
