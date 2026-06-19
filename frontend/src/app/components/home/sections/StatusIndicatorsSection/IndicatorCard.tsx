"use client";

import React from "react";
import { m } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

interface StatusIndicatorProps {
  indicator: {
    id: string;
    label: string;
    status: "online" | "offline" | "warning" | "error";
    value: string;
    icon: React.ReactNode;
    description: string;
  };
  index: number;
}

export const IndicatorCard = ({ indicator, index }: StatusIndicatorProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "warning":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "error":
        return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      default:
        return "bg-white/10 text-gray-400 border-white/20";
    }
  };

  return (
    <m.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className="bg-black/40 border-white/5 shadow-none hover:bg-white/[0.03] hover:border-white/10 transition-all rounded-2xl backdrop-blur-md">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className={`rounded-xl p-2.5 shadow-inner backdrop-blur-md border ${getStatusColor(indicator.status)}`}>
              {indicator.icon}
            </div>
            <Badge className={`${getStatusColor(indicator.status)} border bg-transparent bg-opacity-10 shadow-none`}>
              {indicator.status === "online" ? (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              {indicator.value}
            </Badge>
          </div>
          
          <h3 className="font-bold text-white mb-2 text-lg">
            {indicator.label}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2">
            {indicator.description}
          </p>
        </CardContent>
      </Card>
    </m.div>
  );
};

export default IndicatorCard;
