"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Megaphone, 
  Trophy, 
  Search, 
  Calendar, 
  User, 
  Clock, 
  Shield, 
  Sword, 
  ChevronRight,
  Zap,
  Sparkles,
  Crown,
  Map,
  Plus
} from "lucide-react";
import { ensureUser } from "@/lib/user-utils";
import { logger } from '@/lib/logger';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Announcement = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  publishedAt: string;
  expiresAt?: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  authorName: string;
  tags: string[];
  views: number;
};

type Contest = {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  startDate: string;
  endDate: string;
  prize?: string;
  category: string;
  organizerName: string;
  tags: string[];
  participantsCount: number;
};

const STYLES = {
  glass: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-6 transition-all",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [activeTab, setActiveTab] = useState<"announcements" | "contests">("announcements");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureUser();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [annRes, conRes] = await Promise.all([
          fetch("/api/announcements"),
          fetch("/api/contests")
        ]);
        if (annRes.ok) setAnnouncements(await annRes.json());
        if (conRes.ok) setContests(await conRes.json());
      } catch (err) {
        logger.error("Failed to fetch community data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(item => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.content.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    }).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [announcements, activeCategory, searchTerm]);

  const filteredContests = useMemo(() => {
    return contests.filter(item => {
      const matchesCategory = activeCategory === "all" || item.category === activeCategory;
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [contests, activeCategory, searchTerm]);

  const categories = [
    { id: "all", name: "كل البلاغات", icon: Megaphone },
    { id: "academic", name: "شؤون العلم", icon: Crown },
    { id: "administrative", name: "إدارة المملكة", icon: Shield },
    { id: "events", name: "الاحتفالات", icon: Sparkles },
    { id: "competitions", name: "تحديات الفرسان", icon: Sword },
  ];

  return (
    <div className="min-h-screen bg-background text-gray-100 overflow-hidden pb-40" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] bg-primary/10 blur-[150px] rounded-full opacity-30" />
        <div className="absolute bottom-[20%] left-[5%] w-[500px] h-[500px] bg-purple-600/5 blur-[130px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
        
        {/* --- Hero Section: The Royal Square --- */}
        <motion.div 
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           className={STYLES.glass + " p-12 md:p-24 relative group overflow-hidden"}
        >
           <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
           <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
              <div className="space-y-8 flex-1 text-center lg:text-right">
                 <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                    <Megaphone className="h-5 w-5" />
                    <span>منشورات البلاط الملكي</span>
                 </div>
                 <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-tight">
                    ساحة <span className={STYLES.neonText}>الإعلانات</span> <br /> والمسابقات
                 </h1>
                 <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    هنا تصدر المراسيم الملكية، وتظڈعلن تحديات المملكة الكبرى. ابقِ متيقظاً لكل جديد في رحلتك نحو السيادة.
                 </p>
                 <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-6">
                    <Link href="/announcements/new">
                       <Button className="h-14 px-8 bg-white text-black font-black rounded-2xl gap-3 hover:scale-105 transition-all">
                          <Plus className="w-5 h-5" />
                          <span>إضافة بلاغ جديد</span>
                       </Button>
                    </Link>
                    <Link href="/contests/new">
                       <Button variant="outline" className="h-14 px-8 border-white/10 bg-white/5 font-black rounded-2xl gap-3 hover:bg-white/10 transition-all">
                          <span>إنشاء تحدي (مسابقة)</span>
                       </Button>
                    </Link>
                 </div>
              </div>

              <div className="relative w-72 h-72 hidden lg:block">
                 <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full animate-pulse" />
                 <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                   className="absolute inset-0 border border-dashed border-primary/20 rounded-full"
                 />
                 <div className="absolute inset-6 border border-white/5 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-3xl shadow-2xl">
                    <Map className="w-32 h-32 text-primary opacity-50" />
                 </div>
              </div>
           </div>
        </motion.div>

        {/* --- Switcher & Search Armory --- */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex p-2 bg-white/5 border border-white/10 rounded-[2rem] w-full md:w-auto font-black text-xs uppercase tracking-widest">
              <button 
                onClick={() => setActiveTab("announcements")}
                className={cn("px-10 py-4 rounded-[1.5rem] transition-all", activeTab === "announcements" ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-gray-500 hover:text-white")}
              >
                البلاغات الملكية
              </button>
              <button 
                onClick={() => setActiveTab("contests")}
                className={cn("px-10 py-4 rounded-[1.5rem] transition-all", activeTab === "contests" ? "bg-primary text-black shadow-lg shadow-primary/20" : "text-gray-500 hover:text-white")}
              >
                تحديات المملكة
              </button>
           </div>

           <div className="relative w-full md:max-w-md group">
              <input 
                type="text" 
                placeholder="ابحث في الأخبار والتحديات..." 
                className="w-full h-16 rounded-[1.5rem] bg-white/5 border border-white/10 px-14 text-white font-bold outline-none focus:border-primary/50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-500 group-focus-within:text-primary transition-colors" />
           </div>
        </div>

        {/* --- Categories Scroll --- */}
        <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar">
           {categories.map((cat) => (
             <button
               key={cat.id}
               onClick={() => setActiveCategory(cat.id)}
               className={cn(
                 "h-12 px-8 flex items-center gap-3 transition-all rounded-2xl font-black text-[11px] uppercase tracking-widest whitespace-nowrap whitespace-nowrap",
                 activeCategory === cat.id ? "bg-white text-black" : "bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10"
               )}
             >
                <cat.icon className="w-4 h-4" />
                <span>{cat.name}</span>
             </button>
           ))}
        </div>

        {/* --- Main Content Grid --- */}
        <AnimatePresence mode="wait">
           {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {[1, 2, 3].map(i => <div key={i} className={STYLES.glass + " h-96 animate-pulse"} />)}
             </div>
           ) : activeTab === "announcements" ? (
             <motion.div 
               key="announcements"
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: 20 }}
               className="grid grid-cols-1 md:grid-cols-3 gap-10"
             >
                {filteredAnnouncements.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={STYLES.glass + " group cursor-default hover:border-primary/40 transition-all flex flex-col"}
                  >
                     <div className="relative aspect-video overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-transparent flex items-center justify-center">
                             <Megaphone className="w-16 h-16 text-primary/10" />
                          </div>
                        )}
                        <div className="absolute top-4 right-4 flex gap-2">
                           <Badge className={cn("font-black text-[9px] uppercase tracking-widest px-3 h-6 border-none", item.priority === 'urgent' ? 'bg-red-500 text-white animate-pulse' : 'bg-black/60 text-white')}>
                              {item.priority === 'urgent' ? 'عاجل جداً' : item.priority}
                           </Badge>
                        </div>
                     </div>

                     <div className="p-8 flex-1 flex flex-col gap-6">
                        <div className="space-y-3 flex-1">
                           <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors leading-tight line-clamp-2">{item.title}</h3>
                           <p className="text-sm text-gray-500 font-medium line-clamp-3 leading-relaxed">{item.content}</p>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-6">
                           <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                 <User className="w-4 h-4 text-primary" />
                              </div>
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.authorName}</span>
                           </div>
                           <div className="flex items-center gap-2 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{new Date(item.publishedAt).toLocaleDateString('ar-EG')}</span>
                           </div>
                        </div>

                        <Link href={`/announcements/${item.id}`}>
                           <Button variant="ghost" className="w-full h-14 rounded-2xl border border-white/5 group-hover:bg-primary group-hover:text-black font-black uppercase tracking-widest text-[10px] gap-3">
                              <span>مشاهدة المرسوم</span>
                              <ChevronRight className="w-4 h-4" />
                           </Button>
                        </Link>
                     </div>
                  </motion.div>
                ))}
             </motion.div>
           ) : (
             <motion.div 
               key="contests"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               className="grid grid-cols-1 md:grid-cols-3 gap-10"
             >
                {filteredContests.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={STYLES.glass + " border-amber-500/10 group cursor-default hover:border-amber-500/40 transition-all flex flex-col"}
                  >
                     <div className="relative aspect-video bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors">
                        <div className="absolute inset-0 flex items-center justify-center">
                           <Trophy className="w-20 h-20 text-amber-500/20 group-hover:scale-110 group-hover:text-amber-500/40 transition-all" />
                        </div>
                        <div className="absolute bottom-4 right-4">
                           <Badge className="bg-amber-500 text-black font-black text-[9px] uppercase tracking-widest px-4 h-7 rounded-lg">{item.participantsCount} محارب</Badge>
                        </div>
                     </div>

                     <div className="p-8 flex-1 flex flex-col gap-6">
                        <div className="space-y-4 flex-1">
                           <div className="flex items-center gap-2 text-[9px] font-black uppercase text-amber-500 tracking-[0.2em] mb-1">
                              <Zap className="h-3.5 w-3.5" />
                              <span>تحدي ملكي نشط</span>
                           </div>
                           <h3 className="text-2xl font-black text-white group-hover:rpg-gold-text transition-all leading-tight">{item.title}</h3>
                           <p className="text-sm text-gray-500 font-medium line-clamp-2 leading-relaxed">{item.description}</p>
                           
                           <div className="space-y-3 pt-2">
                              {item.prize && (
                                <div className="flex items-center gap-3 text-xs font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                                   <Crown className="w-4 h-4" />
                                   <span>الجائزة: {item.prize}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-3 text-xs font-black text-amber-500/70 uppercase tracking-widest p-3 rounded-xl bg-amber-500/5">
                                 <Calendar className="w-4 h-4" />
                                 <span>ينتهي في: {new Date(item.endDate).toLocaleDateString('ar-EG')}</span>
                              </div>
                           </div>
                        </div>

                        <Link href={`/contests/${item.id}`}>
                           <Button className="w-full h-16 rounded-2xl bg-amber-500 text-black font-black uppercase tracking-widest text-xs gap-3 shadow-xl shadow-amber-500/20 hover:scale-[1.03] transition-all">
                              <span>خوض التحدي الآن</span>
                              <Sword className="w-5 h-5" />
                           </Button>
                        </Link>
                     </div>
                  </motion.div>
                ))}
             </motion.div>
           )}
        </AnimatePresence>
      </div>
    </div>
  );
}
