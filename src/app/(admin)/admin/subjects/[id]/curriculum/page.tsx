"use client";

import { useEffect, useState } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AdminUpload } from "@/components/admin/ui/admin-upload";

type Lesson = {
  id: string;
  name: string;
  order: number;
  type: string;
  videoUrl?: string | null;
  duration?: number;
  isFree?: boolean;
  description?: string | null;
};

type Chapter = {
  id: string;
  name: string;
  order: number;
  subTopics: Lesson[];
};

type SubjectSummary = {
  id: string;
  name: string;
  nameAr?: string | null;
};

function SortableLesson({ lesson, onDelete, onEdit }: { lesson: Lesson; onDelete: (id: string) => void; onEdit: (lesson: Lesson) => void }) {
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
      <div className="flex-1 flex flex-col gap-0.5">
        <span className="text-sm font-bold">{lesson.name}</span>
        {lesson.videoUrl && (
          <span className="text-[10px] text-zinc-500 font-medium truncate max-w-[200px]">
            {lesson.videoUrl}
          </span>
        )}
      </div>
      {lesson.isFree && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px]">مجاني</Badge>}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" onClick={() => onEdit(lesson)} className="h-8 w-8 text-zinc-400 hover:text-primary">
           <Edit className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(lesson.id)} className="h-8 w-8 text-red-500 hover:bg-red-500/10">
           <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SortableChapter({ chapter, onDeleteChapter, onAddLesson, onDeleteLesson, onReorderLessons, onEditChapter, onEditLesson }: { 
  chapter: Chapter; 
  onDeleteChapter: (id: string) => void;
  onAddLesson: (chapterId: string) => void;
  onDeleteLesson: (chapterId: string, lessonId: string) => void;
  onReorderLessons: (chapterId: string, event: DragEndEvent) => void;
  onEditChapter: (chapter: Chapter) => void;
  onEditLesson: (lesson: Lesson, chapterId: string) => void;
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
                <div onClick={() => setExpanded(!expanded)} className="cursor-pointer flex items-center gap-3 flex-1">
                   {expanded ? <ChevronUp className="w-5 h-5 text-primary" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                   <div className="space-y-0.5">
                      <h3 className="font-black text-sm uppercase tracking-widest">{chapter.name}</h3>
                      <p className="text-[10px] text-zinc-500 font-bold">{chapter.subTopics.length} دروس تعليمية</p>
                   </div>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => onEditChapter(chapter)} className="h-8 w-8 text-zinc-400 hover:text-primary">
                   <Edit className="w-4 h-4" />
                </Button>
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
                       <SortableLesson 
                        key={lesson.id} 
                        lesson={lesson} 
                        onDelete={(lId) => onDeleteLesson(chapter.id, lId)}
                        onEdit={(l) => onEditLesson(l, chapter.id)}
                      />
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
  const [_subject, setSubject] = useState<SubjectSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit states
  const [editingChapter, setEditingChapter] = useState<{ id: string, name: string } | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ lesson: Lesson, chapterId: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const res = await fetch(`/api/admin/subjects?id=${subjectId}&include=curriculum`);
        if (res.ok) {
          const data = await res.json();
          setSubject(data.data?.subject || null);
          setChapters(data.data?.curriculum || []);
        }
      } catch (_err) {
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
            type: "VIDEO",
            videoUrl: "",
            duration: 0,
            isFree: false
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

  const handleEditLesson = (lesson: Lesson, chapterId: string) => {
    setEditingLesson({ lesson: { ...lesson }, chapterId });
  };

  const handleSaveLesson = () => {
    if (!editingLesson) return;
    
    setChapters(prev => prev.map(c => {
      if (c.id === editingLesson.chapterId) {
        return {
          ...c,
          subTopics: c.subTopics.map(l => 
            l.id === editingLesson.lesson.id ? editingLesson.lesson : l
          )
        };
      }
      return c;
    }));
    setEditingLesson(null);
  };

  const handleEditChapter = (chapter: Chapter) => {
    setEditingChapter({ id: chapter.id, name: chapter.name });
  };

  const handleSaveChapter = () => {
    if (!editingChapter) return;
    setChapters(prev => prev.map(c => 
      c.id === editingChapter.id ? { ...c, name: editingChapter.name } : c
    ));
    setEditingChapter(null);
  };

  const handleSave = async () => {
     setIsSaving(true);
     try {
       const res = await fetch(`/api/admin/subjects`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ id: subjectId, curriculum: chapters }),
       });

       if (res.ok) {
         toast.success('تم حفظ المنهج بنجاح!');
       } else {
         const error = await res.json();
         toast.error(error.error || 'فشل حفظ المنهج');
       }
     } catch (_err) {
       toast.error('حدث خطأ في الاتصال');
     } finally {
       setIsSaving(false);
     }
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
             <Button
               variant="outline"
               className="border-zinc-200 dark:border-zinc-800 font-black text-[10px] uppercase h-11 px-6 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all"
               onClick={() => router.push(`/courses/${subjectId}`)}
             >
                <Layout className="w-4 h-4 ml-2" />
                معاينة المادة
             </Button>
             <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 text-black font-black text-[10px] uppercase h-11 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all">
                {isSaving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-black ml-2" />
                ) : (
                  <Save className="w-4 h-4 ml-2" />
                )}
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
                           onEditChapter={handleEditChapter}
                           onEditLesson={handleEditLesson}
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

       {/* Edit Chapter Dialog */}
       <Dialog open={!!editingChapter} onOpenChange={(open) => !open && setEditingChapter(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-black text-xl">تعديل الفصل الدراسي</DialogTitle>
              <DialogDescription className="text-zinc-500 font-bold text-xs">تغيير اسم الفصل الذي سيظهر للطلاب</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">اسم الفصل</Label>
                  <Input 
                    value={editingChapter?.name || ""} 
                    onChange={(e) => setEditingChapter(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="h-12 rounded-xl text-sm font-bold"
                  />
               </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveChapter} className="w-full h-12 rounded-xl bg-primary text-black font-black tracking-widest uppercase text-xs">حفظ التغييرات</Button>
            </DialogFooter>
          </DialogContent>
       </Dialog>

       {/* Edit Lesson Dialog */}
       <Dialog open={!!editingLesson} onOpenChange={(open) => !open && setEditingLesson(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-black text-xl">تعديل محتوى الدرس</DialogTitle>
              <DialogDescription className="text-zinc-500 font-bold text-xs">أدخل تفاصيل الدرس والروابط التعليمية</DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase">اسم الدرس</Label>
                  <Input 
                    value={editingLesson?.lesson.name || ""} 
                    onChange={(e) => setEditingLesson(prev => prev ? { ...prev, lesson: { ...prev.lesson, name: e.target.value } } : null)}
                    className="h-12 rounded-xl text-sm font-bold"
                  />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">نوع الدرس</Label>
                    <Select 
                      value={editingLesson?.lesson.type} 
                      onValueChange={(val) => setEditingLesson(prev => prev ? { ...prev, lesson: { ...prev.lesson, type: val } } : null)}
                    >
                      <SelectTrigger className="h-12 rounded-xl text-sm font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VIDEO">فيديو تعليمي</SelectItem>
                        <SelectItem value="ARTICLE">مقال / نص</SelectItem>
                        <SelectItem value="QUIZ">اختبار سريع</SelectItem>
                        <SelectItem value="FILE">ملف PDF / مرفق</SelectItem>
                      </SelectContent>
                    </Select>
                 </div>
                 <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase">مدة الدرس (دقائق)</Label>
                    <Input 
                      type="number"
                      value={editingLesson?.lesson.duration || 0} 
                      onChange={(e) => setEditingLesson(prev => prev ? { ...prev, lesson: { ...prev.lesson, duration: parseInt(e.target.value) || 0 } } : null)}
                      className="h-12 rounded-xl text-sm font-bold"
                    />
                 </div>
               </div>

               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase">محتوى الدرس (فيديو / رابط)</Label>
                  <div className="space-y-3">
                    <div className="relative">
                      <Input 
                        value={editingLesson?.lesson.videoUrl || ""} 
                        onChange={(e) => setEditingLesson(prev => prev ? { ...prev, lesson: { ...prev.lesson, videoUrl: e.target.value } } : null)}
                        className="h-12 rounded-xl text-sm font-bold pr-10"
                        placeholder="https://..."
                      />
                      <Video className="absolute left-3 top-4 w-4 h-4 text-zinc-400" />
                    </div>
                    {editingLesson?.lesson.type === 'VIDEO' && (
                      <AdminUpload 
                        accept="video/*" 
                        label="رفع فيديو الدرس من الكمبيوتر" 
                        onUploadComplete={(url: string) => setEditingLesson(prev => prev ? { ...prev, lesson: { ...prev.lesson, videoUrl: url } } : null)} 
                      />
                    )}
                  </div>
               </div>

               <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">درس مجاني</Label>
                    <p className="text-[10px] text-zinc-500 font-medium">سيظهر هذا الدرس كمعاينة للطلاب غير المشتركين</p>
                  </div>
                  <Switch 
                    checked={editingLesson?.lesson.isFree || false} 
                    onCheckedChange={(checked: boolean) => setEditingLesson(prev => prev ? { ...prev, lesson: { ...prev.lesson, isFree: checked } } : null)}
                  />
               </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveLesson} className="w-full h-12 rounded-xl bg-primary text-black font-black tracking-widest uppercase text-xs">حفظ بيانات الدرس</Button>
            </DialogFooter>
          </DialogContent>
       </Dialog>

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
