"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { HelpCircle, X, BookOpen, Video, MessageCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface HelpItem {
  id: string;
  title: string;
  description: string;
  url?: string;
  type: "article" | "video" | "faq" | "guide";
}

const helpItemsByPath: Record<string, HelpItem[]> = {
  "/": [
  {
    id: "getting-started",
    title: "دليل البدء السريع",
    description: "تعرف على كيفية استخدام المنصة",
    url: "/help/getting-started",
    type: "guide"
  },
  {
    id: "features",
    title: "الميزات الرئيسية",
    description: "استكشف جميع الميزات المتاحة",
    url: "/help/features",
    type: "article"
  }],

  "/courses": [
  {
    id: "course-navigation",
    title: "كيفية التنقل في الدورات",
    description: "تعلم كيفية استكشاف الدورات المتاحة",
    url: "/help/courses",
    type: "guide"
  },
  {
    id: "enroll-course",
    title: "كيفية التسجيل في دورة",
    description: "خطوات التسجيل في دورة جديدة",
    url: "/help/enroll",
    type: "article"
  }],

  "/time": [
  {
    id: "time-tracking",
    title: "كيفية تتبع الوقت",
    description: "تعلم كيفية استخدام أداة تتبع الوقت",
    url: "/help/time-tracking",
    type: "guide"
  },
  {
    id: "time-tips",
    title: "نصائح لإدارة الوقت",
    description: "نصائح لتحسين إنتاجيتك",
    url: "/help/time-tips",
    type: "article"
  }]

};

export function ContextualHelp() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [helpItems, setHelpItems] = useState<HelpItem[]>([]);

  useEffect(() => {
    // Find matching help items for current path
    const matchedPath = Object.keys(helpItemsByPath).find((path) =>
    pathname?.startsWith(path)
    );
    setHelpItems(matchedPath ? helpItemsByPath[matchedPath] : []);
  }, [pathname]);

  const getIcon = (type: string) => {
    switch (type) {
      case "article":
        return <BookOpen className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "guide":
        return <MessageCircle className="h-4 w-4" />;
      default:
        return <HelpCircle className="h-4 w-4" />;
    }
  };

  if (helpItems.length === 0) return null;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
			<DropdownMenuTrigger asChild>
				<Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 hover:bg-primary/10 dark:hover:bg-primary/15"
          aria-label="مساعدة سياقية"
          title="مساعدة">
          
					<HelpCircle className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
				<div className="flex items-center justify-between px-4 py-3 border-b">
					<div className="flex items-center gap-2">
						<HelpCircle className="h-4 w-4 text-primary" />
						<span className="font-semibold text-sm">مساعدة</span>
					</div>
					<Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsOpen(false)}>
            
						<X className="h-3 w-3" />
					</Button>
				</div>
				<div className="p-2 space-y-1">
					<AnimatePresence>
						{helpItems.map((item, index) =>
            <motion.a
              key={item.id}
              href={item.url || "#"}
              target={item.url?.startsWith("http") ? "_blank" : undefined}
              rel={item.url?.startsWith("http") ? "noopener noreferrer" : undefined}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg",
                "hover:bg-accent transition-colors cursor-pointer",
                "group"
              )}
              onClick={() => setIsOpen(false)}>
              
								<div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 text-primary shrink-0">
									{getIcon(item.type)}
								</div>
								<div className="flex-1 min-w-0 text-right">
									<div className="flex items-center justify-between gap-2 mb-1">
										<p className="text-sm font-medium text-foreground">{item.title}</p>
										{item.url &&
                  <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  }
									</div>
									<p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
								</div>
							</motion.a>
            )}
					</AnimatePresence>
				</div>
				<div className="border-t px-4 py-2">
					<a
            href="/help"
            className="text-xs text-primary hover:underline text-center block"
            onClick={() => setIsOpen(false)}>
            
						عرض جميع المقالات المساعدة
					</a>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>);

}