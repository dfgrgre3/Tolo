"use client";

import React, { useState } from "react";
import { Plus, Trash2, Edit2, ChevronDown, ChevronUp, Video, FileText, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Chapter, Lesson } from "../hooks/use-teaching-data";
import { Switch } from "@/components/ui/switch";

interface LessonBuilderProps {
  chapters: Chapter[];
  onChange: (chapters: Chapter[]) => void;
}

interface EditLessonModalProps {
  lesson: Lesson;
  onSave: (updated: Partial<Lesson>) => void;
  onClose: () => void;
}

function EditLessonModal({ lesson, onSave, onClose }: EditLessonModalProps) {
  const [title, setTitle] = useState(lesson.title);
  const [duration, setDuration] = useState(lesson.duration);
  const [url, setUrl] = useState(lesson.url || "");
  const [description, setDescription] = useState(lesson.description || "");
  const [isPreview, setIsPreview] = useState(lesson.isPreview || false);
  const [type, setType] = useState<Lesson["type"]>(lesson.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-right" dir="rtl">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">تعديل تفاصيل الدرس</h4>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-xs font-semibold">
          <div className="space-y-1">
            <label className="text-slate-500">عنوان الدرس</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl text-right text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-500">نوع المحتوى</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as Lesson["type"])}
                className="w-full h-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-background px-3 text-xs"
              >
                <option value="video">فيديو (Video)</option>
                <option value="pdf">ملف (PDF)</option>
                <option value="quiz">اختبار (Quiz)</option>
                <option value="assignment">واجب (Assignment)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-slate-500">المدة / الحجم</label>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="مثال: 15 دقيقة" className="rounded-xl text-right text-xs" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-slate-500">رابط الفيديو أو الملف (URL)</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/video.mp4" className="rounded-xl font-mono text-left dir-ltr text-xs" dir="ltr" />
          </div>

          <div className="space-y-1">
            <label className="text-slate-500">شرح أو ملاحظات للدرس</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب توجيهات أو ملخص للدرس هنا..."
              rows={3}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-background p-2.5 text-xs text-right"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">سماح بالمعاينة المجانية (Free Preview)</span>
            <Switch checked={isPreview} onCheckedChange={setIsPreview} />
          </div>
        </div>

        <div className="flex gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button
            onClick={() => {
              onSave({ title, duration, url, description, isPreview, type });
              onClose();
            }}
            className="flex-1 bg-primary text-white rounded-xl text-xs"
          >
            حفظ التغييرات
          </Button>
          <Button variant="outline" onClick={onClose} className="rounded-xl text-xs">إلغاء</Button>
        </div>
      </div>
    </div>
  );
}

