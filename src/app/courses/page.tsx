"use client";

import { useEffect, useState } from "react";

const LOCAL_USER_KEY = "tw_user_id";
async function ensureUser(): Promise<string> {
	let id = localStorage.getItem(LOCAL_USER_KEY);
	if (!id) {
		const res = await fetch("/api/users/guest", { method: "POST" });
		const data = await res.json();
		id = data.id;
		localStorage.setItem(LOCAL_USER_KEY, id!);
	}
	return id!;
}

type Course = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  subject: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  duration: number; // in hours
  thumbnailUrl?: string;
  price: number;
  rating: number;
  enrolledCount: number;
  createdAt: string;
  tags: string[];
  enrolled: boolean;
};

type CourseCategory = {
  id: string;
  name: string;
  icon: string;
};

export default function CoursesPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "popular" | "rated" | "price-low" | "price-high">("newest");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    // Load categories
    const fetchCategories = async () => {
      const res = await fetch("/api/courses/categories");
      const data = await res.json();
      setCategories(data);
    };

    // Load courses
    const fetchCourses = async () => {
      if (!userId) return;

      const res = await fetch(`/api/courses?userId=${userId}`);
      const data = await res.json();
      setCourses(data);
    };

    fetchCategories();
    if (userId) fetchCourses();
  }, [userId]);

  const filteredCourses = Array.isArray(courses) ? courses.filter(course => {
    const matchesCategory = activeCategory === "all" || course.subject === activeCategory;
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         course.instructor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLevel = levelFilter === "all" || course.level === levelFilter;
    return matchesCategory && matchesSearch && matchesLevel;
  }) : [];

  // Sort courses based on selected criteria
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === "popular") {
      return b.enrolledCount - a.enrolledCount;
    } else if (sortBy === "rated") {
      return b.rating - a.rating;
    } else if (sortBy === "price-low") {
      return a.price - b.price;
    } else { // price-high
      return b.price - a.price;
    }
  });

  const handleEnroll = async (courseId: string) => {
    if (!userId) return;

    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      if (res.ok) {
        // Update the course in the local state
        setCourses(courses.map(course => 
          course.id === courseId ? { ...course, enrolled: true } : course
        ));
      } else {
        alert("حدث خطأ أثناء التسجيل في الدورة");
      }
    } catch (error) {
      console.error("Error enrolling in course:", error);
      alert("حدث خطأ أثناء التسجيل في الدورة");
    }
  };

  const handleUnenroll = async (courseId: string) => {
    if (!userId) return;

    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      if (res.ok) {
        // Update the course in the local state
        setCourses(courses.map(course => 
          course.id === courseId ? { ...course, enrolled: false } : course
        ));
      } else {
        alert("حدث خطأ أثناء إلغاء التسجيل من الدورة");
      }
    } catch (error) {
      console.error("Error unenrolling from course:", error);
      alert("حدث خطأ أثناء إلغاء التسجيل من الدورة");
    }
  };

  return (
    <div className="px-4">
      <section className="mx-auto max-w-7xl py-8 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">الدورات التعليمية</h1>
            <p className="text-muted-foreground">سجل في الدورات التعليمية وعزز مستواك الأكاديمي</p>
          </div>
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

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <div className="relative">
              <input
                type="text"
                placeholder="ابحث في الدورات..."
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
              <span className="text-sm font-medium">المستوى:</span>
              <select
                className="border rounded-md px-3 py-1.5 text-sm"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <option value="all">الكل</option>
                <option value="BEGINNER">مبتدئ</option>
                <option value="INTERMEDIATE">متوسط</option>
                <option value="ADVANCED">متقدم</option>
              </select>
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
                <option value="popular">الأكثر شهرة</option>
                <option value="rated">الأعلى تقييماً</option>
                <option value="price-low">السعر: الأقل أولاً</option>
                <option value="price-high">السعر: الأعلى أولاً</option>
              </select>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        {sortedCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedCourses.map((course) => (
              <div key={course.id} className="rounded-lg border overflow-hidden transition-transform hover:scale-[1.02]">
                <div className="aspect-video bg-muted relative">
                  {course.thumbnailUrl ? (
                    <img 
                      src={course.thumbnailUrl} 
                      alt={course.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <span className="text-4xl">🎓</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {course.subject}
                  </div>
                  <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {course.level === "BEGINNER" ? "مبتدئ" : course.level === "INTERMEDIATE" ? "متوسط" : "متقدم"}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-1 mb-1">{course.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">مدرب: {course.instructor}</p>
                  <p className="text-sm line-clamp-2 mb-3">{course.description}</p>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-sm">{course.rating.toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>{course.enrolledCount}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{course.duration} ساعة</span>
                    </div>
                    <div className="font-semibold">
                      {course.price === 0 ? "مجاني" : `${course.price} ريال`}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {course.tags.slice(0, 2).map((tag, index) => (
                      <span key={index} className="text-xs bg-muted px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                    {course.tags.length > 2 && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded">
                        +{course.tags.length - 2}
                      </span>
                    )}
                  </div>

                  {course.enrolled ? (
                    <button 
                      onClick={() => handleUnenroll(course.id)}
                      className="w-full px-3 py-2 bg-destructive text-destructive-foreground rounded-md text-sm font-medium"
                    >
                      إلغاء التسجيل
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleEnroll(course.id)}
                      className="w-full px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                    >
                      {course.price === 0 ? "سجل الآن" : "سجل وادفع"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border p-12 text-center">
            <div className="text-5xl mb-4">🎓</div>
            <h3 className="text-lg font-medium mb-2">لا توجد دورات في هذا التصنيف</h3>
            <p className="text-muted-foreground">جرب تغيير التصنيف أو معايير البحث</p>
          </div>
        )}
      </section>
    </div>
  );
}
