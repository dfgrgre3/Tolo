"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ensureUser } from "@/lib/user-utils";

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

export default function LibraryPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<LibraryCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "rated">("newest");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    description: "",
    subjectId: "",
    tags: [] as string[],
    tagInput: ""
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCover, setSelectedCover] = useState<File | null>(null);

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    // Load categories
    const fetchCategories = async () => {
      const res = await fetch("/api/library/categories");
      const data = await res.json();
      setCategories(data);
    };

    // Load books
    const fetchBooks = async () => {
      const res = await fetch("/api/library/books");
      const data = await res.json();
      setBooks(data);
    };

    fetchCategories();
    fetchBooks();
  }, []);

  const handleAddTag = () => {
    if (formData.tagInput.trim() && !formData.tags.includes(formData.tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, formData.tagInput.trim()]
      });
      setFormData(prev => ({ ...prev, tagInput: "" }));
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedCover(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !formData.title || !formData.author || !formData.description || !formData.subjectId) {
      toast.error("الرجاء ملء جميع الحقول المطلوبة ورفع الملف");
      return;
    }

    setUploading(true);

    try {
      const formDataObj = new FormData();
      formDataObj.append('title', formData.title);
      formDataObj.append('author', formData.author);
      formDataObj.append('description', formData.description);
      formDataObj.append('subjectId', formData.subjectId);
      formDataObj.append('tags', JSON.stringify(formData.tags));
      formDataObj.append('bookFile', selectedFile);
      
      if (selectedCover) {
        formDataObj.append('cover', selectedCover);
      }

      const response = await fetch('/api/library/upload', {
        method: 'POST',
        body: formDataObj,
        headers: {
          // We'll need to add authorization token here
          'Authorization': `Bearer ${localStorage.getItem('auth-token') || ''}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("تم رفع الكتاب بنجاح!");
        setShowUploadModal(false);
        // Reset form
        setFormData({
          title: "",
          author: "",
          description: "",
          subjectId: "",
          tags: [],
          tagInput: ""
        });
        setSelectedFile(null);
        setSelectedCover(null);
        // Refresh books list
        const res = await fetch("/api/library/books");
        const data = await res.json();
        setBooks(data);
      } else {
        toast.error(result.error || "حدث خطأ أثناء رفع الكتاب");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("حدث خطأ أثناء رفع الكتاب");
    } finally {
      setUploading(false);
    }
  };

  const filteredBooks = Array.isArray(books) ? books.filter(book => {
    const matchesCategory = activeCategory === "all" || book.subject === activeCategory;
    const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         book.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  }) : [];

  // Sort books based on selected criteria
  const sortedBooks = [...filteredBooks].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === "popular") {
      return b.downloads - a.downloads;
    } else { // rated
      return b.rating - a.rating;
    }
  });

  return (
    <div className="px-4">
      <section className="mx-auto max-w-7xl py-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">المكتبة الرقمية</h1>
            <p className="text-muted-foreground">وصول لمجموعة واسعة من الكتب والموارد التعليمية</p>
          </div>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            رفع كتاب
          </button>
        </div>

        {/* Categories */}
        <div className="rounded-lg border p-4">
          <h2 className="font-semibold mb-3">التصنيفات</h2>
          <div className="flex flex-wrap gap-2">
            <button 
              className={`px-3 py-1.5 rounded-md text-sm ${activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              onClick={() => setActiveCategory("all")}
            >
              الكل
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${activeCategory === category.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                onClick={() => setActiveCategory(category.id)}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search and Sort */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border p-4">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث في المكتبة..."
                className="w-full border rounded-md px-4 py-2 pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 absolute left-3 top-2.5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">ترتيب حسب:</span>
              <select
                className="border rounded-md px-3 py-1.5 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="newest">الأحدث</option>
                <option value="popular">الأكثر تحميلاً</option>
                <option value="rated">الأعلى تقييماً</option>
              </select>
            </div>
          </div>
        </div>

        {/* Books Grid */}
        {sortedBooks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {sortedBooks.map((book) => (
              <div key={book.id} className="rounded-lg border overflow-hidden transition-transform hover:scale-[1.02]">
                <div className="aspect-[3/4] bg-muted relative">
                  {book.coverUrl ? (
                    <img 
                      src={book.coverUrl} 
                      alt={book.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <span className="text-4xl">📚</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {book.subject}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-1 mb-1">{book.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{book.author}</p>
                  <p className="text-sm line-clamp-2 mb-3">{book.description}</p>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm">{book.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <span>{book.downloads}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {book.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="text-xs bg-muted px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                    {book.tags.length > 3 && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        +{book.tags.length - 3}
                      </span>
                    )}
                  </div>

                  <a 
                    href={book.downloadUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full block text-center px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                  >
                    تحميل الكتاب
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border p-12 text-center">
            <div className="text-5xl mb-4">📚</div>
            <h3 className="text-lg font-medium mb-2">لا توجد كتب في هذا التصنيف</h3>
            <p className="text-muted-foreground">جرب تغيير التصنيف أو معايير البحث</p>
          </div>
        )}
      </section>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">رفع كتاب جديد</h2>
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleUpload}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">عنوان الكتاب</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="w-full border rounded-md px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">المؤلف</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({...formData, author: e.target.value})}
                      className="w-full border rounded-md px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">الوصف</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full border rounded-md px-3 py-2"
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">التصنيف</label>
                    <select
                      value={formData.subjectId}
                      onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
                      className="w-full border rounded-md px-3 py-2"
                      required
                    >
                      <option value="">اختر التصنيف</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">الوسوم</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.tagInput}
                        onChange={(e) => setFormData({...formData, tagInput: e.target.value})}
                        className="flex-1 border rounded-md px-3 py-2"
                        placeholder="أضف وسمًا واضغط Enter"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                      />
                      <button 
                        type="button" 
                        onClick={handleAddTag}
                        className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md"
                      >
                        إضافة
                      </button>
                    </div>
                    
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.tags.map((tag, index) => (
                        <div key={index} className="flex items-center bg-muted px-2 py-1 rounded">
                          <span>{tag}</span>
                          <button 
                            type="button" 
                            onClick={() => handleRemoveTag(tag)}
                            className="ml-1 text-destructive"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">ملف الكتاب</label>
                    <input
                      type="file"
                      accept=".pdf,.epub,.mobi,.djvu,.cbz,.cbr,.doc,.docx"
                      onChange={handleFileChange}
                      className="w-full border rounded-md px-3 py-2"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">صورة الغلاف (اختياري)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="w-full border rounded-md px-3 py-2"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 border rounded-md"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50"
                    >
                      {uploading ? 'جاري الرفع...' : 'رفع الكتاب'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}