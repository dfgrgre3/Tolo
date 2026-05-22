"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { m, AnimatePresence } from "framer-motion";
import {
  Upload,
  Book as BookIcon,
  X,
  Plus,
  FileText,
  Sparkles,
  Trophy,
  History,
  LayoutGrid,
  ShieldCheck
} from "lucide-react";
import { ensureUser } from "@/lib/user-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logger } from '@/lib/logger';
import { apiClient } from "@/lib/api/api-client";

// New Components
import { Book, Category } from "@/components/library/types";
import { BookCard } from "@/components/library/BookCard";
import { LibraryHero } from "@/components/library/LibraryHero";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { BookDetails } from "@/components/library/BookDetails";

export default function LibraryPage() {
  const [, setUserId] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "rated">("newest");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
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
        const [catData, bookData] = await Promise.all([
          apiClient.get<any>("/categories"),
          apiClient.get<any>("/library/books")
        ]);
        setCategories(Array.isArray(catData) ? catData : (catData?.categories || []));
        setBooks(Array.isArray(bookData) ? bookData : (bookData?.books || []));
      } catch (error) {
        logger.error("Failed to fetch library data", error);
        toast.error("فشل في جلب البيانات من الأرشيف");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      const matchesCategory = activeCategory === "all" || book.subjectId === activeCategory;
      const matchesSearch = 
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.tags?.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [books, activeCategory, searchTerm]);

  const sortedBooks = useMemo(() => {
    return [...filteredBooks].sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "popular") return (b.downloads + b.views) - (a.downloads + a.views);
      return b.rating - a.rating;
    });
  }, [filteredBooks, sortBy]);

  const stats = useMemo(() => ({
    totalBooks: books.length,
    totalDownloads: books.reduce((acc, b) => acc + (b.downloads || 0), 0),
    activeUsers: Math.floor(books.length * 12.5) + 42 // Simulated active researchers
  }), [books]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.author || !formData.subjectId) {
      return toast.error("أكمل البيانات أولاً");
    }
    
    setUploading(true);
    try {
      await apiClient.post<any>("/library/books", {
        title: formData.title,
        author: formData.author,
        description: formData.description,
        subjectId: formData.subjectId,
        tags: formData.tags,
        coverUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(formData.title)}&backgroundColor=0a0a0a&shapeColor=fbbf24`,
        downloadUrl: "#",
      });

      toast.success("تم إرسال المخطوطة للأرشيف الملكي!");
      setShowUploadModal(false);
      
      const bookData = await apiClient.get<any>("/library/books");
      setBooks(Array.isArray(bookData) ? bookData : (bookData?.books || []));
      
      setFormData({
        title: "",
        author: "",
        description: "",
        subjectId: "",
        tags: [],
        tagInput: ""
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء الرفع";
      toast.error(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-100 pb-40" dir="rtl">
      {/* Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-[800px] h-[800px] bg-amber-600/5 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-600/5 blur-[150px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-12 sm:px-8 lg:px-12 space-y-24">
        
        {/* Immersive Hero */}
        <LibraryHero onUploadClick={() => setShowUploadModal(true)} stats={stats} />

        {/* Search & Filter Suite */}
        <LibraryFilters 
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />

        {/* Trending & Sections (Optional future enhancement) */}
        <div className="flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-gray-500 mb-[-2rem]">
           <Sparkles className="w-4 h-4 text-amber-500" />
           <span>اكتشف المخطوطات المختارة</span>
        </div>

        {/* Repository Grid */}
        <section className="space-y-12">
           <div className="flex items-center justify-between border-b border-white/5 pb-8">
              <h2 className="text-4xl font-black flex items-center gap-4">
                 <LayoutGrid className="h-8 w-8 text-amber-500" />
                 <span>رفوف الحكمة</span>
                 <span className="text-xl text-gray-500 font-medium px-4 border-r border-white/10">{sortedBooks.length} مجلد</span>
              </h2>
           </div>

           <AnimatePresence mode="wait">
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <div key={i} className="rpg-glass h-[500px] animate-shimmer" />
                  ))}
                </div>
              ) : sortedBooks.length > 0 ? (
                <m.div 
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-10"
                >
                  {sortedBooks.map((book, idx) => (
                    <BookCard 
                      key={book.id} 
                      book={book} 
                      index={idx} 
                      onClick={setSelectedBook}
                    />
                  ))}
                </m.div>
              ) : (
                <m.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rpg-glass p-32 text-center space-y-6"
                >
                   <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                     <BookIcon className="w-12 h-12 text-gray-700" />
                   </div>
                   <div className="space-y-2">
                     <p className="text-2xl font-black uppercase tracking-widest text-gray-500">لا توجد نتائج</p>
                     <p className="text-gray-600 font-medium">جرّب البحث بكلمات أخرى أو تغيير الرف</p>
                   </div>
                   <Button variant="outline" onClick={() => {setSearchTerm(""); setActiveCategory("all")}} className="rounded-2xl border-white/10 text-gray-500">
                     إعادة تعيين المرشحات
                   </Button>
                </m.div>
              )}
           </AnimatePresence>
        </section>

        {/* Footer Banner: Join the Scribes */}
        <m.div 
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rpg-glass p-12 md:p-20 relative overflow-hidden group"
        >
           <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
             <Trophy className="w-64 h-64 text-amber-500" />
           </div>
           <div className="relative z-10 max-w-3xl space-y-8">
              <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
                كن جزءاً من <span className="rpg-gold-text">تاريخنا</span>
              </h2>
              <p className="text-xl text-gray-400 font-medium">
                ساهم في بناء أكبر مكتبة تعليمية عربية. ارفع مذكراتك وكتبك المفضلة لتنال وسام "الحكيم الأكبر" وتكسب نقاط خبرة إضافية.
              </p>
              <Button 
                onClick={() => setShowUploadModal(true)}
                className="h-16 px-10 bg-white/5 border border-white/10 text-white font-black rounded-2xl hover:bg-amber-500 hover:text-black transition-all gap-3"
              >
                <span>ابدأ التدوين الآن</span>
                <Plus className="w-5 h-5" />
              </Button>
           </div>
        </m.div>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {selectedBook && (
          <BookDetails book={selectedBook} onClose={() => setSelectedBook(null)} />
        )}
      </AnimatePresence>

      {/* Upload Modal (The Forge) */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowUploadModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
            />
          
            <m.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="rpg-glass w-full max-w-4xl p-10 md:p-16 relative z-10 space-y-12 border-amber-500/20"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h2 className="text-4xl font-black flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                      <Upload className="w-8 h-8 text-amber-500" />
                    </div>
                    <span>تدوين مخطوطة جديدة</span>
                  </h2>
                  <p className="text-gray-500 font-medium">املأ البيانات لنشر علمك في الأرشيف</p>
                </div>
                <button onClick={() => setShowUploadModal(false)} className="p-3 hover:bg-white/5 rounded-full transition-colors text-gray-500">
                  <X className="h-8 w-8" />
                </button>
              </div>

              <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase text-gray-500 tracking-widest px-1">عنوان المجلد</label>
                    <Input 
                      placeholder="مثال: كتاب الفيزياء للعباقرة"
                      className="h-16 rounded-2xl bg-white/5 border-white/10 text-white font-bold text-lg px-6 focus:ring-amber-500/50" 
                      required 
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase text-gray-500 tracking-widest px-1">المؤلف الحكيم</label>
                    <Input 
                      placeholder="اسم الكاتب أو صاحب المذكرة"
                      className="h-16 rounded-2xl bg-white/5 border-white/10 text-white font-bold text-lg px-6 focus:ring-amber-500/50" 
                      required 
                      value={formData.author}
                      onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase text-gray-500 tracking-widest px-1">الرف (المادة)</label>
                    <select 
                      className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 text-white px-6 font-bold text-lg outline-none focus:border-amber-500/50 appearance-none backdrop-blur-xl"
                      required
                      value={formData.subjectId}
                      onChange={(e) => setFormData(prev => ({ ...prev, subjectId: e.target.value }))}
                    >
                      <option value="" disabled className="bg-black">اختر المادة...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id} className="bg-black">{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase text-gray-500 tracking-widest px-1">وصف المخطوطة</label>
                    <textarea 
                      placeholder="اكتب نبذة مختصرة عما يحتويه هذا الكتاب..."
                      className="w-full h-44 rounded-2xl bg-white/5 border-white/10 text-white p-6 font-bold text-lg outline-none focus:border-amber-500/50 resize-none backdrop-blur-xl" 
                      required 
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-xs font-black uppercase text-gray-500 tracking-widest px-1">رفع الملف الأصلي</label>
                    <div className="relative group/file h-24">
                      <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" required />
                      <div className="h-full rounded-2xl border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center gap-4 group-hover/file:border-amber-500/50 transition-all">
                        <FileText className="w-8 h-8 text-gray-500 group-hover/file:text-amber-500 transition-colors" />
                        <span className="text-sm font-black text-gray-500 uppercase tracking-widest">اختر ملف PDF أو EPUB</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 pt-6">
                  <Button 
                    disabled={uploading} 
                    className="h-20 w-full bg-amber-500 text-black font-black rounded-[2rem] text-2xl shadow-2xl shadow-amber-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    {uploading ? "جاري تدوير الحبر وتوثيق المجلد..." : "ثبّت المخطوطة في الأرشيف الملكي"}
                  </Button>
                </div>
              </form>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
