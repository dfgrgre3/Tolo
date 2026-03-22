"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Plus, 
  GripVertical, 
  Trash2, 
  Edit, 
  ChevronDown, 
  ChevronUp, 
  Video, 
  FileText, 
  Save, 
  ArrowRight,
  PlusCircle,
  MoreVertical,
  Layers,
  Layout
} from "lucide-react";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Lesson = {
  id: string;
  name: string;
  order: number;
  type: string;
};

type Chapter = {
  id: string;
  name: string;
  order: number;
  subTopics: Lesson[];
};

function SortableLesson({ lesson, onDelete }: { lesson: Lesson; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lesson.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl group hover:shadow-md transition-all"
    >
      <div {...attributes} {...listeners} className="cursor-grab text-zinc-400 hover:text-primary transition-colors">
        <GripVertical className="w-4 h-4" />
      </div>
      {lesson.type === 'VIDEO' ? <Video className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-emerald-500" />}
      <span className="flex-1 text-sm font-bold">{lesson.name}</span>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-100">
           <Edit className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(lesson.id)} className="h-8 w-8 text-red-500 hover:bg-red-500/10">
           <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SortableChapter({ chapter, onDeleteChapter, onAddLesson, onDeleteLesson, onReorderLessons }: { 
  chapter: Chapter; 
  onDeleteChapter: (id: string) => void;
  onAddLesson: (chapterId: string) => void;
  onDeleteLesson: (chapterId: string, lessonId: string) => void;
  onReorderLessons: (chapterId: string, event: DragEndEvent) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div ref={setNodeRef} style={style} className="space-y-3">
       <Card className={cn(
         "border-zinc-200 dark:border-zinc-800 transition-all",
         expanded ? "shadow-lg bg-zinc-50/50 dark:bg-zinc-900/50" : "bg-white dark:bg-zinc-900"
       )}>
          <CardContent className="p-4 flex items-center justify-between gap-4">
             <div className="flex items-center gap-3 flex-1">
                <div {...attributes} {...listeners} className="cursor-grab text-zinc-400 hover:text-primary p-2">
                   <GripVertical className="w-5 h-5" />
                </div>
                <div onClick={() => setExpanded(!expanded)} className="cursor-pointer flex items-center gap-3">
                   {expanded ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                   <div className="space-y-0.5">
                      <h3 className="font-black text-sm uppercase tracking-widest">{chapter.name}</h3>
                      <p className="text-[10px] text-zinc-500 font-bold">{chapter.subTopics.length} دروس تعليمية</p>
                   </div>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onAddLesson(chapter.id)} className="h-8 rounded-lg border-zinc-200 dark:border-zinc-800 gap-2 font-black text-[10px] uppercase">
                   <PlusCircle className="w-3.5 h-3.5" />
                   إضافة درس
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDeleteChapter(chapter.id)} className="h-8 w-8 text-red-500 hover:bg-red-500/10">
                   <Trash2 className="w-4 h-4" />
                </Button>
             </div>
          </CardContent>
       </Card>

       {expanded && (
         <div className="pr-12 pl-4 pb-6 space-y-3 border-r-2 border-zinc-100 dark:border-zinc-800 mr-6">
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCenter} 
              onDragEnd={(e) => onReorderLessons(chapter.id, e)}
            >
               <SortableContext items={chapter.subTopics.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                     {chapter.subTopics.map(lesson => (
                       <SortableLesson key={lesson.id} lesson={lesson} onDelete={(lId) => onDeleteLesson(chapter.id, lId)} />
                     ))}
                     {chapter.subTopics.length === 0 && (
                       <div className="p-8 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl">
                          <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest italic">لا توجد دروس في هذا الفصل بعد</p>
                       </div>
                     )}
                  </div>
               </SortableContext>
            </DndContext>
         </div>
       )}
    </div>
  );
}

export default function CurriculumEditorPage() {
  const params = useParams();
  const router = useRouter();
  const subjectId = params.id as string;

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const res = await fetch(`/api/courses/${subjectId}/curriculum`);
        if (res.ok) {
          const data = await res.json();
          setChapters(data.curriculum || []);
        }
      } catch (err) {
        toast.error("فشل تحميل المنهج");
      } finally {
        setLoading(false);
      }
    };
    fetchCurriculum();
  }, [subjectId]);

  const handleDragEndChapter = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setChapters((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleReorderLessons = (chapterId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setChapters((prev) => prev.map(chapter => {
        if (chapter.id === chapterId) {
          const oldIndex = chapter.subTopics.findIndex(l => l.id === active.id);
          const newIndex = chapter.subTopics.findIndex(l => l.id === over.id);
          return {
            ...chapter,
            subTopics: arrayMove(chapter.subTopics, oldIndex, newIndex)
          };
        }
        return chapter;
      }));
    }
  };

  const addChapter = () => {
    const newChapter: Chapter = {
      id: `new-${Date.now()}`,
      name: "فصل دراسي جديد",
      order: chapters.length,
      subTopics: []
    };
    setChapters([...chapters, newChapter]);
  };

  const deleteChapter = (id: string) => {
    setChapters(chapters.filter(c => c.id !== id));
  };

  const addLesson = (chapterId: string) => {
    setChapters(prev => prev.map(c => {
      if (c.id === chapterId) {
        return {
          ...c,
          subTopics: [...c.subTopics, {
            id: `new-lesson-${Date.now()}`,
            name: "درس جديد",
            order: c.subTopics.length,
            type: "VIDEO"
          }]
        };
      }
      return c;
    }));
  };

  const deleteLesson = (chapterId: string, lessonId: string) => {
     setChapters(prev => prev.map(c => {
        if (c.id === chapterId) {
           return { ...c, subTopics: c.subTopics.filter(l => l.id !== lessonId) };
        }
        return c;
     }));
  };

  const handleSave = async () => {
     // Here you would normally send the entire chapters array to the backend to sync
     toast.promise(
       new Promise(resolve => setTimeout(resolve, 1500)), 
       {
         loading: 'جاري حفظ التغييرات...',
         success: 'تم حفظ خارطة المنهج بنجاح!',
         error: 'حدث خطأ أثناء الحفظ',
       }
     );
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center dark:bg-zinc-950">
       <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
    </div>
  );

  return (
    <div className="space-y-8 p-4 lg:p-10 max-w-6xl mx-auto dark:bg-zinc-950 min-h-screen pb-40" dir="rtl">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
             <div className="flex items-center gap-2 text-zinc-500 mb-2">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="h-8 p-0 hover:bg-transparent hover:text-primary">
                    <ArrowRight className="w-4 h-4 ml-2" />
                    العودة للمواد
                </Button>
             </div>
             <h1 className="text-4xl font-black tracking-tight dark:text-white">مـنشئ المـنهج التعليمي</h1>
             <p className="text-zinc-500 font-bold text-sm">قم بترتيب الفصول والدروس وإضافة المحتوى التعليمي للمادة</p>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="outline" className="border-zinc-200 dark:border-zinc-800 font-black text-[10px] uppercase h-11 px-6 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all">
                <Layout className="w-4 h-4 ml-2" />
                معاينة المادة
             </Button>
             <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-black font-black text-[10px] uppercase h-11 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all">
                <Save className="w-4 h-4 ml-2" />
                حفظ التغييرات
             </Button>
          </div>
       </div>

       <div className="grid grid-cols-1 gap-10">
          <div className="space-y-6">
             <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
                <div className="flex items-center gap-3">
                   <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Layers className="w-5 h-5" />
                   </div>
                   <h2 className="text-xl font-bold dark:text-zinc-100">هيكلية الفصول الدراسية</h2>
                </div>
                <Button onClick={addChapter} variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 font-bold text-[10px] h-10 px-5 rounded-xl uppercase">
                   <Plus className="w-4 h-4 ml-2" />
                   إضافة فصل جديد
                </Button>
             </div>

             <DndContext 
               sensors={sensors} 
               collisionDetection={closestCenter} 
               onDragEnd={handleDragEndChapter}
             >
                <SortableContext items={chapters.map(c => c.id)} strategy={verticalListSortingStrategy}>
                   <div className="space-y-6">
                      {chapters.map((chapter) => (
                        <SortableChapter 
                           key={chapter.id} 
                           chapter={chapter} 
                           onDeleteChapter={deleteChapter}
                           onAddLesson={addLesson}
                           onDeleteLesson={deleteLesson}
                           onReorderLessons={handleReorderLessons}
                        />
                      ))}
                      {chapters.length === 0 && (
                        <div className="py-20 text-center border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-[2rem] bg-zinc-50/30 dark:bg-zinc-900/10">
                           <Layers className="w-16 h-16 text-zinc-300 dark:text-zinc-800 mx-auto mb-6 opacity-20" />
                           <h3 className="text-lg font-bold text-zinc-400 mb-2 italic">لم تقم بإضافة أي فصول تعليمية بعد</h3>
                           <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-loose">ابدأ بإضافة فصل جديد لتقسيم المادة العلمية إلى مراحل منظمة</p>
                           <Button onClick={addChapter} className="mt-8 bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 font-black text-[10px] uppercase h-11 px-8 rounded-xl shadow-xl">إنشاء أول فصل الآن</Button>
                        </div>
                      )}
                   </div>
                </SortableContext>
             </DndContext>
          </div>
       </div>

       {/* Floating Quick Stats */}
       <div className="fixed bottom-10 left-10 p-6 rounded-[2rem] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl shadow-black/20 hidden xl:flex flex-col gap-6 z-50 min-w-[240px]" dir="rtl">
          <h4 className="font-black text-[10px] text-zinc-500 uppercase tracking-widest">إحصائيات المنهج</h4>
          <div className="space-y-4">
             <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold">إجمالي الفصول</span>
                <span className="text-sm font-black text-primary">{chapters.length}</span>
             </div>
             <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-bold">إجمالي الدروس</span>
                <span className="text-sm font-black text-primary">{chapters.reduce((acc, c) => acc + c.subTopics.length, 0)}</span>
             </div>
             <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Badge className="w-full justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-none h-8 text-[9px] uppercase tracking-tighter">الحالة: مسودة غير منشورة</Badge>
             </div>
          </div>
       </div>
    </div>
  );
}
