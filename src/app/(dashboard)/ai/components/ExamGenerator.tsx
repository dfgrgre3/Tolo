
"use client";

import React, { useState, useCallback } from 'react';
import { FileText, Brain, Loader2, CheckCircle, Zap, AlertCircle, Save, X, RefreshCw, BookOpen, Calendar } from 'lucide-react';

import { logger } from '@/lib/logger';
import { safeFetch } from "@/lib/safe-client-utils";
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Question {
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

interface ExamGeneratorProps {
  subjects: string[];
  years: number[];
  className?: string;
}

export default function ExamGenerator({
  subjects,
  years,
  className = ""
}: ExamGeneratorProps) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [lesson, setLesson] = useState('');
  const [difficulty, setDifficulty] = useState('none');
  const [questionCount, setQuestionCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [examData, setExamData] = useState<{examId?: string;questions?: Question[];} | null>(null);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaveError('');
    setSaveSuccess(false);

    // Validation
    if (!selectedSubject || !selectedYear || !lesson) {
      setError('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    if (lesson.trim().length < 3) {
      setError('اسم الدرس يجب أن يكون على الأقل 3 أحرف');
      return;
    }

    if (questionCount < 1 || questionCount > 50) {
      setError('عدد الأسئلة يجب أن يكون بين 1 و 50');
      return;
    }

    // difficulty is optional, no error for 'none' or ''
    if (!difficulty) {
      setError('الرجاء اختيار مستوى الصعوبة');
      return;
    }

    setIsGenerating(true);
    setExamData(null);
    setError('');
    setSaveError('');
    setSaveSuccess(false);

    try {
      const { data, error: responseError } = await safeFetch<{examId?: string;questions?: Question[];}>(
        '/api/ai/exam',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subject: selectedSubject,
            year: selectedYear,
            lesson: lesson.trim(),
            difficulty: difficulty && difficulty !== 'none' ? difficulty : undefined,
            questionCount: Math.min(Math.max(1, questionCount), 50),
            provider: 'gemini'
          })
        },
        null
      );

      if (responseError) {
        const errorMessage = responseError.message || 'فشلت عملية إنشاء الامتحان';
        setError(errorMessage);
        logger.error('Error generating exam:', responseError);

        // إعادة المحاولة التلقائية في حالة أخطاء الشبكة
        if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
          if (retryCount < 2) {
            setTimeout(() => {
              setRetryCount((prev) => prev + 1);
              handleSubmit(e as any);
            }, 2000);
          }
        }
      } else if (data) {
        if (!data.questions || data.questions.length === 0) {
          setError('لم يتم إنشاء أي أسئلة. يرجى المحاولة مرة أخرى.');
        } else {
          setExamData(data);
          setError('');
          setRetryCount(0);
        }
      } else {
        setError('لم يتم إنشاء الامتحان. يرجى المحاولة مرة أخرى.');
      }
    } catch (err) {
      logger.error('Error generating exam:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveExam = useCallback(async () => {
    if (!examData?.questions || examData.questions.length === 0) {
      setSaveError('لا توجد أسئلة لحفظها');
      return;
    }

    if (!selectedSubject || !selectedYear || !lesson) {
      setSaveError('الرجاء التأكد من ملء جميع الحقول المطلوبة');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      // Create exam title
      const examTitle = `امتحان ${selectedSubject} - ${lesson} (${selectedYear})`;

      // First, create the exam record
      const { data: examResult, error: examError } = await safeFetch<{success: boolean;exam: {id: string;};}>(
        '/api/exams',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subject: selectedSubject,
            title: examTitle,
            year: parseInt(selectedYear),
            url: '',
            type: 'QUIZ'
          })
        },
        null
      );

      if (examError || !examResult?.success) {
        throw new Error(examError?.message || 'فشل إنشاء سجل الامتحان');
      }

      setSaveSuccess(true);
      setSaveError('');

      // Reset form after successful save
      setTimeout(() => {
        setExamData(null);
        setSelectedSubject('');
        setSelectedYear('');
        setLesson('');
        setDifficulty('');
        setQuestionCount(10);
        setSaveSuccess(false);
      }, 2000);
    } catch (err) {
      logger.error('Error saving exam:', err);
      setSaveError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الامتحان');
    } finally {
      setIsSaving(false);
    }
  }, [examData, selectedSubject, selectedYear, lesson]);

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <FileText className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">منشئ الامتحانات الذكي</h2>
        <div className="ml-auto flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
          <Zap className="h-3 w-3" />
          <span>Gemini 2.0 Flash</span>
        </div>
      </div>

      {!examData ?
      <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="selectedSubject" className="mb-1">
                المادة <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <BookOpen className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <Select
                value={selectedSubject}
                onValueChange={setSelectedSubject}
                required>
                
                  <SelectTrigger className="pl-10" id="selectedSubject" aria-label="اختر المادة">
                    <SelectValue placeholder="اختر المادة" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) =>
                  <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                  )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="selectedYear" className="mb-1">
                السنة الدراسية <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                  <Calendar className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <Select
                value={selectedYear}
                onValueChange={setSelectedYear}
                required>
                
                  <SelectTrigger className="pl-10" id="selectedYear" aria-label="اختر السنة الدراسية">
                    <SelectValue placeholder="اختر السنة الدراسية" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) =>
                  <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                  )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="lesson" className="mb-1">
                الدرس <span className="text-red-500">*</span>
              </Label>
              <Input
              id="lesson"
              type="text"
              value={lesson}
              onChange={(e) => setLesson(e.target.value)}
              placeholder="أدخل اسم الدرس"
              required
              minLength={3}
              maxLength={200} />
            
            </div>

            <div>
              <Label htmlFor="difficulty" className="mb-1">
                مستوى الصعوبة (اختياري)
              </Label>
              <Select
              value={difficulty}
              onValueChange={setDifficulty}>
              
                <SelectTrigger id="difficulty" aria-label="مستوى الصعوبة">
                  <SelectValue placeholder="اختر مستوى الصعوبة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">اختر مستوى الصعوبة</SelectItem>
                  <SelectItem value="سهل">سهل</SelectItem>
                  <SelectItem value="متوسط">متوسط</SelectItem>
                  <SelectItem value="صعب">صعب</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="questionCount" className="mb-1">
                عدد الأسئلة
              </Label>
              <Input
              id="questionCount"
              type="number"
              min="1"
              max="50"
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 10)))}
              aria-label="عدد الأسئلة في الامتحان" />
            
            </div>
          </div>

          {error &&
        <Alert variant="destructive" className="flex items-start gap-2" role="alert">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <AlertDescription>{error}</AlertDescription>
                {error.includes('network') || error.includes('timeout') ?
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRetryCount(0);
                handleSubmit({ preventDefault: () => {} } as React.FormEvent);
              }}
              className="mt-2">
              
                    <RefreshCw className="h-4 w-4 mr-2" />
                    إعادة المحاولة
                  </Button> :
            null}
              </div>
            </Alert>
        }

          <button
          type="submit"
          disabled={isGenerating}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
          
            {isGenerating ?
          <>
                <Loader2 className="h-5 w-5 animate-spin" />
                جاري إنشاء الامتحان...
              </> :

          <>
                <Brain className="h-5 w-5" />
                إنشاء الامتحان
              </>
          }
          </button>
        </form> :

      <div className="space-y-6">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">تم إنشاء الامتحان بنجاح!</span>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-3">الأسئلة ({examData.questions?.length || 0})</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {examData.questions?.map((question, index) =>
            <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 mb-2">{question.question}</p>

                      {question.type === 'multiple_choice' && question.options &&
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                          {question.options.map((option, i) =>
                    <div
                      key={i}
                      className={`p-2 rounded-lg border ${
                      option === question.correctAnswer ?
                      'border-green-500 bg-green-50' :
                      'border-gray-200'}`
                      }>
                      
                              {option}
                            </div>
                    )}
                        </div>
                  }

                      {question.type === 'true_false' &&
                  <div className="flex gap-4 mb-3">
                          <div
                      className={`p-2 rounded-lg border ${
                      question.correctAnswer === 'صح' ?
                      'border-green-500 bg-green-50' :
                      'border-gray-200'}`
                      }>
                      
                            صح
                          </div>
                          <div
                      className={`p-2 rounded-lg border ${
                      question.correctAnswer === 'خطأ' ?
                      'border-green-500 bg-green-50' :
                      'border-gray-200'}`
                      }>
                      
                            خطأ
                          </div>
                        </div>
                  }

                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm font-medium text-blue-800 mb-1">الإجابة الصحيحة:</p>
                        <p className="text-blue-700">{question.correctAnswer}</p>
                        {question.explanation &&
                    <>
                            <p className="text-sm font-medium text-blue-800 mt-2 mb-1">الشرح:</p>
                            <p className="text-blue-700">{question.explanation}</p>
                          </>
                    }
                      </div>
                    </div>
                  </div>
                </div>
            )}
            </div>
          </div>

          {saveSuccess &&
        <Alert className="bg-green-50 border-green-200 text-green-800 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <AlertDescription>تم حفظ الامتحان بنجاح!</AlertDescription>
            </Alert>
        }

          {saveError &&
        <Alert variant="destructive" className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
        }

          <div className="flex gap-3">
            <Button
            onClick={() => {
              setExamData(null);
              setError('');
              setSaveError('');
              setSaveSuccess(false);
            }}
            variant="outline"
            className="flex-1"
            disabled={isSaving}>
            
              <X className="h-4 w-4 mr-2" />
              إنشاء امتحان جديد
            </Button>
            <Button
            onClick={handleSaveExam}
            className="flex-1"
            disabled={isSaving || !examData?.questions || examData.questions.length === 0}>
            
              {isSaving ?
            <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  جاري الحفظ...
                </> :

            <>
                  <Save className="h-4 w-4 mr-2" />
                  حفظ الامتحان
                </>
            }
            </Button>
          </div>
        </div>
      }
    </div>);

}