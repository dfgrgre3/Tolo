"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import {
  Calendar,
  MapPin,
  Users,
  Search,
  Plus,
  ChevronLeft,
  Clock,
  Sparkles,
  Crown,
  Flame,
  Info,
  Sword,
} from
"lucide-react";
import { ensureUser } from "@/lib/user-utils";
import { logger } from '@/lib/logger';
import { safeFetch } from "@/lib/safe-client-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Event = {
  id: string;
  title: string;
  description: string;
  location?: string;
  startDate: string;
  endDate: string;
  imageUrl?: string;
  organizerId: string;
  organizerName: string;
  category: string;
  isPublic: boolean;
  maxAttendees?: number;
  currentAttendees: number;
  tags: string[];
};

const STYLES = {
  glass: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-8 transition-all",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export default function EventsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "soonest">("newest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    ensureUser(controller.signal).then(setUserId);
    const fetchEvents = async () => {
      setLoading(true);
      const { data } = await safeFetch<Event[]>("/api/events", { signal: controller.signal });
      // Add proper type checking to ensure data is an array
      if (Array.isArray(data)) {
        setEvents(data);
      } else {
        // If data is not an array, set empty array as fallback
        setEvents([]);
        logger.warn("Events API returned non-array data:", data);
      }
      setLoading(false);
    };
    fetchEvents();
    return () => controller.abort();
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesCategory = activeCategory === "all" || event.category === activeCategory;
      const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === "newest") return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    });
  }, [events, activeCategory, searchTerm, sortBy]);

  const categories = [
  { id: "all", name: "كل التجمعات", icon: Calendar },
  { id: "academic", name: "ندوات الحكماء", icon: Crown },
  { id: "social", name: "لقاءات الفرسان", icon: Users },
  { id: "sports", name: "منافسات بدنية", icon: Flame },
  { id: "cultural", name: "فنون المملكة", icon: Sparkles },
  { id: "workshop", name: "ورش الحدادة العلمية", icon: Sword }];


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ar-SA", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen bg-background text-gray-100 overflow-hidden pb-40" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/10 blur-[130px] rounded-full opacity-30 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[150px] rounded-full opacity-20 translate-x-1/2 translate-y-1/2" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,0.01)_1.5px,transparent_1.5px)] bg-[size:80px_80px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-16">
        
        {/* --- Hero: Kingdom Gatherings --- */}
        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(STYLES.glass, "p-12 md:p-24 relative group overflow-hidden")}>
          
           <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
           <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
              <div className="space-y-8 flex-1 text-center lg:text-right">
                 <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                    <Calendar className="h-5 w-5" />
                    <span>احتفالات وتجمعات المملكة</span>
                 </div>
                 <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-tight">
                    ساحة <span className={STYLES.neonText}>المناسبات</span> <br /> الكبرى
                 </h1>
                 <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    هنا يلتقي الفرسان، وتُعقد المحاضرات التاريخية. لا تدع فرصة حضور هذه التجمعات العظمى تفوتك، ففيها تُبنى التحالفات وتُتبادل الخبرات.
                 </p>
                 <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-6">
                    {userId &&
                <Link href="/events/new">
                         <Button className="h-14 px-10 bg-white text-black font-black rounded-2xl gap-3 hover:scale-105 transition-all shadow-xl">
                            <Plus className="w-5 h-5" />
                            <span>الإعلان عن تجمع جديد</span>
                         </Button>
                      </Link>
                }
                    <Button variant="ghost" className="h-14 px-8 border border-white/10 bg-white/5 font-black rounded-2xl gap-3 hover:bg-white/10 transition-all">
                       <span>عرض خريطة الفعاليات</span>
                    </Button>
                 </div>
              </div>

              <div className="relative w-80 h-80 hidden lg:block">
                 <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
                 <m.div
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border border-dotted border-primary/30 rounded-full" />
              
                 <div className="absolute inset-8 border border-white/5 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-3xl shadow-2xl">
                    <MapPin className="w-40 h-40 text-primary opacity-40 translate-y-[-10px]" />
                 </div>
              </div>
           </div>
        </m.div>

        {/* --- Tools of Discovery --- */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar w-full lg:w-auto">
              {categories.map((cat) =>
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "h-12 px-8 flex items-center gap-3 transition-all rounded-2xl font-black text-[11px] uppercase tracking-widest whitespace-nowrap",
                activeCategory === cat.id ? "bg-white text-black" : "bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10"
              )}>
              
                   <cat.icon className="w-4 h-4" />
                   <span>{cat.name}</span>
                </button>
            )}
           </div>

           <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-max">
              <div className="relative flex-1 sm:w-80 group">
                 <input
                type="text"
                placeholder="ابحث عن مناسبة..."
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-12 text-white font-bold outline-none focus:border-primary/50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)} />
              
                 <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
              </div>

              <select
              className="h-14 px-6 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-gray-400 outline-none cursor-pointer"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "soonest")}>
              
                 <option value="newest" className="bg-background">المضافة حديثاً</option>
                 <option value="soonest" className="bg-background">الأقرب زمنياً</option>
              </select>
           </div>
        </div>

        {/* --- Events Grid --- */}
        <AnimatePresence mode="wait">
           {loading ?
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {[1, 2, 3].map((i) => <div key={i} className="h-96 bg-white/5 rounded-[2.5rem] animate-pulse" />)}
             </div> :
          filteredEvents.length > 0 ?
          <m.div
            key="events"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            
                {filteredEvents.map((event, idx) =>
            <m.div
              key={event.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(STYLES.glass, "group flex flex-col hover:border-primary/30 transition-all duration-500")}>
              
                     <div className="relative aspect-video overflow-hidden">
                        {event.imageUrl ?
                <img src={event.imageUrl} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" /> :

                <div className="w-full h-full bg-gradient-to-br from-primary/10 via-black to-black flex items-center justify-center">
                             <Calendar className="w-16 h-16 text-primary/10 group-hover:scale-110 transition-transform" />
                          </div>
                }
                        <div className="absolute top-4 right-4">
                           <Badge className="bg-black/60 backdrop-blur-md text-white font-black text-[9px] uppercase tracking-widest px-4 h-7 border border-white/10">
                              {categories.find((c) => c.id === event.category)?.name || event.category}
                           </Badge>
                        </div>
                     </div>

                     <div className="p-10 flex-1 flex flex-col gap-6">
                        <div className="space-y-4 flex-1">
                           <div className="flex items-center gap-2 text-[9px] font-black uppercase text-primary tracking-widest">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{formatDate(event.startDate)}</span>
                           </div>
                           <h3 className="text-2xl font-black text-white leading-tight group-hover:text-primary transition-colors">{event.title}</h3>
                           <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2">{event.description}</p>
                           
                           <div className="space-y-3 pt-2">
                              {event.location &&
                    <div className="flex items-center gap-3 text-xs font-black text-gray-400 uppercase tracking-widest">
                                   <MapPin className="w-4 h-4 text-primary" />
                                   <span>{event.location}</span>
                                </div>
                    }
                              <div className="flex items-center gap-3 text-xs font-black text-gray-400 uppercase tracking-widest">
                                 <Users className="w-4 h-4 text-primary" />
                                 <span>المنظم: {event.organizerName}</span>
                              </div>
                              {event.maxAttendees &&
                    <div className="flex items-center gap-3 text-xs font-black text-primary uppercase tracking-widest bg-primary/5 p-3 rounded-xl border border-primary/10">
                                   <Sparkles className="w-4 h-4" />
                                   <span>{event.currentAttendees} / {event.maxAttendees} فـارس</span>
                                </div>
                    }
                           </div>
                        </div>

                        <Link href={`/events/${event.id}`}>
                           <Button className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl group-hover:bg-primary group-hover:text-black font-black uppercase tracking-widest text-[11px] gap-3 transition-all">
                              <span>مشاهدة تفاصيل التجمع</span>
                              <ChevronLeft className="w-4 h-4" />
                           </Button>
                        </Link>
                     </div>
                  </m.div>
            )}
             </m.div> :

          <div className="py-40 text-center space-y-8 animate-in fade-in zoom-in">
                <div className="p-8 bg-white/5 rounded-full w-max mx-auto border border-dashed border-white/10 text-gray-700">
                   <Info className="w-20 h-20" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-4xl font-black text-white">لا توجد احتفالات حالياً</h3>
                   <p className="text-gray-500 font-medium max-w-lg mx-auto">المملكة هادئة الآن، لكن التجمعات الكبرى قادمة قريباً. ابقِ متيقظاً للبلاغات الملكية.</p>
                </div>
                <Button onClick={() => {setSearchTerm("");setActiveCategory("all");}} className="h-14 px-10 bg-primary/10 text-primary border border-primary/30 rounded-2xl font-black">إعادة تصفير الساحة</Button>
             </div>
          }
        </AnimatePresence>
      </div>
    </div>);

}
