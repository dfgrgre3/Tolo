"use client";

import { m, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Download, Eye, Star, Book as BookIcon, Sparkles } from "lucide-react";
import { Book } from "./types";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface BookCardProps {
  book: Book;
  onClick?: (book: Book) => void;
  index: number;
}

export function BookCard({ book, onClick, index }: BookCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // 3D Hover Effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setIsHovered(false);
  };

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      style={{ perspective: 1000 }}
      className="group relative h-full"
    >
      <m.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={() => setIsHovered(true)}
        onClick={() => onClick?.(book)}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="rpg-glass relative h-full cursor-pointer flex flex-col overflow-visible border-white/5 bg-white/[0.03] transition-all duration-300 hover:border-amber-500/30"
      >
        {/* Shine Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2.5rem] overflow-hidden">
           <div className="absolute -inset-[100%] bg-gradient-to-tr from-transparent via-white/5 to-transparent rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </div>

        {/* Book Cover */}
        <div className="relative aspect-[3/4] m-4 rounded-2xl overflow-hidden shadow-2xl bg-black/40 group-hover:shadow-amber-500/10 transition-shadow duration-500" style={{ transform: "translateZ(30px)" }}>
           {book.coverUrl ? (
             <img 
               src={book.coverUrl} 
               alt={book.title}
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
             />
           ) : (
             <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 via-transparent to-blue-500/10">
               <BookIcon className="w-16 h-16 text-amber-500/20" />
             </div>
           )}
           
           {/* Overlay Gradient */}
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
           
           {/* Rating Badge */}
           <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md border border-white/10 px-2 py-1 rounded-lg flex items-center gap-1.5" style={{ transform: "translateZ(40px)" }}>
             <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
             <span className="text-[10px] font-black text-white">{book.rating.toFixed(1)}</span>
           </div>

           {/* Subject Badge */}
           <div className="absolute top-3 right-3" style={{ transform: "translateZ(40px)" }}>
             <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 backdrop-blur-md font-black text-[9px] uppercase tracking-tighter">
               {book.subject?.name || book.subjectId}
             </Badge>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 pt-2 space-y-4 flex flex-col" style={{ transform: "translateZ(20px)" }}>
           <div className="space-y-1.5 flex-1">
             <h3 className="text-lg font-black text-white group-hover:text-amber-400 transition-colors line-clamp-2 leading-tight">
               {book.title}
             </h3>
             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
               بواسطة: {book.author}
             </p>
           </div>

           {/* Stats */}
           <div className="flex items-center justify-between pt-4 border-t border-white/5">
             <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5 text-gray-500">
                 <Download className="w-3.5 h-3.5" />
                 <span className="text-[10px] font-black">{book.downloads}</span>
               </div>
               <div className="flex items-center gap-1.5 text-gray-500">
                 <Eye className="w-3.5 h-3.5" />
                 <span className="text-[10px] font-black">{book.views}</span>
               </div>
             </div>
             
             {isHovered && (
               <m.div 
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="flex items-center gap-1 text-amber-500"
               >
                 <Sparkles className="w-3 h-3 animate-pulse" />
                 <span className="text-[9px] font-black uppercase tracking-widest">عرض التفاصيل</span>
               </m.div>
             )}
           </div>
        </div>
      </m.div>
      
      {/* Decorative Shadow/Glow */}
      <div className="absolute -inset-1 bg-amber-500/20 blur-2xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 -z-10" />
    </m.div>
  );
}
