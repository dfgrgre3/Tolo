"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Edit,
  FileText,
  GripVertical,
  Layers,
  Plus,
  PlusCircle,
  Save,
  Trash2,
  Video,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AdminUpload } from "@/components/admin/ui/admin-upload";

type LessonType = "VIDEO" | "ARTICLE" | "QUIZ" | "FILE" | "ASSIGNMENT";

type Lesson = {
  id: string;
  name: string;
  order: number;
  type: LessonType;
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

type CourseSummary = {
  id: string;
  name: string;
  nameAr?: string | null;
};

function SortableLesson({
  lesson,
  onDelete,
  onEdit,
}: {
  lesson: Lesson;
  onDelete: (id: string) => void;
  onEdit: (lesson: Lesson) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: lesson.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div {...attributes} {...listeners} className="cursor-grab text-zinc-400 transition-colors hover:text-primary">
        <GripVertical className="h-4 w-4" />
      </div>
      {lesson.type === "VIDEO" ? (
        <Video className="h-4 w-4 text-blue-500" />
      ) : (
        <FileText className="h-4 w-4 text-emerald-500" />
      )}
      <div className="flex-1">
        <div className="text-sm font-bold">{lesson.name}</div>
        <div className="text-[10px] font-medium text-zinc-500">
          {lesson.duration || 0} دقيقة
        </div>
      </div>
      {lesson.isFree && (
        <Badge className="border-emerald-500/20 bg-emerald-500/10 text-[9px] text-emerald-500">مجاني</Badge>
      )}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(lesson)}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => onDelete(lesson.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function SortableChapter({
  chapter,
  onDeleteChapter,
  onAddLesson,
  onDeleteLesson,
  onReorderLessons,
  onEditChapter,
  onEditLesson,
}: {
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
  const style = { transform: CSS.Transform.toString(transform), transition };
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  return (
    <div ref={setNodeRef} style={style} className="space-y-3">
      <Card className={cn("transition-all dark:border-zinc-800", expanded ? "bg-zinc-50/50 dark:bg-zinc-900/50" : "")}>
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div className="flex flex-1 items-center gap-3">
            <div {...attributes} {...listeners} className="cursor-grab p-2 text-zinc-400 hover:text-primary">
              <GripVertical className="h-5 w-5" />
            </div>
            <div className="flex flex-1 cursor-pointer items-center gap-3" onClick={() => setExpanded((value) => !value)}>
              {expanded ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-zinc-400" />}
              <div>
                <h3 className="text-sm font-black tracking-widest">{chapter.name}</h3>
                <p className="text-[10px] font-bold text-zinc-500">{chapter.subTopics.length} دروس</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEditChapter(chapter)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-2 rounded-lg text-[10px] font-black" onClick={() => onAddLesson(chapter.id)}>
              <PlusCircle className="h-3.5 w-3.5" />
              إضافة درس
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => onDeleteChapter(chapter.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {expanded && (
        <div className="mr-6 space-y-3 border-r-2 border-zinc-100 pb-6 pr-12 pl-4 dark:border-zinc-800">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => onReorderLessons(chapter.id, event)}>
            <SortableContext items={chapter.subTopics.map((lesson) => lesson.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {chapter.subTopics.map((lesson) => (
                  <SortableLesson
                    key={lesson.id}
                    lesson={lesson}
                    onDelete={(lessonId) => onDeleteLesson(chapter.id, lessonId)}
                    onEdit={(currentLesson) => onEditLesson(currentLesson, chapter.id)}
                  />
                ))}
                {chapter.subTopics.length === 0 && (
                  <div className="rounded-2xl border-2 border-dashed border-zinc-100 p-8 text-center dark:border-zinc-800">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">لا توجد دروس داخل هذا الفصل بعد</p>
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

export default function CourseCurriculumPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [course, setCourse] = useState<CourseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingChapter, setEditingChapter] = useState<{ id: string; name: string } | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ lesson: Lesson; chapterId: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        const response = await fetch(`/api/admin/courses/${courseId}/curriculum`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || result.message || "فشل تحميل المنهج");
        }

        setCourse(result.data?.course || null);
        setChapters(result.data?.curriculum || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "فشل تحميل المنهج");
      } finally {
        setLoading(false);
      }
    };

    fetchCurriculum();
  }, [courseId]);

  const handleDragEndChapter = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setChapters((current) => {
        const oldIndex = current.findIndex((item) => item.id === active.id);
        const newIndex = current.findIndex((item) => item.id === over.id);
        return arrayMove(current, oldIndex, newIndex);
      });
    }
  };

  const handleReorderLessons = (chapterId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setChapters((current) =>
        current.map((chapter) => {
          if (chapter.id !== chapterId) return chapter;
          const oldIndex = chapter.subTopics.findIndex((item) => item.id === active.id);
          const newIndex = chapter.subTopics.findIndex((item) => item.id === over.id);
          return { ...chapter, subTopics: arrayMove(chapter.subTopics, oldIndex, newIndex) };
        })
      );
    }
  };

  const addChapter = () => {
    setChapters((current) => [
      ...current,
      {
        id: `new-${Date.now()}`,
        name: "فصل دراسي جديد",
        order: current.length,
        subTopics: [],
      },
    ]);
  };

  const deleteChapter = (id: string) => {
    setChapters((current) => current.filter((chapter) => chapter.id !== id));
  };

  const addLesson = (chapterId: string) => {
    setChapters((current) =>
      current.map((chapter) => {
        if (chapter.id !== chapterId) return chapter;
        return {
          ...chapter,
          subTopics: [
            ...chapter.subTopics,
            {
              id: `new-lesson-${Date.now()}`,
              name: "درس جديد",
              order: chapter.subTopics.length,
              type: "VIDEO",
              videoUrl: "",
              duration: 0,
              isFree: false,
              description: "",
            },
          ],
        };
      })
    );
  };

  const deleteLesson = (chapterId: string, lessonId: string) => {
    setChapters((current) =>
      current.map((chapter) =>
        chapter.id === chapterId
          ? { ...chapter, subTopics: chapter.subTopics.filter((lesson) => lesson.id !== lessonId) }
          : chapter
      )
    );
  };

  const handleSaveChapter = () => {
    if (!editingChapter) return;
    setChapters((current) =>
      current.map((chapter) => (chapter.id === editingChapter.id ? { ...chapter, name: editingChapter.name } : chapter))
    );
    setEditingChapter(null);
  };

  const handleSaveLesson = () => {
    if (!editingLesson) return;
    setChapters((current) =>
      current.map((chapter) =>
        chapter.id === editingLesson.chapterId
          ? {
              ...chapter,
              subTopics: chapter.subTopics.map((lesson) =>
                lesson.id === editingLesson.lesson.id ? editingLesson.lesson : lesson
              ),
            }
          : chapter
      )
    );
    setEditingLesson(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}/curriculum`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curriculum: chapters }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.message || "فشل حفظ المنهج");
      }

      setChapters(result.data?.curriculum || chapters);
      toast.success("تم حفظ منهج الدورة بنجاح");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "فشل حفظ المنهج");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl space-y-8 p-4 pb-40 lg:p-10" dir="rtl">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" className="h-8 p-0 hover:bg-transparent" onClick={() => router.push("/admin/courses")}>
            <ArrowRight className="ml-2 h-4 w-4" />
            العودة للدورات
          </Button>
          <h1 className="text-4xl font-black tracking-tight">منهج الدورة التعليمية</h1>
          <p className="text-sm font-bold text-zinc-500">
            {course?.nameAr || course?.name || "الدورة"} - إدارة الفصول والدروس والمحتوى
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={isSaving} className="h-11 rounded-xl px-8 text-[10px] font-black uppercase">
            {isSaving ? <div className="ml-2 h-4 w-4 animate-spin rounded-full border-t-2 border-white" /> : <Save className="ml-2 h-4 w-4" />}
            حفظ التغييرات
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold">هيكل المنهج</h2>
          </div>
          <Button onClick={addChapter} variant="outline" className="h-10 rounded-xl px-5 text-[10px] font-bold uppercase">
            <Plus className="ml-2 h-4 w-4" />
            إضافة فصل
          </Button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndChapter}>
          <SortableContext items={chapters.map((chapter) => chapter.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-6">
              {chapters.map((chapter) => (
                <SortableChapter
                  key={chapter.id}
                  chapter={chapter}
                  onDeleteChapter={deleteChapter}
                  onAddLesson={addLesson}
                  onDeleteLesson={deleteLesson}
                  onReorderLessons={handleReorderLessons}
                  onEditChapter={(currentChapter) => setEditingChapter({ id: currentChapter.id, name: currentChapter.name })}
                  onEditLesson={(lesson, chapterId) => setEditingLesson({ lesson: { ...lesson }, chapterId })}
                />
              ))}
              {chapters.length === 0 && (
                <div className="rounded-[2rem] border-2 border-dashed border-zinc-100 bg-zinc-50/30 py-20 text-center dark:border-zinc-800 dark:bg-zinc-900/10">
                  <Layers className="mx-auto mb-6 h-16 w-16 text-zinc-300 opacity-20 dark:text-zinc-800" />
                  <h3 className="mb-2 text-lg font-bold text-zinc-400">لم يتم إنشاء أي فصول بعد</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">ابدأ بإضافة فصل جديد ثم أضف الدروس داخله</p>
                  <Button onClick={addChapter} className="mt-8 h-11 rounded-xl px-8 text-[10px] font-black uppercase">
                    إنشاء أول فصل
                  </Button>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <Dialog open={!!editingChapter} onOpenChange={(open) => !open && setEditingChapter(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">تعديل الفصل</DialogTitle>
            <DialogDescription className="text-xs font-bold text-zinc-500">حدّث الاسم الظاهر للطلاب</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label className="text-[10px] font-black uppercase">اسم الفصل</Label>
            <Input
              value={editingChapter?.name || ""}
              onChange={(event) => setEditingChapter((current) => (current ? { ...current, name: event.target.value } : null))}
              className="h-12 rounded-xl text-sm font-bold"
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSaveChapter} className="h-12 w-full rounded-xl text-xs font-black uppercase">
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLesson} onOpenChange={(open) => !open && setEditingLesson(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">تعديل الدرس</DialogTitle>
            <DialogDescription className="text-xs font-bold text-zinc-500">أدخل بيانات الدرس والمحتوى المرتبط به</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">اسم الدرس</Label>
              <Input
                value={editingLesson?.lesson.name || ""}
                onChange={(event) =>
                  setEditingLesson((current) =>
                    current ? { ...current, lesson: { ...current.lesson, name: event.target.value } } : null
                  )
                }
                className="h-12 rounded-xl text-sm font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">نوع الدرس</Label>
                <Select
                  value={editingLesson?.lesson.type}
                  onValueChange={(value: LessonType) =>
                    setEditingLesson((current) =>
                      current ? { ...current, lesson: { ...current.lesson, type: value } } : null
                    )
                  }
                >
                  <SelectTrigger className="h-12 rounded-xl text-sm font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIDEO">فيديو</SelectItem>
                    <SelectItem value="ARTICLE">مقال</SelectItem>
                    <SelectItem value="QUIZ">اختبار</SelectItem>
                    <SelectItem value="FILE">ملف</SelectItem>
                    <SelectItem value="ASSIGNMENT">واجب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase">المدة بالدقائق</Label>
                <Input
                  type="number"
                  value={editingLesson?.lesson.duration || 0}
                  onChange={(event) =>
                    setEditingLesson((current) =>
                      current
                        ? { ...current, lesson: { ...current.lesson, duration: Number(event.target.value) || 0 } }
                        : null
                    )
                  }
                  className="h-12 rounded-xl text-sm font-bold"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase">رابط أو ملف المحتوى</Label>
              <Input
                value={editingLesson?.lesson.videoUrl || ""}
                onChange={(event) =>
                  setEditingLesson((current) =>
                    current ? { ...current, lesson: { ...current.lesson, videoUrl: event.target.value } } : null
                  )
                }
                className="h-12 rounded-xl text-sm font-bold"
                placeholder="https://..."
              />
              {editingLesson?.lesson.type === "VIDEO" && (
                <AdminUpload
                  accept="video/*"
                  label="رفع فيديو الدرس"
                  onUploadComplete={(url: string) =>
                    setEditingLesson((current) =>
                      current ? { ...current, lesson: { ...current.lesson, videoUrl: url } } : null
                    )
                  }
                />
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase">وصف الدرس</Label>
              <Input
                value={editingLesson?.lesson.description || ""}
                onChange={(event) =>
                  setEditingLesson((current) =>
                    current ? { ...current, lesson: { ...current.lesson, description: event.target.value } } : null
                  )
                }
                className="h-12 rounded-xl text-sm font-bold"
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div>
                <Label className="text-sm font-bold">درس مجاني</Label>
                <p className="text-[10px] text-zinc-500">يظهر كمعاينة قبل الاشتراك</p>
              </div>
              <Switch
                checked={editingLesson?.lesson.isFree || false}
                onCheckedChange={(checked) =>
                  setEditingLesson((current) =>
                    current ? { ...current, lesson: { ...current.lesson, isFree: checked } } : null
                  )
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveLesson} className="h-12 w-full rounded-xl text-xs font-black uppercase">
              حفظ بيانات الدرس
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
