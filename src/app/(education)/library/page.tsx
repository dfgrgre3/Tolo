"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Upload,
  Star,
  Download,
  Eye,
  FileText,
  Sparkles,
  Library,
  Book as BookIcon,
  X,
  Plus
} from "lucide-react";
import { ensureUser } from "@/lib/user-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  subject: string;
  coverUrl?: string;
  downloadUrl: string;
  rating: number;
  views: number;
  downloads: number;
  createdAt: string;
  tags: string[];
};

type LibraryCategory = {
  id: string;
  name: string;
  icon: string;
};

const STYLES = {
  glass: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-6 transition-all",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export default function LibraryPage() {
  const [, setUserId] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "rated">("newest");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    subjectId: "",
    tags: [] as string[],
    tagInput: ""
  });

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catRes, bookRes] = await Promise.all([
          fetch("/api/library/categories"),
          fetch("/api/library/books")
        ]);
        const catData = await catRes.json();
        const bookData = await bookRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
        setBooks(Array.isArray(bookData) ? bookData : []);
      } catch (error) {
        console.error("Failed to fetch library data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesCategory = activeCategory === "all" || book.subject === activeCategory;
      const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [books, activeCategory, searchTerm]);

  const sortedBooks = useMemo(() => {
    return [...filteredBooks].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "popular") return b.downloads - a.downloads;
      return b.rating - a.rating;
    });
  }, [filteredBooks, sortBy]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author || !formData.subjectId) {
      return toast.error("أكمل البيانات أولاً");
    }
    
    setUploading(true);
    try {
      const response = await fetch("/api/library/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          author: formData.author,
          description: formData.description,
          subjectId: formData.subjectId,
          tags: formData.tags,
          coverUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(formData.title)}`, // Placeholder cover
          downloadUrl: "#", // Placeholder download link
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload");
      }

      toast.success("تم إرسال المخطوطة للأرشيف الملكي!");
      setShowUploadModal(false);
      
      // Refresh books
      const bookRes = await fetch("/api/library/books");
      const bookData = await bookRes.json();
      setBooks(Array.isArray(bookData) ? bookData : []);
      
      // Reset form
      setFormData({
        title: "",
        author: "",
        description: "",
        subjectId: "",
        tags: [],
        tagInput: ""
      });
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء الرفع");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-100 overflow-hidden pb-40" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/5 blur-[130px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-amber-600/5 blur-[130px] rounded-full" />
        <div className="absolute inset-x-0 h-px bg-white/5 top-1/2" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-16">
        
        {/* --- Hero: The Library of Scrolls --- */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className={STYLES.glass + " p-10 md:p-20 relative overflow-hidden group"}>
          
           <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-50" />
           <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="space-y-6 flex-1 text-center md:text-right">
                 <div className="inline-flex items-center gap-3 rounded-full border border-amber-500/30 bg-amber-500/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                    <Library className="h-5 w-5" />
                    <span>خزانة الكتب والمخطوطات المقدسة</span>
                 </div>
                 <h1 className="text-5xl md:text-8xl font-black tracking-tight leading-tight">
                    مكتبة <span className={STYLES.goldText}>الحكماء</span> 📚
                 </h1>
                 <p className="text-xl text-gray-400 font-medium max-w-2xl mx-auto md:mx-0">
                    أرشيف شامل لجميع الكتب الخارجية، المذكرات، والمخطوطات النادرة التي يحتاجها المحارب في رحلته نحو القمة.
                 </p>
              </div>
              
              <Button
                onClick={() => setShowUploadModal(true)}
                className="h-20 px-12 bg-amber-500 text-black font-black rounded-[2rem] gap-4 shadow-xl shadow-amber-500/20 hover:scale-105 transition-all text-xl active:scale-95 group/btn"
              >
                 <span>رفع مخطوطة جديدة</span>
                 <div className="p-2 bg-black/10 rounded-xl">
                    <Plus className="h-6 w-6" />
                 </div>
              </Button>
           </div>
        </motion.div>

        {/* --- Quick Filters & Search Armory --- */}
        <div className="flex flex-col lg:flex-row gap-8 items-center justify-between">
           <div className="w-full lg:max-w-xl group relative">
              <div className="absolute inset-0 bg-amber-500/20 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <input
                type="text"
                placeholder="ابحث عن اسم الكتاب، المؤلف، أو المادة..."
                className="w-full h-16 rounded-[1.5rem] bg-white/5 border border-white/10 px-14 text-white font-bold outline-none focus:border-amber-500/50 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 text-gray-500 group-focus-within:text-amber-500 transition-colors" />
           </div>

           <div className="flex items-center gap-4 flex-wrap justify-center font-black">
              <button
                onClick={() => setActiveCategory("all")}
                className={`h-12 px-8 flex items-center gap-3 transition-all rounded-2xl ${activeCategory === "all" ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
              >
                 <Sparkles className="w-4 h-4" />
                 <span>كل الرفوف</span>
              </button>
              {categories.slice(0, 5).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`h-12 px-8 flex items-center gap-3 transition-all rounded-2xl ${activeCategory === cat.id ? 'bg-amber-500 text-black' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}
                >
                   <span className="text-lg">{cat.icon}</span>
                   <span>{cat.name}</span>
                </button>
              ))}
           </div>
        </div>

        {/* --- Books Repository Grid --- */}
        <div className="space-y-12">
           <div className="flex items-center justify-between border-b border-white/5 pb-8">
              <h2 className="text-3xl font-black flex items-center gap-4">
                 <BookIcon className="h-7 w-7 text-amber-500" />
                 <span>المجلدات المتاحة</span>
                 <Badge className="bg-white/5 text-gray-500 border-white/10 px-4 py-1.5 font-black text-[11px]">{sortedBooks.length} كتاب</Badge>
              </h2>
              
              <div className="flex items-center gap-3 bg-white/5 p-1.5 rounded-2xl border border-white/5 font-black text-[10px] uppercase tracking-widest text-gray-500">
                 {["newest", "popular", "rated"].map((s) => (
                   <button
                     key={s}
                     onClick={() => setSortBy(s as any)}
                     className={`px-4 py-2 rounded-xl transition-all ${sortBy === s ? 'bg-white/10 text-white shadow-lg' : 'hover:text-white'}`}
                   >
                     {s === "newest" ? "الأحدث" : s === "popular" ? "الأكثر تداولاً" : "الأعلى رتبة"}
                   </button>
                 ))}
              </div>
           </div>

           <AnimatePresence mode="wait">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[1, 2, 3, 4].map((i) => <div key={i} className={STYLES.glass + " h-96 animate-pulse"} />)}
                </div>
              ) : sortedBooks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                  {sortedBooks.map((book, idx) => (
                    <motion.div
                      key={book.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className={STYLES.glass + " group cursor-default h-full flex flex-col hover:border-amber-500/30 transition-all hover:translate-y-[-5px]"}
                    >
                        {/* Book Cover Container */}
                        <div className="relative aspect-[3/4] overflow-hidden m-4 rounded-[1.5rem] bg-white/5">
                           {book.coverUrl ? (
                             <img src={book.coverUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/10 to-transparent">
                               <BookIcon className="w-16 h-16 text-amber-500/20" />
                             </div>
                           )}
                           <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                           <Badge className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-amber-500 border-amber-500/30 font-black h-7 px-4 rounded-xl text-[10px] uppercase tracking-widest">{book.subject}</Badge>
                        </div>

                        {/* Info Section */}
                        <div className="p-8 pt-0 flex-1 flex flex-col gap-4">
                           <div className="space-y-2 flex-1">
                              <h3 className="text-xl font-black text-white group-hover:text-amber-500 transition-colors line-clamp-2 leading-tight">{book.title}</h3>
                              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{book.author}</p>
                           </div>

                           <div className="flex items-center justify-between border-t border-white/5 pt-6">
                              <div className="flex items-center gap-2">
                                 <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                 <span className="text-lg font-black text-white">{book.rating.toFixed(1)}</span>
                              </div>
                              <div className="flex items-center gap-4 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                                 <div className="flex items-center gap-1.5">
                                    <Download className="w-3.5 h-3.5" />
                                    <span>{book.downloads}</span>
                                 </div>
                                 <div className="flex items-center gap-1.5">
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>{book.views}</span>
                                 </div>
                              </div>
                           </div>

                           <a
                             href={book.downloadUrl}
                             target="_blank"
                             rel="noreferrer"
                             className="h-14 w-full bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all group-hover:bg-amber-500 group-hover:border-amber-500 group-hover:text-black"
                           >
                              <span>استدعاء اللفافة</span>
                              <Download className="w-4 h-4" />
                           </a>
                        </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className={STYLES.glass + " p-32 text-center opacity-30 space-y-4"}>
                   <BookIcon className="w-20 h-20 mx-auto" />
                   <p className="text-xl font-black uppercase tracking-[0.2em]">لا توجد مجلدات في هذا الرف بعد</p>
                </div>
              )}
           </AnimatePresence>
        </div>
      </div>

      {/* --- Upload Modal (The Forge of Scrolls) --- */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
          
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={STYLES.glass + " w-full max-w-2xl p-10 relative z-10 space-y-10 border-amber-500/20"}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black flex items-center gap-4">
                  <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                    <Upload className="w-6 h-6 text-amber-500" />
                  </div>
                  <span>تدوين مخطوطة جديدة</span>
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowUploadModal(false)} className="rounded-full hover:bg-white/5 text-gray-500">
                  <X className="h-6 w-6" />
                </Button>
              </div>

              <form onSubmit={handleUpload} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">عنوان المجلد</label>
                    <Input 
                      className="h-14 rounded-2xl bg-white/5 border-white/10 text-white font-bold" 
                      required 
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">المؤلف الحكيم</label>
                    <Input 
                      className="h-14 rounded-2xl bg-white/5 border-white/10 text-white font-bold" 
                      required 
                      value={formData.author}
                      onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">المادة</label>
                  <select 
                    className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white px-4 font-bold outline-none focus:border-amber-500/50"
                    required
                    value={formData.subjectId}
                    onChange={(e) => setFormData(prev => ({ ...prev, subjectId: e.target.value }))}
                  >
                    <option value="" disabled>اختر المادة...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">وصف المخطوطة</label>
                  <textarea 
                    className="w-full h-32 rounded-2xl bg-white/5 border-white/10 text-white p-4 font-bold outline-none focus:border-amber-500/50" 
                    required 
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">رفع الملف الأصلي</label>
                    <div className="relative group/file">
                      <input 
                        type="file" 
                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                        required 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                             // Simulation
                          }
                        }}
                      />
                      <div className="h-20 rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center gap-4 group-hover/file:border-amber-500/50 transition-all">
                        <FileText className="w-6 h-6 text-gray-500 group-hover/file:text-amber-500 transition-colors" />
                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">اختر ملف PDF أو EPUB</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button disabled={uploading} className="h-20 w-full bg-amber-500 text-black font-black rounded-3xl text-xl shadow-2xl shadow-amber-500/20 hover:scale-[1.02] transition-all">
                  {uploading ? "جاري تدوير الحبر..." : "ثبّت المخطوطة في الأرشيف"}
                </Button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}