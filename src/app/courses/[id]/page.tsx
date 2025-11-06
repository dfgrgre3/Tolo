"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/AuthGuard";

import { ensureUser } from "@/lib/user-utils";

type Course = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  subject: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  duration: number;
  thumbnailUrl?: string;
  price: number;
  rating: number;
  enrolledCount: number;
  createdAt: string;
  tags: string[];
  enrolled: boolean;
  progress?: number;
};

type CourseLesson = {
  id: string;
  title: string;
  description?: string;
  content?: string;
  videoUrl?: string;
  duration: number;
  order: number;
  completed: boolean;
  progress: number;
};

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<string | null>(null);

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    if (!courseId) return;

    const fetchCourse = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}${userId ? `?userId=${userId}` : ''}`);
        if (res.ok) {
          const courseData = await res.json();
          setCourse(courseData);
        } else {
          // Course not found
          router.push("/courses");
        }
      } catch (error) {
        console.error("Error fetching course:", error);
        router.push("/courses");
      }
    };

    const fetchLessons = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/lessons${userId ? `?userId=${userId}` : ''}`);
        if (res.ok) {
          const lessonsData = await res.json();
          setLessons(lessonsData);
          if (lessonsData.length > 0) {
            setActiveLesson(lessonsData[0].id);
          }
        }
      } catch (error) {
        console.error("Error fetching lessons:", error);
      }
    };

    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCourse(), fetchLessons()]);
      setLoading(false);
    };

    loadData();
  }, [courseId, userId, router]);

  const handleEnroll = async () => {
    if (!userId || !courseId) return;

    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      if (res.ok) {
        // Update the course in the local state
        if (course) {
          setCourse({ ...course, enrolled: true, progress: 0 });
        }
      } else {
        alert("حدث خطأ أثناء التسجيل في الدورة");
      }
    } catch (error) {
      console.error("Error enrolling in course:", error);
      alert("حدث خطأ أثناء التسجيل في الدورة");
    }
  };

  const handleUnenroll = async () => {
    if (!userId || !courseId) return;

    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      if (res.ok) {
        // Update the course in the local state
        if (course) {
          setCourse({ ...course, enrolled: false });
        }
      } else {
        alert("حدث خطأ أثناء إلغاء التسجيل من الدورة");
      }
    } catch (error) {
      console.error("Error unenrolling from course:", error);
      alert("حدث خطأ أثناء إلغاء التسجيل من الدورة");
    }
  };

  const handleLessonComplete = async (lessonId: string) => {
    if (!userId) return;

    try {
      const res = await fetch(`/api/courses/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, completed: true, progress: 100 })
      });

      if (res.ok) {
        // Update the lesson in the local state
        setLessons(lessons.map(lesson => 
          lesson.id === lessonId ? { ...lesson, completed: true, progress: 100 } : lesson
        ));

        // Update course progress
        if (course) {
          const completedLessons = lessons.filter(l => l.id === lessonId || l.completed).length;
          const newProgress = Math.round((completedLessons / lessons.length) * 100);
          setCourse({ ...course, progress: newProgress });
        }
      } else {
        alert("حدث خطأ أثناء تحديث تقدم الدرس");
      }
    } catch (error) {
      console.error("Error updating lesson progress:", error);
      alert("حدث خطأ أثناء تحديث تقدم الدرس");
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-12 flex justify-center">
        <div className="text-center">جاري التحميل...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="px-4 py-12 flex justify-center">
        <div className="text-center">الدورة غير موجودة</div>
      </div>
    );
  }

  const activeLessonData = lessons.find(l => l.id === activeLesson);

  return (
    <AuthGuard>
      <div className="px-4">
        <section className="mx-auto max-w-7xl py-8 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/courses" className="hover:text-primary">الدورات التعليمية</Link>
          <span>/</span>
          <span>{course.title}</span>
        </div>

        {/* Course Header */}
        <div className="rounded-lg border overflow-hidden">
          <div className="md:flex">
            <div className="md:w-1/3">
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
            </div>
            <div className="md:w-2/3 p-6">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{course.title}</h1>
              <p className="text-muted-foreground mb-4">مدرب: {course.instructor}</p>

              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>{course.rating.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>{course.enrolledCount} طالب</span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{course.duration} ساعة</span>
                </div>
              </div>

              <p className="mb-6">{course.description}</p>

              <div className="flex flex-wrap gap-2 mb-6">
                {course.tags.map((tag, index) => (
                  <span key={index} className="bg-muted px-2 py-1 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>

              {course.enrolled && course.progress !== undefined && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span>تقدمك في الدورة</span>
                    <span>{course.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {course.enrolled ? (
                  <button
                    onClick={handleUnenroll}
                    className="px-4 py-2 border border-destructive text-destructive rounded-md"
                  >
                    إلغاء التسجيل
                  </button>
                ) : (
                  <button
                    onClick={handleEnroll}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                  >
                    {course.price > 0 ? `سجل الآن - ${course.price} ريال` : "سجل مجاناً"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Course Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lessons List */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border p-4">
              <h2 className="font-semibold mb-3">محتوى الدورة</h2>
              <ul className="space-y-2">
                {lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <button
                      className={`w-full text-left p-3 rounded-md border transition-colors ${
                        activeLesson === lesson.id 
                          ? "bg-primary/10 border-primary" 
                          : "hover:bg-muted"
                      }`}
                      onClick={() => setActiveLesson(lesson.id)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{lesson.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {Math.floor(lesson.duration / 60)}:{String(lesson.duration % 60).padStart(2, '0')}
                        </span>
                      </div>
                      {lesson.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                          {lesson.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          {lesson.completed ? (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              مكتمل
                            </span>
                          ) : (
                            <span className="text-xs bg-muted px-2 py-0.5 rounded">
                              {lesson.progress > 0 ? `${Math.round(lesson.progress)}%` : "لم يبدأ"}
                            </span>
                          )}
                        </div>
                        {course.enrolled && !lesson.completed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLessonComplete(lesson.id);
                            }}
                            className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded"
                          >
                            تحديد كمكتمل
                          </button>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Lesson Content */}
          <div className="lg:col-span-2">
            {activeLessonData ? (
              <div className="rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">{activeLessonData.title}</h2>
                  <span className="text-sm text-muted-foreground">
                    {Math.floor(activeLessonData.duration / 60)}:{String(activeLessonData.duration % 60).padStart(2, '0')}
                  </span>
                </div>

                {activeLessonData.description && (
                  <p className="text-muted-foreground mb-6">{activeLessonData.description}</p>
                )}

                {activeLessonData.videoUrl && course.enrolled ? (
                  <div className="aspect-video bg-muted rounded-lg mb-6 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-5xl mb-2">🎬</div>
                      <p className="text-muted-foreground">مشغل الفيديو</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        الرابط: {activeLessonData.videoUrl}
                      </p>
                    </div>
                  </div>
                ) : activeLessonData.videoUrl && !course.enrolled ? (
                  <div className="aspect-video bg-muted rounded-lg mb-6 flex items-center justify-center">
                    <div className="text-center p-6">
                      <div className="text-5xl mb-2">🔒</div>
                      <p className="text-lg font-medium mb-2">محتوى محمي</p>
                      <p className="text-muted-foreground mb-4">
                        سجل في الدورة للوصول إلى جميع الدروس والفيديوهات
                      </p>
                      <button
                        onClick={handleEnroll}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                      >
                        {course.price > 0 ? `سجل الآن - ${course.price} ريال` : "سجل مجاناً"}
                      </button>
                    </div>
                  </div>
                ) : null}

                {activeLessonData.content && course.enrolled ? (
                  <div className="prose prose-sm max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: activeLessonData.content }} />
                  </div>
                ) : activeLessonData.content && !course.enrolled ? (
                  <div className="bg-muted p-6 rounded-lg text-center">
                    <p className="text-muted-foreground">
                      سجل في الدورة للوصول إلى المحتوى الكامل للدرس
                    </p>
                  </div>
                ) : null}

                {course.enrolled && lessons.length > 0 && (
                  <div className="flex justify-between mt-8 pt-6 border-t">
                    <button
                      onClick={() => {
                        const currentIndex = lessons.findIndex(l => l.id === activeLesson);
                        if (currentIndex > 0) {
                          setActiveLesson(lessons[currentIndex - 1].id);
                        }
                      }}
                      disabled={lessons.findIndex(l => l.id === activeLesson) === 0}
                      className="px-4 py-2 border rounded-md disabled:opacity-50"
                    >
                      الدرس السابق
                    </button>

                    {!activeLessonData.completed && (
                      <button
                        onClick={() => handleLessonComplete(activeLessonData.id)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
                      >
                        تحديد كمكتمل
                      </button>
                    )}

                    <button
                      onClick={() => {
                        const currentIndex = lessons.findIndex(l => l.id === activeLesson);
                        if (currentIndex < lessons.length - 1) {
                          setActiveLesson(lessons[currentIndex + 1].id);
                        }
                      }}
                      disabled={lessons.findIndex(l => l.id === activeLesson) === lessons.length - 1}
                      className="px-4 py-2 border rounded-md disabled:opacity-50"
                    >
                      الدرس التالي
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border p-12 text-center">
                <div className="text-5xl mb-4">📚</div>
                <h3 className="text-lg font-medium mb-2">اختر درساً للمشاهدة</h3>
                <p className="text-muted-foreground">اختر درساً من القائمة الجانبية لعرض محتواه</p>
              </div>
            )}
          </div>
        </div>
        </section>
      </div>
    </AuthGuard>
  );
}
