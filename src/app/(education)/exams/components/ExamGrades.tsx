"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, BookOpen, User, Award, TrendingUp, PlusCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { logger } from '@/lib/logger';
import { safeFetch } from "@/lib/safe-client-utils";

interface Exam {
  id: string;
  title: string;
  subject: string;
  year: number;
  type?: string;
}

interface ExamsResponse {
  exams: Exam[];
}

interface ExamResult {
  id: string;
  exam: Exam;
  score: number;
  takenAt: string;
  teacherId?: string;
  teacher?: {
    id: string;
    name: string;
  };
}

interface UserGrade {
  id: string;
  subject: string;
  grade: number;
  maxGrade: number;
  date: string;
  notes?: string;
  isOnline: boolean;
  assignmentType: string;
  teacherId?: string;
  teacher?: {
    id: string;
    name: string;
  };
  examResultId?: string;
}

interface SubjectAverage {
  subject: string;
  _avg: {
    grade: number;
  };
}

interface ExamGradesProps {
  userId: string;
  subjects: string[];
  teachers?: {id: string;name: string;subject: string;}[];
}

export default function ExamGrades({ userId, subjects, teachers = [] }: ExamGradesProps) {
  const [activeTab, setActiveTab] = useState('exams');
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [userGrades, setUserGrades] = useState<UserGrade[]>([]);
  const [subjectAverages, setSubjectAverages] = useState<SubjectAverage[]>([]);
  const [availableExams, setAvailableExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddGradeForm, setShowAddGradeForm] = useState(false);
  const [showAddExamForm, setShowAddExamForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // نموذج إضافة درجة جديدة
  const [newGrade, setNewGrade] = useState({
    subject: '',
    grade: '',
    maxGrade: '100',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    isOnline: false,
    assignmentType: 'OTHER',
    teacherId: ''
  });

  // نموذج إضافة نتيجة امتحان جديدة
  const [newExamResult, setNewExamResult] = useState({
    examId: '',
    score: '',
    teacherId: '',
    notes: '',
    isOnline: false
  });

  // قائمة أنواع الواجبات
  const assignmentTypes = [
  { value: 'EXAM', label: 'امتحان' },
  { value: 'QUIZ', label: 'اختبار قصير' },
  { value: 'HOMEWORK', label: 'واجب منزلي' },
  { value: 'PROJECT', label: 'مشروع' },
  { value: 'PARTICIPATION', label: 'مشاركة' },
  { value: 'OTHER', label: 'أخرى' }];


  // جلب البيانات عند تحميل المكون
  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // جلب نتائج الامتحانات والدرجات في نفس الوقت
      const [examsResponse, gradesResponse, examsListResponse] = await Promise.allSettled([
      safeFetch<{exams: ExamResult[];grades: UserGrade[];}>(
        `/api/exams/grades?userId=${userId}`,
        undefined,
        { exams: [], grades: [] }
      ),
      safeFetch<{grades: UserGrade[];averages: SubjectAverage[];}>(
        `/api/grades?userId=${userId}`,
        undefined,
        { grades: [], averages: [] }
      ),
      safeFetch<ExamsResponse>(
        "/api/exams",
        undefined,
        { exams: [] }
      )]
      );

      // معالجة نتائج الامتحانات
      if (examsResponse.status === 'fulfilled' && !examsResponse.value.error) {
        setExamResults(examsResponse.value.data?.exams || []);
        setUserGrades(examsResponse.value.data?.grades || []);
      } else {
        logger.error('Error fetching exam results:', examsResponse.status === 'rejected' ? examsResponse.reason : examsResponse.value.error);
        setError("فشل تحميل نتائج الامتحانات");
      }

      // معالجة الدرجات والمتوسطات
      if (gradesResponse.status === 'fulfilled' && !gradesResponse.value.error) {
        const gradesData = gradesResponse.value.data;
        if (gradesData?.grades) {
          setUserGrades((prev) => {
            // دمج الدرجات مع تجنب التكرار
            const merged = [...prev];
            gradesData.grades.forEach((grade) => {
              if (!merged.find((g) => g.id === grade.id)) {
                merged.push(grade);
              }
            });
            return merged;
          });
        }
        if (gradesData?.averages) {
          setSubjectAverages(gradesData.averages);
        }
      } else {
        logger.error('Error fetching grades:', gradesResponse.status === 'rejected' ? gradesResponse.reason : gradesResponse.value.error);
        if (!error) setError("فشل تحميل الدرجات");
      }

      // معالجة قائمة الامتحانات المتاحة
      if (examsListResponse.status === 'fulfilled' && !examsListResponse.value.error) {
        setAvailableExams(Array.isArray(examsListResponse.value.data?.exams) ? examsListResponse.value.data.exams : []);
      } else {
        logger.warn('Error fetching available exams:', examsListResponse.status === 'rejected' ? examsListResponse.reason : examsListResponse.value.error);
      }
    } catch (err) {
      logger.error('Error fetching data:', err);
      setError("حدث خطأ أثناء تحميل البيانات");
    } finally {
      setIsLoading(false);
    }
  }, [userId, error]);

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    // Validation
    const gradeNum = parseFloat(newGrade.grade);
    const maxGradeNum = parseFloat(newGrade.maxGrade);

    if (isNaN(gradeNum) || gradeNum < 0) {
      setSubmitError("الرجاء إدخال درجة صحيحة");
      setIsSubmitting(false);
      return;
    }

    if (isNaN(maxGradeNum) || maxGradeNum <= 0) {
      setSubmitError("الرجاء إدخال درجة عظمى صحيحة");
      setIsSubmitting(false);
      return;
    }

    if (gradeNum > maxGradeNum) {
      setSubmitError("الدرجة لا يمكن أن تكون أكبر من الدرجة العظمى");
      setIsSubmitting(false);
      return;
    }

    if (!newGrade.subject) {
      setSubmitError("الرجاء اختيار المادة");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data, error: responseError } = await safeFetch<{success: boolean;}>(
        '/api/grades',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            subject: newGrade.subject,
            grade: gradeNum,
            maxGrade: maxGradeNum,
            date: newGrade.date,
            notes: newGrade.notes,
            isOnline: newGrade.isOnline,
            assignmentType: newGrade.assignmentType,
            teacherId: newGrade.teacherId || undefined
          })
        },
        { success: false }
      );

      if (responseError || !data?.success) {
        const errorMessage = responseError?.message || "فشل إضافة الدرجة";
        setSubmitError(errorMessage);
        logger.error('Failed to add grade:', responseError);
      } else {
        // إعادة تعيين النموذج وإخفاء النموذج
        setNewGrade({
          subject: '',
          grade: '',
          maxGrade: '100',
          date: new Date().toISOString().split('T')[0],
          notes: '',
          isOnline: false,
          assignmentType: 'OTHER',
          teacherId: ''
        });
        setShowAddGradeForm(false);
        setSubmitError(null);
        // إعادة جلب البيانات
        await fetchData();
      }
    } catch (error) {
      logger.error('Error adding grade:', error);
      setSubmitError("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExamResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    // Validation
    const scoreNum = parseFloat(newExamResult.score);

    if (!newExamResult.examId) {
      setSubmitError("الرجاء اختيار الامتحان");
      setIsSubmitting(false);
      return;
    }

    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setSubmitError("الرجاء إدخال درجة صحيحة بين 0 و 100");
      setIsSubmitting(false);
      return;
    }

    try {
      const { data, error: responseError } = await safeFetch<{success: boolean;examResult: ExamResult;}>(
        '/api/exams/grades',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            examId: newExamResult.examId,
            score: scoreNum,
            teacherId: newExamResult.teacherId || undefined,
            isOnline: newExamResult.isOnline,
            notes: newExamResult.notes
          })
        },
        { success: false, examResult: null as any }
      );

      if (responseError || !data?.success) {
        const errorMessage = responseError?.message || "فشل إضافة نتيجة الامتحان";
        setSubmitError(errorMessage);
        logger.error('Failed to add exam result:', responseError);
      } else {
        // إعادة تعيين النموذج وإخفاء النموذج
        setNewExamResult({
          examId: '',
          score: '',
          teacherId: '',
          notes: '',
          isOnline: false
        });
        setShowAddExamForm(false);
        setSubmitError(null);
        // إعادة جلب البيانات
        await fetchData();
      }
    } catch (error) {
      logger.error('Error adding exam result:', error);
      setSubmitError("حدث خطأ غير متوقع");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getGradeColor = useCallback((grade: number, maxGrade: number) => {
    const percentage = grade / maxGrade * 100;
    if (percentage >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (percentage >= 80) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }, []);

  const getAssignmentTypeLabel = useCallback((type: string) => {
    const assignmentType = assignmentTypes.find((t) => t.value === type);
    return assignmentType ? assignmentType.label : type;
  }, []);

  // حساب الإحصائيات
  const statistics = useMemo(() => {
    if (userGrades.length === 0) return null;

    const totalGrades = userGrades.length;
    const averageGrade = userGrades.reduce((sum, grade) => sum + grade.grade / grade.maxGrade * 100, 0) / totalGrades;
    const maxGrade = Math.max(...userGrades.map((g) => g.grade));
    const minGrade = Math.min(...userGrades.map((g) => g.grade));

    return { totalGrades, averageGrade, maxGrade, minGrade };
  }, [userGrades]);

  // دالة حذف نتيجة امتحان
  const handleDeleteExamResult = useCallback(async (resultId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه النتيجة؟')) return;

    try {
      const { error: deleteError } = await safeFetch(
        `/api/exams/results/${resultId}`,
        { method: 'DELETE' },
        null
      );

      if (deleteError) {
        logger.error('Error deleting exam result:', deleteError);
        setError("فشل حذف النتيجة");
      } else {
        setExamResults((prev) => prev.filter((r) => r.id !== resultId));
      }
    } catch (err) {
      logger.error('Error deleting exam result:', err);
      setError("حدث خطأ أثناء حذف النتيجة");
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4" role="status" aria-live="polite">
        <Loader2 className="h-12 w-12 animate-spin text-primary" aria-hidden="true" />
        <p className="text-gray-600 dark:text-gray-400">جاري تحميل البيانات...</p>
      </div>);

  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">الامتحانات والدرجات</h2>
          <p className="text-gray-600">تتبع أدائك الأكاديمي ودرجاتك في المواد المختلفة</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowAddGradeForm(true)}
            className="flex items-center gap-2">
            
            <PlusCircle className="h-4 w-4" />
            إضافة درجة
          </Button>
          <Button
            onClick={() => setShowAddExamForm(true)}
            variant="outline"
            className="flex items-center gap-2">
            
            <PlusCircle className="h-4 w-4" />
            إضافة نتيجة امتحان
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="exams">الامتحانات</TabsTrigger>
          <TabsTrigger value="grades">الدرجات</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
        </TabsList>

        <TabsContent value="exams" className="space-y-4">
          {examResults.length === 0 ?
          <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد امتحانات مسجلة</h3>
                <p className="text-gray-500 mb-4">ابدأ بتسجيل نتائج امتحاناتك لتتبع تقدمك</p>
                <Button onClick={() => setShowAddExamForm(true)}>
                  إضافة نتيجة امتحان
                </Button>
              </CardContent>
            </Card> :

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {examResults.map((exam) =>
            <Card key={exam.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{exam.exam.title}</CardTitle>
                      <Badge className={getGradeColor(exam.score, 100)}>
                        {exam.score}%
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      {exam.exam.subject} - السنة {exam.exam.year}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4" />
                        {formatDate(exam.takenAt)}
                      </div>
                      {exam.teacher &&
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <User className="h-4 w-4" />
                          {exam.teacher.name}
                        </div>
                  }
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Award className="h-4 w-4" />
                        {exam.exam.type === 'MIDTERM' ? 'امتحان نصفي' :
                    exam.exam.type === 'FINAL' ? 'امتحان نهائي' :
                    exam.exam.type === 'QUIZ' ? 'اختبار قصير' : 'امتحان'}
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteExamResult(exam.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      aria-label={`حذف نتيجة ${exam.exam.title}`}>
                      
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
            )}
            </div>
          }
        </TabsContent>

        <TabsContent value="grades" className="space-y-4">
          {userGrades.length === 0 ?
          <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد درجات مسجلة</h3>
                <p className="text-gray-500 mb-4">ابدأ بتسجيل درجاتك لتتبع تقدمك الأكاديمي</p>
                <Button onClick={() => setShowAddGradeForm(true)}>
                  إضافة درجة
                </Button>
              </CardContent>
            </Card> :

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userGrades.map((grade) =>
            <Card key={grade.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{grade.subject}</CardTitle>
                      <Badge className={getGradeColor(grade.grade, grade.maxGrade)}>
                        {grade.grade}/{grade.maxGrade}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      {getAssignmentTypeLabel(grade.assignmentType)}
                      {grade.isOnline &&
                  <Badge variant="outline">أونلاين</Badge>
                  }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {formatDate(grade.date)}
                      </div>
                      {grade.teacher &&
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          {grade.teacher.name}
                        </div>
                  }
                      {grade.notes &&
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {grade.notes}
                        </p>
                  }
                    </div>
                  </CardContent>
                </Card>
            )}
            </div>
          }
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  متوسط الدرجات حسب المادة
                </CardTitle>
              </CardHeader>
              <CardContent>
                {subjectAverages.length === 0 ?
                <p className="text-gray-500 text-center py-4">لا توجد بيانات كافية لعرض التحليلات</p> :

                <div className="space-y-4">
                    {subjectAverages.map((average) => {
                    const gradeValue = Number(average._avg.grade);
                    const widthPercent = Math.min(100, gradeValue);
                    const roundedValue = Math.round(gradeValue);
                    const gradeColor = gradeValue >= 90 ? 'bg-green-600' :
                    gradeValue >= 80 ? 'bg-blue-600' :
                    gradeValue >= 70 ? 'bg-yellow-500' : 'bg-red-600';
                    const ariaLabel = `متوسط ${average.subject}: ${gradeValue.toFixed(1)}%`;
                    const ariaValueNow = roundedValue;
                    const ariaValueMin = 0;
                    const ariaValueMax = 100;

                    return (
                      <div key={average.subject} className="space-y-2">
                          <div className="flex justify-between">
                            <span className="font-medium">{average.subject}</span>
                            <span className="font-bold">{gradeValue.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5" title={ariaLabel}>
                            <div
                            className={`h-2.5 rounded-full transition-all duration-300 ${gradeColor}`}
                            style={{ width: `${widthPercent}%` }}
                            title={`${gradeValue.toFixed(1)}%`}
                            role="progressbar"
                            aria-valuenow={ariaValueNow}
                            aria-valuemin={ariaValueMin}
                            aria-valuemax={ariaValueMax}
                            aria-label={ariaLabel}>
                          </div>
                          </div>
                        </div>);

                  })}
                  </div>
                }
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>إحصائيات عامة</CardTitle>
              </CardHeader>
              <CardContent>
                {!statistics ?
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">لا توجد بيانات كافية لعرض الإحصائيات</p> :

                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">عدد الدرجات المسجلة</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{statistics.totalGrades}</p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                        <p className="text-sm text-green-800 dark:text-green-200">متوسط الدرجات العام</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {statistics.averageGrade.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                        <p className="text-sm text-purple-800 dark:text-purple-200">أعلى درجة</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {statistics.maxGrade}
                        </p>
                      </div>
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">أقل درجة</p>
                        <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                          {statistics.minGrade}
                        </p>
                      </div>
                    </div>
                  </div>
                }
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* نموذج إضافة درجة جديدة */}
      <Dialog open={showAddGradeForm} onOpenChange={setShowAddGradeForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة درجة جديدة</DialogTitle>
            <DialogDescription>
              أدخل معلومات الدرجة الجديدة
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddGrade} className="space-y-4">
                <div>
                  <Label htmlFor="subject">المادة</Label>
                  <Select
                value={newGrade.subject}
                onValueChange={(value) => setNewGrade({ ...newGrade, subject: value })}>
                
                    <SelectTrigger>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="grade">الدرجة</Label>
                    <Input
                  id="grade"
                  type="number"
                  min="0"
                  value={newGrade.grade}
                  onChange={(e) => setNewGrade({ ...newGrade, grade: e.target.value })}
                  required />
                
                  </div>
                  <div>
                    <Label htmlFor="maxGrade">الدرجة العظمى</Label>
                    <Input
                  id="maxGrade"
                  type="number"
                  min="1"
                  value={newGrade.maxGrade}
                  onChange={(e) => setNewGrade({ ...newGrade, maxGrade: e.target.value })}
                  required />
                
                  </div>
                </div>

                <div>
                  <Label htmlFor="date">التاريخ</Label>
                  <Input
                id="date"
                type="date"
                value={newGrade.date}
                onChange={(e) => setNewGrade({ ...newGrade, date: e.target.value })}
                required />
              
                </div>

                <div>
                  <Label htmlFor="assignmentType">نوع الواجب</Label>
                  <Select
                value={newGrade.assignmentType}
                onValueChange={(value) => setNewGrade({ ...newGrade, assignmentType: value })}>
                
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assignmentTypes.map((type) =>
                  <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                  )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="teacher">المدرس (اختياري)</Label>
                  <Select
                value={newGrade.teacherId}
                onValueChange={(value) => setNewGrade({ ...newGrade, teacherId: value })}>
                
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المدرس" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) =>
                  <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} ({teacher.subject})
                        </SelectItem>
                  )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                  <Textarea
                id="notes"
                value={newGrade.notes}
                onChange={(e) => setNewGrade({ ...newGrade, notes: e.target.value })}
                rows={3} />
              
                </div>

                <div className="flex items-center space-x-2">
                  <input
                type="checkbox"
                id="gradeIsOnline"
                checked={newGrade.isOnline}
                onChange={(e) => setNewGrade({ ...newGrade, isOnline: e.target.checked })}
                className="rounded"
                aria-label="امتحان أونلاين" />
              
                  <Label htmlFor="gradeIsOnline">أونلاين</Label>
                </div>

            {submitError &&
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{submitError}</p>
              </div>
            }
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddGradeForm(false);
                  setSubmitError(null);
                }}
                disabled={isSubmitting}>
                
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ?
                <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    جاري الحفظ...
                  </> :

                "حفظ"
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* نموذج إضافة نتيجة امتحان جديدة */}
      <Dialog open={showAddExamForm} onOpenChange={setShowAddExamForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة نتيجة امتحان جديدة</DialogTitle>
            <DialogDescription>
              اختر الامتحان وأدخل النتيجة
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddExamResult} className="space-y-4">
            <div>
              <Label htmlFor="examId">الامتحان <span className="text-red-500">*</span></Label>
              <Select
                value={newExamResult.examId}
                onValueChange={(value) => setNewExamResult({ ...newExamResult, examId: value })}
                required>
                
                <SelectTrigger>
                  <SelectValue placeholder="اختر الامتحان" />
                </SelectTrigger>
                <SelectContent>
                  {availableExams.length === 0 ?
                  <SelectItem value="no-exams" disabled>لا توجد امتحانات متاحة</SelectItem> :

                  availableExams.map((exam) =>
                  <SelectItem key={exam.id} value={exam.id}>
                        {exam.title} - {exam.subject} ({exam.year})
                      </SelectItem>
                  )
                  }
                </SelectContent>
              </Select>
            </div>

                <div>
                  <Label htmlFor="score">الدرجة</Label>
                  <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={newExamResult.score}
                onChange={(e) => setNewExamResult({ ...newExamResult, score: e.target.value })}
                required />
              
                </div>

                <div>
                  <Label htmlFor="teacher">المدرس (اختياري)</Label>
                  <Select
                value={newExamResult.teacherId}
                onValueChange={(value) => setNewExamResult({ ...newExamResult, teacherId: value })}>
                
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المدرس" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) =>
                  <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} ({teacher.subject})
                        </SelectItem>
                  )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                  <Textarea
                id="notes"
                value={newExamResult.notes}
                onChange={(e) => setNewExamResult({ ...newExamResult, notes: e.target.value })}
                rows={3} />
              
                </div>

                <div className="flex items-center space-x-2">
                  <input
                type="checkbox"
                id="examResultIsOnline"
                checked={newExamResult.isOnline}
                onChange={(e) => setNewExamResult({ ...newExamResult, isOnline: e.target.checked })}
                className="rounded"
                aria-label="نتيجة امتحان أونلاين" />
              
                  <Label htmlFor="examResultIsOnline">أونلاين</Label>
                </div>

            {submitError &&
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <p className="text-sm">{submitError}</p>
              </div>
            }
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddExamForm(false);
                  setSubmitError(null);
                }}
                disabled={isSubmitting}>
                
                إلغاء
              </Button>
              <Button type="submit" disabled={isSubmitting || availableExams.length === 0}>
                {isSubmitting ?
                <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    جاري الحفظ...
                  </> :

                "حفظ"
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {error &&
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-center gap-2 text-yellow-800 dark:text-yellow-200" role="alert">
          <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <p>{error}</p>
          <Button
          variant="ghost"
          size="sm"
          onClick={() => setError(null)}
          className="mr-auto text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
          aria-label="إغلاق رسالة الخطأ">
          
            ✕
          </Button>
        </div>
      }
    </div>);

}