export default function LessonBuilder({ chapters, onChange }: LessonBuilderProps) {
  const [editingLessonInfo, setEditingLessonInfo] = useState<{ chapterId: string; lesson: Lesson } | null>(null);

  const addChapter = () => {
    const newChapter: Chapter = {
      id: `ch-${Date.now()}`,
      title: `الوحدة/الفصل ${chapters.length + 1}`,
      lessons: [],
    };
    onChange([...chapters, newChapter]);
  };

  const deleteChapter = (chapterId: string) => {
    onChange(chapters.filter((c) => c.id !== chapterId));
  };

  const updateChapterTitle = (chapterId: string, title: string) => {
    onChange(
      chapters.map((c) => (c.id === chapterId ? { ...c, title } : c))
    );
  };

  const addLesson = (chapterId: string, type: Lesson["type"]) => {
    onChange(
      chapters.map((c) => {
        if (c.id === chapterId) {
          const newLesson: Lesson = {
            id: `ls-${Date.now()}`,
            title: `درس جديد - ${type === "video" ? "فيديو" : type === "quiz" ? "اختبار" : "ملف PDF"}`,
            duration: type === "video" ? "15 دقيقة" : type === "quiz" ? "10 أسئلة" : "5 صفحات",
            type,
            isPreview: false,
          };
          return {
            ...c,
            lessons: [...c.lessons, newLesson],
          };
        }
        return c;
      })
    );
  };

  const updateLesson = (chapterId: string, lessonId: string, updated: Partial<Lesson>) => {
    onChange(
      chapters.map((c) => {
        if (c.id === chapterId) {
          return {
            ...c,
            lessons: c.lessons.map((l: Lesson) => (l.id === lessonId ? { ...l, ...updated } : l)),
          };
        }
        return c;
      })
    );
  };

  const deleteLesson = (chapterId: string, lessonId: string) => {
    onChange(
      chapters.map((c) => {
        if (c.id === chapterId) {
          return {
            ...c,
            lessons: c.lessons.filter((l: Lesson) => l.id !== lessonId),
          };
        }
        return c;
      })
    );
  };

  const moveLesson = (chapterId: string, lessonIndex: number, direction: "up" | "down") => {
    onChange(
      chapters.map((c) => {
        if (c.id === chapterId) {
          const list = [...c.lessons];
          const targetIndex = direction === "up" ? lessonIndex - 1 : lessonIndex + 1;
          if (targetIndex >= 0 && targetIndex < list.length) {
            const temp = list[lessonIndex]!;
            list[lessonIndex] = list[targetIndex]!;
            list[targetIndex] = temp;
          }
          return { ...c, lessons: list };
        }
        return c;
      })
    );
  };

  const getLessonIcon = (type: Lesson["type"]) => {
    switch (type) {
      case "video":
        return Video;
      case "quiz":
        return HelpCircle;
      default:
        return FileText;
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex justify-between items-center">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">هيكل المنهج والدروس</h4>
        <Button onClick={addChapter} size="sm" className="flex items-center gap-1">
          <Plus className="w-4 h-4" />
          إضافة فصل جديد
        </Button>
      </div>

      {chapters.length === 0 ? (
        <div className="text-center p-8 bg-slate-50 dark:bg-slate-900/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
          لا يوجد فصول حتى الآن. اضغط على الزر لإضافة فصلك الأول.
        </div>
      ) : (
        <div className="space-y-4">
          {chapters.map((chapter, chapterIdx) => (
            <div
              key={chapter.id}
              className="border border-slate-200 dark:border-slate-800 rounded-xl bg-card overflow-hidden"
            >
              {/* Chapter Header */}
              <div className="p-4 bg-slate-55/30 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-[10px] font-bold text-primary">الوحدة {chapterIdx + 1}:</span>
                  <input
                    type="text"
                    value={chapter.title}
                    onChange={(e) => updateChapterTitle(chapter.id, e.target.value)}
                    className="flex-1 text-xs font-bold bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary focus:outline-none py-0.5 text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <DropdownActions
                    onAddVideo={() => addLesson(chapter.id, "video")}
                    onAddQuiz={() => addLesson(chapter.id, "quiz")}
                    onAddPdf={() => addLesson(chapter.id, "pdf")}
                    onDelete={() => deleteChapter(chapter.id)}
                  />
                </div>
              </div>

              {/* Chapter Lessons List */}
              <div className="p-4 space-y-3">
                {chapter.lessons.length === 0 ? (
                  <div className="text-center p-4 text-[10px] text-slate-400">لا توجد دروس في هذا الفصل بعد</div>
                ) : (
                  chapter.lessons.map((lesson: Lesson, lessonIdx: number) => {
                    const LessonIcon = getLessonIcon(lesson.type);
                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-850 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all text-xs gap-3"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                            <LessonIcon className="w-4 h-4" />
                          </div>
                          <input
                            type="text"
                            value={lesson.title}
                            onChange={(e) => updateLesson(chapter.id, lesson.id, { title: e.target.value })}
                            className="bg-transparent border-b border-transparent focus:border-primary focus:outline-none py-0.5 w-full text-slate-700 dark:text-slate-350"
                          />
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={lesson.duration}
                            onChange={(e) => updateLesson(chapter.id, lesson.id, { duration: e.target.value })}
                            placeholder="المدة"
                            className="w-20 text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-500"
                          />

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400">معاينة</span>
                            <Switch
                              checked={lesson.isPreview}
                              onCheckedChange={(checked) =>
                                updateLesson(chapter.id, lesson.id, { isPreview: checked })
                              }
                            />
                          </div>

                          <div className="flex items-center border-r border-slate-100 dark:border-slate-800 pr-3 gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingLessonInfo({ chapterId: chapter.id, lesson })}
                              className="w-6 h-6 rounded text-slate-400 hover:text-primary"
                              title="تعديل التفاصيل الكاملة"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={lessonIdx === 0}
                              onClick={() => moveLesson(chapter.id, lessonIdx, "up")}
                              className="w-6 h-6 rounded"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={lessonIdx === chapter.lessons.length - 1}
                              onClick={() => moveLesson(chapter.id, lessonIdx, "down")}
                              className="w-6 h-6 rounded"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteLesson(chapter.id, lesson.id)}
                              className="w-6 h-6 rounded hover:text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingLessonInfo && (
        <EditLessonModal
          lesson={editingLessonInfo.lesson}
          onSave={(updated) => updateLesson(editingLessonInfo.chapterId, editingLessonInfo.lesson.id, updated)}
          onClose={() => setEditingLessonInfo(null)}
        />
      )}
    </div>
  );
}

interface DropdownActionsProps {
  onAddVideo: () => void;
  onAddQuiz: () => void;
  onAddPdf: () => void;
  onDelete: () => void;
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

function DropdownActions({ onAddVideo, onAddQuiz, onAddPdf, onDelete }: DropdownActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 rounded-xl border-slate-200 dark:border-slate-800 text-right">
        <DropdownMenuItem onClick={onAddVideo} className="px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer">
          <Video className="w-3.5 h-3.5 text-slate-400" />
          <span>إضافة درس فيديو</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddPdf} className="px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span>إضافة ملف PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddQuiz} className="px-3 py-1.5 text-xs flex items-center gap-2 cursor-pointer">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          <span>إضافة اختبار سريع</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="border-slate-100 dark:border-slate-850" />
        <DropdownMenuItem onClick={onDelete} className="px-3 py-1.5 text-xs text-red-500 flex items-center gap-2 cursor-pointer">
          <Trash2 className="w-3.5 h-3.5" />
          <span>حذف الفصل بالكامل</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
