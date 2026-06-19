"use client";

import React from "react";
import { m } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import Link from "next/link";

interface SearchResult {
  id: string;
  type: "course" | "resource" | "task" | "teacher" | "video";
  title: string;
  description: string;
  category: string;
  relevance: number;
  url: string;
  icon: React.ReactNode;
}

interface SearchResultCardProps {
  result: SearchResult;
  index: number;
}

export const SearchResultCard = ({ result, index }: SearchResultCardProps) => {
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      course: "دورة",
      resource: "مورد",
      task: "مهمة",
      teacher: "معلم",
      video: "فيديو"
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      course: "bg-blue-100 text-blue-700",
      resource: "bg-green-100 text-green-700",
      task: "bg-purple-100 text-purple-700",
      teacher: "bg-orange-100 text-orange-700",
      video: "bg-red-100 text-red-700"
    };
    return colors[type] || "bg-gray-100 text-gray-700";
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
    >
      <Link href={result.url}>
        <Card className="bg-black/40 border-white/5 shadow-none hover:bg-white-[0.03] hover:border-white/10 transition-all cursor-pointer rounded-2xl overflow-hidden backdrop-blur-md">
          <CardContent className="p-5">
            <div className="flex items-start gap-5">
              <div className={`rounded-2xl p-3.5 shadow-inner backdrop-blur-md ${getTypeColor(result.type).replace('bg-', 'bg-opacity-20 bg-').replace('text-', 'text-opacity-90 text-')} flex-shrink-0`}>
                {result.icon}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <h3 className="font-bold text-white text-lg truncate">
                    {result.title}
                  </h3>
                  <Badge variant="secondary" className="bg-white/10 text-gray-200 hover:bg-white/20 border-0 whitespace-nowrap">
                    {getTypeLabel(result.type)}
                  </Badge>
                </div>
                
                <p className="text-sm text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                  {result.description}
                </p>

                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-xs border-white/10 text-gray-300">
                    {result.category}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-400/10 px-2 py-1 rounded-md">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span>صلة: {result.relevance}%</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </m.div>
  );
};

export default SearchResultCard;
