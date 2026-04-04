"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen,
  MessageSquare,
  Plus,
  Search,
  Flame,
  Pin,

  ChevronRight,
  TrendingUp,
  Award,
  Users,
  Sparkles } from
"lucide-react";
import { ensureUser } from "@/lib/user-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logger } from '@/lib/logger';

const STYLES = {
  glass: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-6 transition-all",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

type ForumCategory = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

type ForumPost = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  categoryId: string;
  categoryName: string;
  createdAt: string;
  views: number;
  repliesCount: number;
  isPinned: boolean;
};

export default function ForumPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catRes, postRes] = await Promise.all([
        fetch("/api/forum/categories"),
        fetch("/api/forum/posts")]
        );
        const [catData, postData] = await Promise.all([
        catRes.json(),
        postRes.json()]
        );
        setCategories(Array.isArray(catData) ? catData : []);
        setPosts(Array.isArray(postData) ? postData : []);
      } catch (error) {
        logger.error("Failed to fetch forum data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredPosts = useMemo(() => {
    const normalSearch = searchTerm.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesCategory = activeCategory === "all" || post.categoryId === activeCategory;
      const matchesSearch = !normalSearch ||
      post.title.toLowerCase().includes(normalSearch) ||
      post.content.toLowerCase().includes(normalSearch);
      return matchesCategory && matchesSearch;
    });
  }, [posts, activeCategory, searchTerm]);

  const sortedPosts = useMemo(() => {
    return [...filteredPosts].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filteredPosts]);

  return (
    <div className="min-h-screen bg-background text-gray-100 overflow-hidden pb-40" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-600/5 blur-[130px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/5 blur-[130px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
        {/* --- Hero Section: The Great Hall --- */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className={STYLES.glass + " p-10 md:p-16 relative overflow-hidden group"}>
          
           <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-right">
              <div className="space-y-6 flex-1">
                 <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                    <MessageSquare className="h-5 w-5" />
                    <span>قاعة الحكمة والتبادل العسكري</span>
                 </div>
                 <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight">
                    ساحة <span className={STYLES.neonText}>حوار الأبطال</span> 🛡️
                 </h1>
                 <p className="text-xl text-gray-400 font-medium max-w-2xl">
                    تبادل المعرفة مع رفاقك، اطرح تساؤلاتك في خضم المعركة، وساهم في بناء مكتبة الحكمة للمملكة.
                 </p>
              </div>
              
              <Link href="/forum/new-post">
                 <Button className="h-20 px-12 bg-primary text-black font-black rounded-[2rem] gap-4 shadow-xl shadow-primary/20 hover:scale-105 transition-all text-xl active:scale-95 group/btn">
                    <span>إضافة لفافة جديدة</span>
                    <div className="p-2 bg-black/10 rounded-xl transition-transform group-hover/btn:rotate-90">
                       <Plus className="h-6 w-6" />
                    </div>
                 </Button>
              </Link>
           </div>
        </motion.div>

        {/* --- Stats Row --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           {[
          { label: "مبارزة حوارية", val: posts.length, icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
          { label: "حكماء نشطون", val: "1.2K+", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "مواضيع ساخنة", val: posts.filter((p) => p.views > 100).length, icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10" },
          { label: "أوسمة الشرف", val: "15", icon: Award, color: "text-amber-500", bg: "bg-amber-500/10" }].
          map((stat, i) =>
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={STYLES.glass + " p-6 group cursor-default"}>
            
                <div className="flex items-start justify-between">
                   <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} border border-white/5`}>
                      <stat.icon className="w-6 h-6" />
                   </div>
                   <span className="text-white/5 font-black text-4xl">0{i + 1}</span>
                </div>
                <div className="mt-8">
                   <p className="text-3xl font-black text-white">{stat.val}</p>
                   <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{stat.label}</p>
                </div>
             </motion.div>
          )}
        </div>

        {/* --- Unified Search & Filter Bar --- */}
        <div className="flex flex-col lg:flex-row gap-8 items-center justify-between">
           <div className="w-full lg:max-w-xl group relative">
              <div className="absolute inset-0 bg-primary/20 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <input
              type="text"
              placeholder="ابحث في أرشيف الحكمة..."
              className="w-full h-16 rounded-[1.5rem] bg-white/5 border border-white/10 px-14 text-white font-bold outline-none focus:border-primary/50 focus:ring-4 ring-primary/10 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)} />
            
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-500 group-focus-within:text-primary transition-colors" />
           </div>

           <div className="flex items-center gap-4 flex-wrap justify-center">
              <button
              onClick={() => setActiveCategory("all")}
              className={`h-12 px-8 flex items-center gap-3 font-black transition-all rounded-2xl ${activeCategory === "all" ? 'bg-primary text-black' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>
              
                 <Sparkles className="w-4 h-4" />
                 <span>كل اللفائف</span>
              </button>
              {categories.map((cat) =>
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`h-12 px-8 flex items-center gap-3 font-black transition-all rounded-2xl ${activeCategory === cat.id ? 'bg-primary text-black' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>
              
                   <span className="text-xl">{cat.icon}</span>
                   <span>{cat.name}</span>
                </button>
            )}
           </div>
        </div>

        {/* --- Main Posts Repository --- */}
        <div className="space-y-12">
           <div className="flex items-center justify-between border-b border-white/5 pb-8">
              <h2 className="text-3xl font-black flex items-center gap-4">
                 <BookOpen className="h-7 w-7 text-primary" />
                 <span>المخطوطات واللفائف</span>
                 <Badge className="bg-white/5 text-gray-500 border-white/10 px-4 py-1.5 font-black uppercase text-[10px] tracking-widest">{sortedPosts.length} نتيجة عُثر عليها</Badge>
              </h2>
           </div>

           <div className="grid grid-cols-1 gap-8">
              <AnimatePresence mode="wait">
                 {loading ?
              <div className="space-y-6">
                       {[1, 2, 3].map((i) =>
                <div key={i} className={STYLES.glass + " h-40 animate-pulse bg-white/5 border-white/10"} />
                )}
                    </div> :
              sortedPosts.length > 0 ?
              sortedPosts.map((post, index) =>
              <motion.div
                key={post.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={STYLES.glass + ` p-8 group hover:border-primary/30 transition-all ${post.isPinned ? 'border-primary/20' : ''}`}>
                
                          <Link href={`/forum/post/${post.id}`} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                             <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-4">
                                   <Badge className="bg-primary/10 text-primary border-primary/20 font-black h-7 px-4 rounded-xl text-[10px] uppercase tracking-widest leading-none">
                                      {post.categoryName}
                                   </Badge>
                                   {post.isPinned &&
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-black h-7 px-4 rounded-xl text-[10px] uppercase tracking-widest leading-none flex items-center gap-2">
                                         <Pin className="w-3 h-3" />
                                         <span>مثبت عسكرياً</span>
                                      </Badge>
                      }
                                </div>
                                
                                <h3 className="text-2xl font-black text-white group-hover:text-primary transition-colors leading-tight">
                                   {post.title}
                                </h3>
                                
                                <p className="text-gray-400 font-medium line-clamp-1 max-w-4xl text-sm leading-relaxed">
                                   {post.content}
                                </p>
                                
                                <div className="flex items-center gap-8 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                                   <div className="flex items-center gap-2">
                                      <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black uppercase">
                                         {post.authorName.charAt(0)}
                                      </div>
                                      <span>بواسطة: {post.authorName}</span>
                                   </div>
                                   <div className="flex items-center gap-2">
                                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                                      <span>{new Date(post.createdAt).toLocaleDateString("ar-EG")}</span>
                                   </div>
                                </div>
                             </div>

                             <div className="flex items-center gap-6 md:border-r border-white/10 md:pr-10">
                                <div className="text-center group-hover:scale-110 transition-transform">
                                   <p className="text-2xl font-black text-white">{post.views}</p>
                                   <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">مشاهدة</p>
                                </div>
                                <div className="text-center group-hover:scale-110 transition-transform">
                                   <p className="text-2xl font-black text-white">{post.repliesCount}</p>
                                   <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">رد حكيم</p>
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:border-primary/40 transition-all group-hover:rotate-45">
                                   <ChevronRight className="w-6 h-6 rotate-180" />
                                </div>
                             </div>
                          </Link>
                       </motion.div>
              ) :

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={STYLES.glass + " p-32 text-center space-y-8"}>
                       <div className="mx-auto h-24 w-24 rounded-full bg-white/5 border border-white/5 flex items-center justify-center opacity-20">
                          <Search className="w-12 h-12" />
                       </div>
                       <div className="space-y-2">
                          <h3 className="text-3xl font-black text-white">لم نعثر على أي لفائف</h3>
                          <p className="text-gray-500 font-medium max-w-sm mx-auto">معايير البحث هذه لم تكشف عن أي لفائف حكمة منسية. حاول تغيير الكلمات المفتاحية.</p>
                       </div>
                       <Button onClick={() => {setSearchTerm("");setActiveCategory("all");}} className="h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-widest border border-white/10 bg-white/5 hover:bg-white/10">إعادة تعيين الأرشيف</Button>
                    </motion.div>
              }
              </AnimatePresence>
           </div>
        </div>

        {/* --- Community Guidelines --- */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
           <div className={STYLES.glass + " p-12 relative group overflow-hidden"}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                 <div className="space-y-4">
                    <h2 className="text-4xl font-black text-white">دستور شرف <span className="rpg-neon-text">المحاربين الحكماء</span></h2>
                    <p className="text-gray-400 font-medium max-w-2xl leading-relaxed">
                       الحكمة هي أقوى سلاح في ساحة المعركة. تذكر أن تحترم رفاقك، تقدم المساعدة لمن يحتاجها، وتحافظ على نظافة قاعاتنا من لغو الحديث.
                    </p>
                 </div>
                 <Link href="/terms">
                    <Button variant="outline" className="h-16 px-10 rounded-[1.5rem] border-white/10 font-black text-xs uppercase tracking-[0.2em] hover:bg-white/5">قراءة الدستور الكامل</Button>
                 </Link>
              </div>
           </div>
        </motion.div>
      </div>
    </div>);

}
