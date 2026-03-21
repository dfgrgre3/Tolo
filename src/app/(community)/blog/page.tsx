"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Clock, 
  Shield, 
  Sword, 
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Zap,
  Sparkles,
  Scroll,
  PenTool,
  Eye,
  Plus,
  ArrowLeft,
  Flame,
  Star
} from "lucide-react";
import { ensureUser } from "@/lib/user-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  authorName: string;
  categoryId: string;
  categoryName: string;
  coverImageUrl?: string;
  publishedAt: string;
  readTime: number; // in minutes
  views: number;
  tags: string[];
};

type BlogCategory = {
  id: string;
  name: string;
  icon: string;
};

const STYLES = {
  glass: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-8 transition-all",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export default function BlogPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "popular">("newest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureUser().then(setUserId);
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catRes, postRes] = await Promise.all([
          fetch("/api/blog/categories"),
          fetch("/api/blog/posts")
        ]);
        if (catRes.ok) setCategories(await catRes.json());
        if (postRes.ok) setPosts(await postRes.json());
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      const matchesCategory = activeCategory === "all" || post.categoryId === activeCategory;
      const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === "newest") return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      return b.views - a.views;
    });
  }, [posts, activeCategory, searchTerm, sortBy]);

  return (
    <div className="min-h-screen bg-background text-gray-100 overflow-hidden pb-40" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[130px] rounded-full opacity-30 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 blur-[130px] rounded-full opacity-20 -translate-x-1/2 translate-y-1/2" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(255,255,255,0.01)_1.5px,transparent_1.5px)] bg-[size:80px_80px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-16">
        
        {/* --- Hero: Chronicles of the Sages --- */}
        <motion.div 
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           className={cn(STYLES.glass, "p-12 md:p-24 relative group overflow-hidden")}
        >
           <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
           <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-16">
              <div className="space-y-8 flex-1 text-center lg:text-right">
                 <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                    <Scroll className="h-5 w-5" />
                    <span>لفائف الحكمة المدونة</span>
                 </div>
                 <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-tight">
                    حوليات <span className={STYLES.neonText}>الحكماء</span> <br /> والباحثين
                 </h1>
                 <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    هنا تُدون الخبرات، وتُحفظ أسرار التفوق. مقالات معمقة صاغها كبار الأكاديميين لتنير لك دروب السيادة العلمية.
                 </p>
                 <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-6">
                    {userId && (
                      <Link href="/blog/new-post">
                         <Button className="h-14 px-10 bg-white text-black font-black rounded-2xl gap-3 hover:scale-105 transition-all shadow-xl">
                            <Plus className="w-5 h-5" />
                            <span>تدوين لفافة جديدة</span>
                         </Button>
                      </Link>
                    )}
                    <Button variant="ghost" className="h-14 px-8 border border-white/10 bg-white/5 font-black rounded-2xl gap-3 hover:bg-white/10 transition-all">
                       <span>استكشاف الأرشيف</span>
                    </Button>
                 </div>
              </div>

              <div className="relative w-80 h-80 hidden lg:block">
                 <div className="absolute inset-0 bg-primary/20 blur-[80px] rounded-full animate-pulse" />
                 <motion.div 
                   animate={{ rotate: 360 }}
                   transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                   className="absolute inset-0 border border-dashed border-primary/20 rounded-full"
                 />
                 <div className="absolute inset-8 border border-white/5 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-3xl shadow-2xl">
                    <PenTool className="w-40 h-40 text-primary opacity-40" />
                 </div>
              </div>
           </div>
        </motion.div>

        {/* --- Tools of Discovery: Search & Filter --- */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-4 overflow-x-auto pb-4 no-scrollbar w-full lg:w-auto">
              <button
                onClick={() => setActiveCategory("all")}
                className={cn(
                  "h-12 px-8 flex items-center gap-3 transition-all rounded-2xl font-black text-[11px] uppercase tracking-widest whitespace-nowrap",
                  activeCategory === "all" ? "bg-white text-black" : "bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10"
                )}
              >الكل</button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "h-12 px-8 flex items-center gap-3 transition-all rounded-2xl font-black text-[11px] uppercase tracking-widest whitespace-nowrap",
                    activeCategory === cat.id ? "bg-white text-black" : "bg-white/5 text-gray-500 border border-white/5 hover:bg-white/10"
                  )}
                >
                   <span>{cat.icon}</span>
                   <span>{cat.name}</span>
                </button>
              ))}
           </div>

           <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-max">
              <div className="relative flex-1 sm:w-80 group">
                 <input 
                   type="text" 
                   placeholder="بحث في الحوليات..." 
                   className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-12 text-white font-bold outline-none focus:border-primary/50 transition-all"
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                 />
                 <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
              </div>

              <select 
                 className="h-14 px-6 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-gray-400 outline-none cursor-pointer"
                 value={sortBy}
                 onChange={e => setSortBy(e.target.value as "newest" | "popular")}
              >
                 <option value="newest" className="bg-background">الأحدث ظهوراً</option>
                 <option value="popular" className="bg-background">الأكثر قراءً</option>
              </select>
           </div>
        </div>

        {/* --- Main Chronicles Grid --- */}
        <AnimatePresence mode="wait">
           {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {[1,2,3].map(i => <div key={i} className="h-[450px] bg-white/5 rounded-[2.5rem] animate-pulse" />)}
             </div>
           ) : filteredPosts.length > 0 ? (
             <motion.div 
               key="posts"
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
             >
                {filteredPosts.map((post, idx) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(STYLES.glass, "group flex flex-col hover:border-primary/30 transition-all duration-500 cursor-default")}
                  >
                     <div className="relative aspect-[16/10] overflow-hidden">
                        {post.coverImageUrl ? (
                          <img src={post.coverImageUrl} className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/10 via-black to-black border-b border-white/5 flex items-center justify-center">
                             <Scroll className="w-16 h-16 text-primary/10 group-hover:scale-125 transition-transform" />
                          </div>
                        )}
                        <div className="absolute top-4 right-4">
                           <Badge className="bg-black/60 backdrop-blur-md text-white font-black text-[9px] uppercase tracking-widest px-4 h-7 border border-white/10">
                              {post.categoryName}
                           </Badge>
                        </div>
                     </div>

                     <div className="p-10 flex-1 flex flex-col gap-6">
                        <div className="space-y-4 flex-1">
                           <div className="flex items-center gap-3 text-[9px] font-black uppercase text-gray-500 tracking-widest">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(post.publishedAt).toLocaleDateString('ar-EG')}</span>
                           </div>
                           <h3 className="text-2xl font-black text-white leading-tight group-hover:text-primary transition-colors">{post.title}</h3>
                           <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-3">{post.excerpt}</p>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/5 pt-8">
                           <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                 <User className="w-4 h-4 text-primary" />
                              </div>
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{post.authorName}</span>
                           </div>
                           <div className="flex items-center gap-2 text-[9px] font-black text-gray-600 uppercase tracking-widest bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{post.readTime} دقيقة</span>
                           </div>
                        </div>

                        <Link href={`/blog/post/${post.id}`}>
                           <Button className="w-full h-16 bg-white/5 border border-white/5 rounded-2xl group-hover:bg-primary group-hover:text-black font-black uppercase tracking-widest text-[11px] gap-3 transition-all duration-500">
                              <span>قراءة التدوينة الكاملة</span>
                              <ChevronLeft className="w-4 h-4" />
                           </Button>
                        </Link>
                     </div>
                  </motion.div>
                ))}
             </motion.div>
           ) : (
             <div className="py-40 text-center space-y-8 animate-in fade-in zoom-in">
                <div className="p-8 bg-white/5 rounded-full w-max mx-auto border border-dashed border-white/10">
                   <Info className="w-20 h-20 text-gray-700" />
                </div>
                <div className="space-y-2">
                   <h3 className="text-4xl font-black text-white">لم نجد أي لفافات حكمة</h3>
                   <p className="text-gray-500 font-medium max-w-lg mx-auto">معايير البحث هذه لم تسفر عن أي سجلات في الأرشيف حالياً. جرب كلمات بحث أخرى.</p>
                </div>
                <Button onClick={() => { setSearchTerm(""); setActiveCategory("all"); }} className="h-14 px-10 bg-primary/20 text-primary border border-primary/30 rounded-2xl font-black">إعادة تصفير الأرشيف</Button>
             </div>
           )}
        </AnimatePresence>

        {/* --- Bottom CTA: The Author Guild --- */}
        <motion.div 
           initial={{ opacity: 0, y: 40 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           className={cn(STYLES.glass, "p-16 text-center border-primary/20 bg-primary/[0.02] overflow-hidden group")}
        >
           <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(var(--primary),0.1),transparent_70%)]" />
           <div className="relative z-10 max-w-3xl mx-auto space-y-8">
              <div className="h-16 w-16 bg-primary/10 border border-primary/20 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                 <PenTool className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-4xl font-black text-white">هل لديك حكمة تود مشاركتها؟</h2>
              <p className="text-lg text-gray-500 font-medium leading-relaxed">انضم إلى نقابة الكتاب والباحثين وساهم في بناء أكبر أرشيف علمي للمملكة. صوتك وخبرتك قد يكونان طوق نجاة لزميل باحث.</p>
              {userId ? (
                <Link href="/blog/new-post">
                   <Button className="h-16 px-12 bg-white text-black font-black rounded-2xl shadow-2xl hover:scale-105 transition-all flex gap-4 mx-auto">
                      <span>ابدأ التدوين الآن</span>
                      <ArrowLeft className="w-6 h-6" />
                   </Button>
                </Link>
              ) : (
                <Link href="/login">
                   <Button className="h-16 px-12 bg-white text-black font-black rounded-2xl shadow-2xl hover:scale-105 transition-all flex gap-4 mx-auto">
                      <span>سجل دخولك لتشاركنا الحكمة</span>
                      <Sword className="w-6 h-6" />
                   </Button>
                </Link>
              )}
           </div>
        </motion.div>
      </div>
    </div>
  );
}
