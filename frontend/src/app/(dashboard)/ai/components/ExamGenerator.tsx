"use client";

import React from "react";
import { m } from "framer-motion";
import {
  FileText,
  Brain,
  Loader2,
  CheckCircle,
  Zap,
  AlertCircle,
  Save,
  X,
  RefreshCw,
  BookOpen,
  Calendar,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useExamGenerator } from "../hooks/useExamGenerator";

interface ExamGeneratorProps {
  subjects: string[];
  years: number[];
  className?: string;
}

export default function ExamGenerator({ subjects, years, className = "" }: ExamGeneratorProps) {
  const {
    selectedSubject,
    setSelectedSubject,
    selectedYear,
    setSelectedYear,
    lesson,
    setLesson,
    difficulty,
    setDifficulty,
    questionCount,
    setQuestionCount,
    isGenerating,
    isSaving,
    examData,
    error,
    saveError,
    saveSuccess,
    pollSeconds,
    handleSubmit,
    handleRetryEnqueue,
    handleSaveExam,
    resetGenerator,
  } = useExamGenerator({ subjects, years });

  return (
    <div className={`bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden ${className}`}>
      <div className="p-8 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/30 blur-lg rounded-full" />
            <div className="relative p-3 bg-blue-500/20 rounded-xl border border-blue-500/30">
              <FileText className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">منشئ الامتحانات الذكي</h2>
            <p className="text-gray-400 text-sm mt-1">أنشئ امتحانات مخصصة بالذكاء الاصطناعي</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/30">
          <Zap className="h-3 w-3" />
          <span>Gemini 2.0 Flash</span>
        </div>
      </div>

      <div className="p-8">
        {!examData ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="selectedSubject" className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  المادة <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10" />
                  <Select value={selectedSubject} onValueChange={setSelectedSubject} required>
                    <SelectTrigger
                      className="pl-10 bg-white/5 border-white/10 rounded-2xl h-14 text-white focus:ring-blue-500/50"
                      id="selectedSubject"
                    >
                      <SelectValue placeholder="اختر المادة" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10 text-white">
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="selectedYear" className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  السنة الدراسية <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 z-10" />
                  <Select value={selectedYear} onValueChange={setSelectedYear} required>
                    <SelectTrigger
                      className="pl-10 bg-white/5 border-white/10 rounded-2xl h-14 text-white focus:ring-blue-500/50"
                      id="selectedYear"
                    >
                      <SelectValue placeholder="اختر السنة الدراسية" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10 text-white">
                      {years.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          الصف {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lesson" className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  الدرس <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="lesson"
                  type="text"
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                  placeholder="أدخل اسم الدرس"
                  required
                  minLength={3}
                  maxLength={200}
                  className="bg-white/5 border-white/10 rounded-2xl h-14 text-white focus:ring-blue-500/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  مستوى الصعوبة
                </Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger
                    className="bg-white/5 border-white/10 rounded-2xl h-14 text-white focus:ring-blue-500/50"
                    id="difficulty"
                  >
                    <SelectValue placeholder="اختر مستوى الصعوبة" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10 text-white">
                    <SelectItem value="none">اختر مستوى الصعوبة</SelectItem>
                    <SelectItem value="سهل">سهل</SelectItem>
                    <SelectItem value="متوسط">متوسط</SelectItem>
                    <SelectItem value="صعب">صعب</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="questionCount" className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  عدد الأسئلة
                </Label>
                <Input
                  id="questionCount"
                  type="number"
                  min="1"
                  max="50"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
                  className="bg-white/5 border-white/10 rounded-2xl h-14 text-white focus:ring-blue-500/50"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-400 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <AlertDescription>{error}</AlertDescription>
                  {(error.includes("network") ||
                    error.includes("timeout") ||
                    error.includes("انتهت صلاحية") ||
                    error.includes("استغرق")) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRetryEnqueue}
                      className="mt-2 border-red-500/30 text-red-400 hover:bg-red-500/20"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      إعادة المحاولة
                    </Button>
                  )}
                </div>
              </Alert>
            )}

            {isGenerating && (
              <div className="text-xs text-blue-300/80 text-center" aria-live="polite">
                جاري إنشاء الامتحان في الخلفية{pollSeconds > 0 ? ` (${pollSeconds} ثانية)` : "..."} — يمكنك متابعة استخدام الموقع.
              </div>
            )}

            <Button
              type="submit"
              disabled={isGenerating}
              className="w-full md:w-auto px-12 h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  جاري إنشاء الامتحان...
                </>
              ) : (
                <>
                  <Brain className="h-5 w-5 mr-3" />
                  إنشاء الامتحان
                </>
              )}
            </Button>
          </form>
        ) : (
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex items-center gap-3 text-emerald-400">
              <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                <CheckCircle className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg">تم إنشاء الامتحان بنجاح!</span>
            </div>

            <div className="border border-white/10 rounded-2xl p-6 bg-white/5">
              <h3 className="font-bold text-white mb-4">الأسئلة ({examData.questions?.length || 0})</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {examData.questions?.map((question, index) => (
                  <div key={index} className="border border-white/10 rounded-xl p-5 bg-black/20">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-white mb-3">{question.question}</p>

                        {question.type === "multiple_choice" && question.options && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            {question.options.map((option, i) => (
                              <div
                                key={i}
                                className={`p-3 rounded-xl border transition-all ${
                                  option === question.correctAnswer
                                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                                    : "border-white/10 bg-white/5 text-gray-300"
                                }`}
                              >
                                {option}
                              </div>
                            ))}
                          </div>
                        )}

                        {question.type === "true_false" && (
                          <div className="flex gap-3 mb-4">
                            <div
                              className={`p-3 rounded-xl border flex-1 text-center ${
                                question.correctAnswer === "صح"
                                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                                  : "border-white/10 bg-white/5 text-gray-300"
                              }`}
                            >
                              صح
                            </div>
                            <div
                              className={`p-3 rounded-xl border flex-1 text-center ${
                                question.correctAnswer === "خطأ"
                                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                                  : "border-white/10 bg-white/5 text-gray-300"
                              }`}
                            >
                              خطأ
                            </div>
                          </div>
                        )}

                        <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl">
                          <p className="text-sm font-bold text-blue-400 mb-2">الإجابة الصحيحة:</p>
                          <p className="text-blue-300">{question.correctAnswer}</p>
                          {question.explanation && (
                            <>
                              <p className="text-sm font-bold text-blue-400 mt-3 mb-2">الشرح:</p>
                              <p className="text-blue-300">{question.explanation}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {saveSuccess && (
              <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <AlertDescription>تم حفظ الامتحان بنجاح!</AlertDescription>
              </Alert>
            )}

            {saveError && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-400 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              <Button
                onClick={resetGenerator}
                variant="outline"
                className="flex-1 h-14 rounded-2xl border-white/10 text-gray-400 hover:bg-white/10"
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                إنشاء امتحان جديد
              </Button>
              <Button
                onClick={handleSaveExam}
                className="flex-1 h-14 bg-primary hover:bg-primary/90 text-black font-black rounded-2xl shadow-xl shadow-primary/20"
                disabled={isSaving || !examData?.questions || examData.questions.length === 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    حفظ الامتحان
                  </>
                )}
              </Button>
            </div>
          </m.div>
        )}
      </div>
    </div>
  );
}
