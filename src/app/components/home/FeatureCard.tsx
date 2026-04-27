"use client";

import React from "react";
import { m } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { FeatureItem } from "./types";
import { rpgCommonStyles } from "./constants";

export const FeatureCard = ({ icon, title, description, badge, link, color, delay = 0 }: FeatureItem) => {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -8 }}
      className="h-full"
    >
      <Card className={`${rpgCommonStyles.card} h-full group hover:border-primary/40`}>
        {/* Hover Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
        
        <CardHeader className="pb-3 relative z-10 space-y-4">
          <div className="flex justify-between items-start">
            <div className={`w-14 h-14 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner ${color ? color : 'text-gray-200'}`}>
              {/* Clone icon to enforce size if needed, though usually handled by parent size */}
              {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-7 h-7" })}
            </div>
            {badge && (
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/20 backdrop-blur-sm">
                {badge}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl font-bold text-gray-100 group-hover:text-primary transition-colors line-clamp-1">
            {title}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="relative z-10">
          <p className="text-muted-foreground mb-6 text-sm leading-relaxed min-h-[60px]">
            {description}
          </p>
          
          <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-700/50 to-transparent mb-4"></div>
          
          {link ? (
            <Button variant="link" className="p-0 h-auto font-medium text-primary group/btn hover:text-primary/80">
              تفاصيل أكثر
              <ChevronRight className={`mr-1 h-4 w-4 group-hover/btn:translate-x-1 transition-transform rtl:rotate-180 rtl:group-hover/btn:-translate-x-1`} />
            </Button>
          ) : (
            <div className="h-4" /> // Spacer to keep card height consistent
          )}
        </CardContent>
      </Card>
    </m.div>
  );
};

export default FeatureCard;
