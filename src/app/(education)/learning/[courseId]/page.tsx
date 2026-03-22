"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  ChevronLeft,
  FileText,
  Download,
  MessageSquare,
  BookOpen,
  Trophy,
  ArrowRight,
  Menu,
  X,
  Star,
  Settings,
  Share2,
  Bookmark
} from "lucide-react";
import { CourseVideoPlayer } from "@/components/video/CourseVideoPlayer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

type Attachment = {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
};

type Lesson = {
  id: string;
  name: string;
  description: string;
  content: string;
  videoUrl: string;
  type: "VIDEO" | "ARTICLE" | "QUIZ" | "FILE";
  completed: boolean;
  order: number;
  attachments: Attachment[];
};

type Chapter = {
  id: string;
  name: string;
  order: number;
  subTopics: Lesson[];
};

type Course = {
  id: string;
  nameAr: string;
  name: string;
  instructorName: string;
  thumbnailUrl: string;
  rating: number;
};

export default function AdvancedLearningHub() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [addingQuestion, setAddingQuestion] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/courses/${courseId}/curriculum`);
        if (res.ok) {
          const data = await res.json();
          setChapters(data.curriculum || []);
          
          const courseRes = await fetch(`/api/courses/${courseId}`);
          if (courseRes.ok) {
            const cData = await courseRes.json();
            setCourse(cData.subject);
          }

          // Set first lesson as active by default
          if (data.curriculum?.[0]?.subTopics?.[0]) {
            setActiveLesson(data.curriculum[0].subTopics[0]);
          }
        }
      } catch (err) {
        logger.error("Error loading learning hub:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId]);

  // Fetch lesson specific data (Notes, Questions)
  useEffect(() => {
    if (!activeLesson) return;

    const fetchLessonExtras = async () => {
      try {
        // Fetch Note
        const noteRes = await fetch(`/api/courses/lessons/${activeLesson.id}/notes`);
        if (noteRes.ok) {
           const noteData = await noteRes.json();
           setNoteContent(noteData.data?.content || "");
        }

        // Fetch Questions
        const qRes = await fetch(`/api/courses/lessons/${activeLesson.id}/questions`);
        if (qRes.ok) {
           const qData = await qRes.json();
           setQuestions(qData.data || []);
        }
      } catch (err) {
        logger.error(err instanceof Error ? err.message : String(err));
      }
    };

    fetchLessonExtras();
  }, [activeLesson]);

  const saveNote = async () => {
    if (!activeLesson) return;
    setSavingNote(true);
    try {
      await fetch(`/api/courses/lessons/${activeLesson.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent })
      });
    } catch (err) {
      logger.error(String(err));
    } finally {
      setSavingNote(false);
    }
  };

  const postQuestion = async () => {
    if (!activeLesson || !newQuestion.trim()) return;
    setAddingQuestion(true);
    try {
      const res = await fetch(`/api/courses/lessons/${activeLesson.id}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newQuestion })
      });
      if (res.ok) {
        const data = await res.json();
        setQuestions(prev => [data.data, ...prev]);
        setNewQuestion("");
      }
    } catch (err) {
      logger.error(String(err));
    } finally {
      setAddingQuestion(false);
    }
  };

  const totalLessons = useMemo(() => 
    chapters.reduce((acc, c) => acc + c.subTopics.length, 0), 
    [chapters]
  );
  
  const completedLessons = useMemo(() => 
    chapters.reduce((acc, c) => acc + c.subTopics.filter(l => l.completed).length, 0), 
    [chapters]
  );

  const progress = useMemo(() => 
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0, 
    [totalLessons, completedLessons]
  );

  const handleLessonComplete = async (lessonId: string) => {
    try {
      await fetch(`/api/courses/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true, subject: (course as any)?.name })
      });
      
      // Update local state
      setChapters(prev => prev.map(c => ({
        ...c,
        subTopics: c.subTopics.map(l => l.id === lessonId ? { ...l, completed: true } : l)
      })));

      // Auto-move to next lesson logic could go here
    } catch (err) {
      logger.error(err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0A0A0F]">
      <div className="h-16 w-16 border-t-2 border-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex h-screen bg-[#0A0A0F] text-gray-100 overflow-hidden" dir="rtl">
      {/* Sidebar Navigation */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 400 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className="relative bg-black/40 border-l border-white/5 backdrop-blur-xl flex flex-col h-full z-20"
      >
        <div className="p-6 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white">خارطة التعلم</h2>
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
              <span className="text-gray-500">معدل الإنجاز</span>
              <span className="text-primary">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2 bg-white/5" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-6 pb-20">
            {chapters.map((chapter, cIdx) => (
              <div key={chapter.id} className="space-y-3">
                <div className="flex items-center gap-3 px-2">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                    {cIdx + 1}
                  </div>
                  <h3 className="font-black text-sm text-gray-300 uppercase tracking-widest">{chapter.name}</h3>
                </div>
                <div className="space-y-1">
                  {chapter.subTopics.map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLesson(lesson)}
                      className={cn(
                        "w-full p-4 rounded-2xl text-right flex items-center gap-4 transition-all group",
                        activeLesson?.id === lesson.id ? "bg-primary/10 border border-primary/20" : "hover:bg-white/[0.03] border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "h-8 w-8 min-w-[32px] rounded-full flex items-center justify-center transition-all",
                        lesson.completed ? "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]" : activeLesson?.id === lesson.id ? "bg-primary text-black" : "bg-white/5 text-gray-500"
                      )}>
                        {lesson.completed ? <CheckCircle2 className="w-4 h-4" /> : <Play className="w-3 h-3 ml-0.5" />}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className={cn(
                          "text-sm font-bold truncate transition-colors",
                          activeLesson?.id === lesson.id ? "text-primary" : "text-gray-400 group-hover:text-white"
                        )}>{lesson.name}</p>
                        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-tight">
                          {lesson.type === 'VIDEO' ? 'محتوى مرئي' : 'محتوى نصي'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full relative">
        <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-md px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-5 h-5" />
              </Button>
            )}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-black font-black">
                <Trophy className="w-4 h-4" />
              </div>
              <h1 className="font-black text-sm lg:text-base text-white truncate max-w-[200px] lg:max-w-md">
                {course?.nameAr || course?.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <Button variant="ghost" className="hidden md:flex gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
               <Share2 className="w-4 h-4" />
               <span>مشاركة</span>
             </Button>
             <Button variant="ghost" className="hidden md:flex gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
               <Bookmark className="w-4 h-4" />
               <span>حفظ</span>
             </Button>
             <div className="h-8 w-px bg-white/5 mx-2" />
             <Button variant="ghost" size="sm" onClick={() => router.push('/courses')}> 
                <ArrowRight className="w-4 h-4 ml-2" />
                خروج
             </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 lg:p-10 space-y-10">
             {/* Lesson Content Container */}
             <div className="relative rounded-[2rem] overflow-hidden border border-white/5 bg-black/60 shadow-2xl">
               {activeLesson?.videoUrl && activeLesson.type === 'VIDEO' ? (
                 <CourseVideoPlayer 
                  courseId={courseId}
                  lessonId={activeLesson.id}
                  lessonTitle={activeLesson.name}
                  videoUrl={activeLesson.videoUrl}
                  alreadyCompleted={activeLesson.completed}
                  onLessonAutoComplete={() => handleLessonComplete(activeLesson.id)}
                 />
               ) : (
                 <div className="aspect-video flex items-center justify-center bg-white/5 p-12 text-center">
                    <div className="space-y-4">
                       <FileText className="w-16 h-16 text-primary mx-auto opacity-20" />
                       <h3 className="text-xl font-bold text-gray-400 italic">هذا الدرس يحتوي على محتوى نصي فقط</h3>
                    </div>
                 </div>
               )}

               <div className="p-8 lg:p-12 space-y-8">
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-primary/20 text-primary border-primary/20 text-[9px] uppercase tracking-widest px-3 h-6">المهمة التعليمية</Badge>
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">المستوى: متوسط</span>
                      </div>
                      <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tight">{activeLesson?.name}</h2>
                    </div>
                    {!activeLesson?.completed && (
                      <Button 
                        onClick={() => activeLesson && handleLessonComplete(activeLesson.id)}
                        className="h-14 px-8 bg-emerald-500 text-black font-black rounded-2xl hover:bg-emerald-400 hover:scale-105 transition-all shadow-xl shadow-emerald-500/20"
                      >
                         تحديد المهـمة كمكتملة ✓
                      </Button>
                    )}
                 </div>

                 {/* Information Tabs */}
                 <Tabs defaultValue="content" className="w-full" dir="rtl">
                    <TabsList className="bg-white/5 p-1 rounded-2xl border border-white/10 w-full md:w-auto h-auto grid grid-cols-2 md:grid-cols-4 gap-2">
                       <TabsTrigger value="content" className="rounded-xl font-black text-[10px] h-12 uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-black">
                          <BookOpen className="w-4 h-4 ml-2" />
                          المحتوى
                       </TabsTrigger>
                       <TabsTrigger value="resources" className="rounded-xl font-black text-[10px] h-12 uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-black">
                          <Download className="w-4 h-4 ml-2" />
                          المرفقات
                       </TabsTrigger>
                       <TabsTrigger value="qna" className="rounded-xl font-black text-[10px] h-12 uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-black">
                          <MessageSquare className="w-4 h-4 ml-2" />
                          النقاشات
                       </TabsTrigger>
                       <TabsTrigger value="notes" className="rounded-xl font-black text-[10px] h-12 uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-black">
                          <FileText className="w-4 h-4 ml-2" />
                          ملاحظاتي
                       </TabsTrigger>
                       <TabsTrigger value="about" className="rounded-xl font-black text-[10px] h-12 uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-black">
                          <Settings className="w-4 h-4 ml-2" />
                          عن الدورة
                       </TabsTrigger>
                    </TabsList>

                     <div className="mt-8">
                        <TabsContent value="content" className="min-h-[400px]">
                           <div 
                             className="prose prose-invert prose-p:text-gray-400 prose-headings:text-white max-w-none prose-lg animate-in fade-in slide-in-from-bottom-4 duration-500"
                             dangerouslySetInnerHTML={{ __html: activeLesson?.content || "<p className='italic text-gray-500'>لا يوجد تفاصيل نصية لهذا الدرس.</p>" }}
                           />
                        </TabsContent>
                        
                        <TabsContent value="resources" className="min-h-[400px]">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                              {activeLesson?.attachments && activeLesson.attachments.length > 0 ? (
                                activeLesson.attachments.map(att => (
                                  <div key={att.id} className="p-6 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-between group hover:border-primary/30 transition-all">
                                     <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-black transition-all">
                                           <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                           <p className="font-bold text-sm text-gray-200">{att.title}</p>
                                           <p className="text-[10px] text-gray-500 uppercase font-black">{att.fileType} • {(att.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                     </div>
                                     <Button variant="ghost" size="icon" onClick={() => window.open(att.fileUrl)}>
                                        <Download className="w-4 h-4" />
                                     </Button>
                                  </div>
                                ))
                              ) : (
                                <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
                                   <Download className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                                   <p className="text-gray-500 font-bold italic">لا توجد مرفقات لهذا الدرس</p>
                                </div>
                              )}
                           </div>
                        </TabsContent>

                        <TabsContent value="qna">
                           <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                              <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-1">طرح سؤال جديد</label>
                                    <textarea 
                                      value={newQuestion}
                                      onChange={(e) => setNewQuestion(e.target.value)}
                                      placeholder="اكتب سؤالك هنا ليستفيد الجميع..."
                                      className="w-full h-32 bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                                    />
                                 </div>
                                 <div className="flex justify-end">
                                    <Button 
                                      onClick={postQuestion}
                                      disabled={addingQuestion || !newQuestion.trim()}
                                      className="bg-primary text-black font-black px-8 rounded-xl h-12 hover:scale-105 transition-all"
                                    >
                                       {addingQuestion && <span className="animate-spin ml-2">⏳</span>}
                                       نشر السؤال العلني
                                    </Button>
                                 </div>
                              </div>

                              <div className="space-y-8">
                                 {questions.length > 0 ? (
                                    questions.map(q => (
                                      <div key={q.id} className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] space-y-6 hover:border-white/10 transition-all">
                                         <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                               <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-black border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                                  {q.user?.avatar ? <img src={q.user.avatar} className="w-full h-full rounded-full" /> : q.user?.name?.charAt(0)}
                                               </div>
                                               <div>
                                                  <p className="font-bold text-sm text-white">{q.user?.name}</p>
                                                  <p className="text-[10px] text-gray-500 font-medium">قبل {new Date(q.createdAt).toLocaleDateString()}</p>
                                               </div>
                                            </div>
                                         </div>
                                         <p className="text-gray-300 text-sm leading-relaxed">{q.content}</p>
                                      </div>
                                    ))
                                 ) : (
                                    <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
                                       <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4 opacity-20" />
                                       <p className="text-gray-500 font-bold italic">لا توجد أسئلة بعد. كن أول من يسأل!</p>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </TabsContent>

                        <TabsContent value="notes">
                           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                              <div className="flex items-center justify-between">
                                 <h3 className="text-xl font-black text-white uppercase tracking-widest">مذكرتي الرقمية</h3>
                                 <Badge className="bg-primary/20 text-primary border-none text-[8px] tracking-widest px-3 h-5">خاصة بك فقط</Badge>
                              </div>
                              <div className="relative group">
                                 <textarea 
                                   value={noteContent}
                                   onChange={(e) => setNoteContent(e.target.value)}
                                   placeholder="سجل أهم النقاط والحكم المستخلصة من هذا الدرس..."
                                   className="w-full min-h-[400px] bg-black/40 border border-white/10 rounded-3xl p-8 text-gray-300 italic leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-y"
                                 />
                              </div>
                              <div className="flex justify-end pt-4">
                                 <Button 
                                   onClick={saveNote}
                                   disabled={savingNote}
                                   className="h-14 px-10 bg-white text-black font-black rounded-2xl flex gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl"
                                 >
                                    {savingNote ? <span className="animate-spin">🌀</span> : "💾"}
                                    <span>حفظ المذكرات</span>
                                 </Button>
                              </div>
                           </div>
                        </TabsContent>

                       <TabsContent value="about">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                             <div className="md:col-span-2 space-y-8">
                                <div className="space-y-4">
                                   <h3 className="text-xl font-black text-white uppercase tracking-widest">وصف الدورة</h3>
                                   <p className="text-gray-400 leading-relaxed italic">يتم هنا عرض تفاصيل شاملة عن أهداف المادة والمهارات المكتسبة بعد إتمامها بالكامل.</p>
                                </div>
                                <div className="space-y-4">
                                   <h3 className="text-xl font-black text-white uppercase tracking-widest">متطلبات المادة</h3>
                                   <ul className="grid grid-cols-1 gap-3">
                                      {["المعرفة الأساسية بالموضوع", "الرغبة في التعلم", "تطبيقات عملية مستمرة"].map((item, i) => (
                                         <li key={i} className="flex items-center gap-3 text-gray-400 text-sm">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            <span>{item}</span>
                                         </li>
                                      ))}
                                   </ul>
                                </div>
                             </div>
                             <div className="space-y-6">
                                <div className="p-6 rounded-3xl border border-white/5 bg-white/5 space-y-4">
                                   <h4 className="font-black text-[10px] text-gray-500 uppercase tracking-widest">عن المعلم</h4>
                                   <div className="flex items-center gap-4">
                                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-black border border-primary/20 flex items-center justify-center text-primary text-xl font-black">
                                         {course?.instructorName?.charAt(0) || "U"}
                                      </div>
                                      <div>
                                         <p className="font-black text-white">{course?.instructorName || "أستاذ المادة"}</p>
                                         <div className="flex items-center gap-1 text-amber-500">
                                            <Star className="w-3 h-3 fill-current" />
                                            <span className="text-[10px] font-bold">4.9 تقييم</span>
                                         </div>
                                      </div>
                                   </div>
                                   <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 text-[10px] font-black uppercase h-10">عرض الملف الشخصي</Button>
                                </div>
                             </div>
                          </div>
                       </TabsContent>
                    </div>
                 </Tabs>
               </div>
             </div>

             {/* Footer Navigation */}
             <div className="flex items-center justify-between border-t border-white/5 pt-10">
                <Button variant="ghost" className="h-14 px-8 rounded-2xl border border-white/5 gap-3 text-gray-400 hover:text-white font-black uppercase tracking-widest text-[10px]">
                   <ChevronRight className="w-4 h-4 ml-2" />
                   المهمة السابقة
                </Button>
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => router.push(`/courses/${courseId}`)}>
                   <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-all">
                      <BookOpen className="w-5 h-5" />
                   </div>
                   <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover:text-white transition-colors">قائمة المهام الكاملة</span>
                </div>
                <Button className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 gap-3 text-white font-black uppercase tracking-widest text-[10px] hover:bg-white/10">
                   المهمة التالية
                   <ChevronLeft className="w-4 h-4 mr-2" />
                </Button>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
