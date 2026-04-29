"use client";

import { m } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageType } from "./types";

interface RoyalPreviewProps {
  title: string;
  message: string;
  type: MessageType;
  actionUrl?: string;
}

const TYPE_STYLES: Record<MessageType, string> = {
  info: "bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-transparent border-blue-500/30 text-blue-100",
  success: "bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30 text-emerald-100",
  warning: "bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30 text-amber-100",
  error: "bg-gradient-to-br from-rose-500/20 via-red-500/10 to-transparent border-rose-500/30 text-rose-100",
};

export function RoyalPreview({ title, message, type, actionUrl }: RoyalPreviewProps) {
  return (
    <div className="flex items-center justify-center py-6 min-h-[400px]">
      <m.div 
        key={type}
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className={`w-full max-w-md p-8 rounded-[3rem] border shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden transition-all duration-500 ${TYPE_STYLES[type]}`}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <CrownIcon className="w-24 h-24" />
        </div>
        
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 blur-3xl rounded-full" />

        <div className="space-y-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-1 rounded-full ${type === 'info' ? 'bg-blue-400' : type === 'success' ? 'bg-emerald-400' : type === 'warning' ? 'bg-amber-400' : 'bg-rose-400'}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">مرسوم إمبراطوري</span>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-2xl font-black drop-shadow-md leading-tight">
              {title || "عنوان المخطوطة الملكية"}
            </h3>
            <p className="text-lg font-bold leading-relaxed opacity-90 drop-shadow-sm line-clamp-6">
              {message || "هنا سيظهر نص المرسوم الإمبراطوري بكل نقائه وهيبته..."}
            </p>
          </div>

          {actionUrl && (
            <m.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="pt-4"
            >
              <div className="w-full h-14 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-black text-sm border border-white/20 transition-all cursor-default">
                تفاصيل المخطوطة 📜
              </div>
            </m.div>
          )}
        </div>

        <div className="mt-8 flex items-center gap-4 pt-6 border-t border-white/10">
          <div className="relative">
            <Avatar className="h-12 w-12 border-2 border-white/20 shadow-lg">
              <AvatarFallback className="bg-black text-[14px] font-black">TH</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1 border border-black">
              <CrownIcon className="w-2 h-2 text-black" />
            </div>
          </div>
          <div className="flex flex-col">
            <p className="text-xs font-black">من: القيادة العُليا للإمبراطورية</p>
            <div className="flex items-center gap-2">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[10px] font-bold opacity-60">بث مباشر الآن</p>
            </div>
          </div>
        </div>
      </m.div>
    </div>
  );
}

function CrownIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.518l4.276 3.664a1 1 0 0 0 1.516-.294z" />
      <path d="M5 21h14" />
    </svg>
  );
}
