"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, Save, X, Upload, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LessonBuilder from "./LessonBuilder";
import { QuizBuilder } from "./QuizBuilder";
import { Course, Chapter } from "../hooks/use-teaching-data";
import type { QuizQuestion } from "@/types/course-quiz";

interface CourseWizardProps {
  course?: Course | null; // If null, we are creating a new course
  onSave: (course: Partial<Course>) => void | Promise<void>;
  onClose: () => void;
  isSaving?: boolean;
}

export default function CourseWizard({ course, onSave, onClose, isSaving = false }: CourseWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState(course?.title || "");
  const [description, setDescription] = useState(course?.description || "");
  const [category, setCategory] = useState(course?.category || "البرمجة والتطوير");
  const [price, setPrice] = useState(course?.price?.toString() || "0");
  const [thumbnail, setThumbnail] = useState(course?.thumbnail || "");
  const [status, setStatus] = useState<Course["status"]>(course?.status || "draft");
  const [chapters, setChapters] = useState<Chapter[]>(course?.chapters || []);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    course?.quiz?.questions || []
  );
  const [quizSettings, setQuizSettings] = useState({
    passingScore: course?.quiz?.passingScore ?? 60,
    timeLimitMinutes: course?.quiz?.timeLimitMinutes ?? 15,
    shuffleQuestions: course?.quiz?.shuffleQuestions ?? false,
    shuffleOptions: course?.quiz?.shuffleOptions ?? false,
    showCorrectAnswers: course?.quiz?.showCorrectAnswers ?? true,
  });
  const [errorMsg, setErrorMsg] = useState("");
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const handleThumbnailFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة صالح (PNG / JPG / WEBP)");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("حجم الصورة كبير جداً، الحد الأقصى 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setThumbnail(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  };

  const steps = [
    { num: 1, label: "المعلومات الأساسية" },
    { num: 2, label: "الوسائط والغلاف" },
    { num: 3, label: "منهج الكورس" },
    { num: 4, label: "اختبار الكورس" },
    { num: 5, label: "السعر والنشر" },
  ];

  const handleNext = () => {
    if (currentStep === 1 && !title.trim()) {
      setErrorMsg("يرجى إدخال عنوان الكورس أولاً");
      return;
    }
    setErrorMsg("");
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setErrorMsg("");
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg("يرجى إدخال عنوان الكورس");
      return;
    }
    try {
      await onSave({
        title,
        description,
        category,
        price: parseFloat(price) || 0,
        thumbnail,
        status,
        chapters,
        lessonsCount: chapters.reduce((acc, curr) => acc + curr.lessons.length, 0),
        quiz: {
          title: `${title} — اختبار`,
          passingScore: quizSettings.passingScore,
          timeLimitMinutes: quizSettings.timeLimitMinutes,
          shuffleQuestions: quizSettings.shuffleQuestions,
          shuffleOptions: quizSettings.shuffleOptions,
          showCorrectAnswers: quizSettings.showCorrectAnswers,
          questions: quizQuestions,
        },
      });
    } catch {
      // Errors are surfaced by the caller via toasts; keep the wizard open
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-right" dir="rtl">
      <div className="bg-card w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {course ? "تعديل الكورس التعليمي" : "إنشاء كورس جديد"}
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-450 mt-0.5">أكمل الخطوات الأربع لتجهيز الكورس الخاص بك</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Progress Header */}
        <div className="px-4 sm:px-8 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-850 grid grid-cols-5 gap-2 text-center text-[10px] font-bold">
          {steps.map((st) => (
            <div
              key={st.num}
              className={`pb-2 border-b-2 transition-colors ${
                currentStep === st.num
                  ? "border-primary text-primary"
                  : currentStep > st.num
                  ? "border-emerald-500 text-emerald-500"
                  : "border-slate-200 dark:border-slate-800 text-slate-400"
              }`}
            >
              خطوة {st.num}: {st.label}
            </div>
          ))}
        </div>

        {/* Form Body Container */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl text-xs border border-red-200/50">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-slate-500">عنوان الكورس *</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: احترف تطوير تطبيقات الويب بـ Next.js"
                  className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 py-5 text-right"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-500">وصف الكورس</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب نبذة مختصرة عن الكورس وأهدافه والجمهور المستهدف..."
                  rows={5}
                  className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-right"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-500">تصنيف الكورس</label>
                <Select value={category} onValueChange={(val) => setCategory(val)}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-right">
                    <SelectValue placeholder="اختر تصنيف الكورس" />
                  </SelectTrigger>
                  <SelectContent className="text-right">
                    <SelectItem value="البرمجة والتطوير">البرمجة والتطوير</SelectItem>
                    <SelectItem value="التصميم والواجهات">التصميم والواجهات</SelectItem>
                    <SelectItem value="التسويق الرقمي">التسويق الرقمي</SelectItem>
                    <SelectItem value="اللغات والترجمة">اللغات والترجمة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* STEP 2: Thumbnail & Trailer */}
          {currentStep === 2 && (
            <div className="space-y-6 text-xs font-semibold">
              <div className="space-y-2">
                <label className="text-slate-500">غلاف الكورس (صورة Thumbnail)</label>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleThumbnailFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <div
                  onClick={() => thumbnailInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleThumbnailFile(e.dataTransfer.files?.[0]);
                  }}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/10 cursor-pointer hover:border-primary/50 transition-colors"
                >
                  {thumbnail ? (
                    <div className="relative w-full max-w-sm aspect-video rounded-xl overflow-hidden shadow-md">
                      <Image src={thumbnail} alt="غلاف الكورس" fill sizes="384px" className="object-cover" unoptimized />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setThumbnail("");
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors z-10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-slate-400">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-xs text-slate-400">اضغط لرفع الغلاف أو اسحب الصورة وأفلتها هنا</p>
                      <p className="text-[10px] text-slate-400/70">PNG / JPG / WEBP — حتى 2MB، أو ضع الرابط أدناه</p>
                    </div>
                  )}
                </div>
                <Input
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="رابط غلاف الكورس (URL)"
                  className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-right mt-3"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Curriculum Builder */}
          {currentStep === 3 && (
            <LessonBuilder chapters={chapters} onChange={(newChapters) => setChapters(newChapters)} />
          )}

          {/* STEP 4: Quiz Builder */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 rounded-xl bg-violet-500/5 border border-violet-500/20 p-4">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  أضف اختباراً تفاعلياً للكورس. سيتمكن الطلاب من حله بعد التسجيل في الكورس، وحساب النتيجة تلقائياً للأسئلة الموضوعية.
                </div>
              </div>

              <QuizBuilder questions={quizQuestions} onChange={setQuizQuestions} />

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 text-xs font-semibold">
                <p className="text-slate-800 dark:text-slate-200 font-bold text-xs">إعدادات الاختبار</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-500">درجة النجاح (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={String(quizSettings.passingScore)}
                      onChange={(e) => setQuizSettings((s) => ({ ...s, passingScore: Number(e.target.value) || 0 }))}
                      className="rounded-xl text-right text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500">المهلة (بالدقائق)</label>
                    <Input
                      type="number"
                      min={0}
                      value={String(quizSettings.timeLimitMinutes)}
                      onChange={(e) => setQuizSettings((s) => ({ ...s, timeLimitMinutes: Number(e.target.value) || 0 }))}
                      className="rounded-xl text-right text-xs"
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <ToggleRow label="خلط ترتيب الأسئلة" checked={quizSettings.shuffleQuestions} onChange={(v) => setQuizSettings((s) => ({ ...s, shuffleQuestions: v }))} />
                  <ToggleRow label="خلط ترتيب الخيارات" checked={quizSettings.shuffleOptions} onChange={(v) => setQuizSettings((s) => ({ ...s, shuffleOptions: v }))} />
                  <ToggleRow label="إظهار الإجابات الصحيحة بعد الحل" checked={quizSettings.showCorrectAnswers} onChange={(v) => setQuizSettings((s) => ({ ...s, showCorrectAnswers: v }))} />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Pricing & Publish Settings */}
          {currentStep === 5 && (
            <div className="space-y-6 text-xs font-semibold">
              <div className="space-y-1.5">
                <label className="text-slate-500 font-bold text-xs">سعر الكورس (بالدولار $)</label>
                <Input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0 (مجاني)"
                  className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-right"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-bold text-xs">حالة الظهور</label>
                <Select value={status} onValueChange={(val: Course["status"]) => setStatus(val)}>
                  <SelectTrigger className="rounded-xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-right">
                    <SelectValue placeholder="حالة الكورس" />
                  </SelectTrigger>
                  <SelectContent className="text-right">
                    <SelectItem value="draft">حفظ كمسودة (غير مرئي للطلاب)</SelectItem>
                    <SelectItem value="published">نشر فوري (متاح للجميع)</SelectItem>
                    <SelectItem value="archived">أرشفة الكورس</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50/20 dark:bg-slate-900/10">
          <div className="flex gap-2">
            {currentStep === 5 ? (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-2 rounded-xl px-5"
              >
                <Save className="w-4 h-4" />
                {isSaving ? "جاري الحفظ..." : "حفظ وإنهاء"}
              </Button>
            ) : (
              <Button onClick={handleNext} className="bg-primary hover:bg-primary/95 text-white flex items-center gap-2 rounded-xl px-5">
                التالي
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
          </div>
          <Button
            onClick={handleBack}
            disabled={currentStep === 1}
            variant="outline"
            className="flex items-center gap-2 rounded-xl"
          >
            <ArrowRight className="w-4 h-4" />
            السابق
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
