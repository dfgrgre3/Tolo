"use client";

import { m, AnimatePresence } from "framer-motion";
import { X, Download, Star, Eye, Calendar, User, BookOpen, Share2, Heart, ShieldCheck } from "lucide-react";
import { Book } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BookDetailsProps {
  book: Book | null;
  onClose: () => void;
}

export function BookDetails({ book, onClose }: BookDetailsProps) {
  if (!book) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8" dir="rtl">
      {/* Backdrop */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
      />

      {/* Modal */}
      <m.div
        initial={{ opacity: 0, scale: 0.9, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 50 }}
        className="relative w-full max-w-6xl h-full max-h-[850px] bg-black/40 border border-white/10 rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row"
      >
        {/* Left Side: Visuals */}
        <div className="w-full md:w-2/5 relative h-64 md:h-full bg-black/40 border-l border-white/5 overflow-hidden group">
          {book.coverUrl ? (
            <img 
              src={book.coverUrl} 
              alt={book.title} 
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/10 to-blue-500/10">
              <BookOpen className="w-32 h-32 text-amber-500/20" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          
          {/* Top Actions */}
          <div className="absolute top-8 right-8 flex gap-4">
             <button className="p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white hover:bg-amber-500 hover:text-black transition-all">
               <Heart className="w-6 h-6" />
             </button>
             <button className="p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white hover:bg-amber-500 hover:text-black transition-all">
               <Share2 className="w-6 h-6" />
             </button>
          </div>
        </div>

        {/* Right Side: Content */}
        <div className="flex-1 p-10 md:p-16 overflow-y-auto custom-scrollbar-premium space-y-10">
          <div className="flex items-center justify-between">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest">
               <ShieldCheck className="w-3 h-3" />
               <span>محتوى تم التحقق منه</span>
             </div>
             <button 
               onClick={onClose}
               className="p-3 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-gray-500 hover:text-white"
             >
               <X className="w-6 h-6" />
             </button>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
              {book.title}
            </h2>
            <div className="flex items-center gap-4 text-xl text-gray-400 font-bold">
               <User className="w-5 h-5 text-amber-500" />
               <span>{book.author}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Star, label: "التقييم", value: book.rating.toFixed(1), color: "text-amber-500" },
              { icon: Download, label: "التحميلات", value: book.downloads, color: "text-blue-500" },
              { icon: Eye, label: "المشاهدات", value: book.views, color: "text-purple-500" },
              { icon: Calendar, label: "تاريخ النشر", value: new Date(book.createdAt).toLocaleDateString('ar-EG'), color: "text-green-500" },
            ].map((stat, i) => (
              <div key={i} className="p-6 bg-white/5 rounded-3xl border border-white/5 space-y-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <div className="text-2xl font-black text-white">{stat.value}</div>
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <div className="space-y-4">
             <h3 className="text-xl font-black text-white flex items-center gap-3">
               <div className="w-2 h-6 bg-amber-500 rounded-full" />
               عن المخطوطة
             </h3>
             <p className="text-lg text-gray-400 leading-relaxed font-medium">
               {book.description || "لا يوجد وصف متاح لهذه المخطوطة حالياً. ولكنها تحتوي على كنوز علمية قيمة تساعدك في رحلتك التعليمية."}
             </p>
          </div>

          {/* Tags */}
          {book.tags && book.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {book.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="bg-white/5 text-gray-400 border-white/10 hover:text-white px-4 py-1.5 font-bold">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-10 flex flex-col sm:flex-row gap-6">
             <Button 
               asChild
               className="h-20 flex-1 bg-amber-500 text-black font-black rounded-3xl text-xl shadow-2xl shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-4"
             >
               <a href={book.downloadUrl} target="_blank" rel="noreferrer">
                 <span>استدعاء المجلد الأصلي</span>
                 <Download className="w-6 h-6" />
               </a>
             </Button>
             
             <Button 
               variant="outline"
               className="h-20 px-10 bg-white/5 border-white/10 text-white font-black rounded-3xl text-xl hover:bg-white/10 transition-all"
             >
               <span>معاينة سريعة</span>
             </Button>
          </div>
        </div>
      </m.div>
    </div>
  );
}
