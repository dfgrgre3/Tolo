"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Award, PlusCircle } from 'lucide-react';
import { logger } from '@/lib/logger';
import { safeFetch } from "@/lib/safe-client-utils";
import { Exam, ExamResult, UserGrade, SubjectAverage, ExamsResponse } from './_components/types';
import { mergeUniqueById } from './_components/utils';
import { LoadingState } from './_components/LoadingState';
import { ErrorBanner } from './_components/ErrorBanner';
import { ExamResultCard } from './_components/ExamResultCard';
import { GradeCard } from './_components/GradeCard';
import { SubjectAveragesPanel } from './_components/SubjectAveragesPanel';
import { StatisticsPanel } from './_components/StatisticsPanel';
import { AddGradeDialog } from './_components/AddGradeDialog';
import { AddExamResultDialog } from './_components/AddExamResultDialog';

interface ExamGradesProps {
  userId: string;
  subjects: string[];
  teachers?: { id: string; name: string; subject: string }[];
}

export default function ExamGrades({ userId, subjects, teachers = [] }: ExamGradesProps) {
  const [activeTab, setActiveTab] = useState('exams');
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [userGrades, setUserGrades] = useState<UserGrade[]>([]);
  const [subjectAverages, setSubjectAverages] = useState<SubjectAverage[]>([]);
  const [availableExams, setAvailableExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddGradeForm, setShowAddGradeForm] = useState(false);
  const [showAddExamForm, setShowAddExamForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processExamsResponse = useCallback(
    (response: PromiseSettledResult<{ data: { exams: ExamResult[]; grades: UserGrade[] } | null; error: any }>) => {
      if (response.status === 'fulfilled' && !response.value.error) {
        setExamResults(response.value.data?.exams || []);
        setUserGrades(response.value.data?.grades || []);
      } else {
        const errorMsg = response.status === 'rejected' ? response.reason : response.value.error;
        logger.error('Error fetching exam results:', errorMsg);
        setError('فشل تحميل نتائج الامتحانات');
      }
    },
    [],
  );

  const processGradesResponse = useCallback(
    (response: PromiseSettledResult<{ data: { grades: UserGrade[]; averages: SubjectAverage[] } | null; error: any }>) => {
      if (response.status !== 'fulfilled' || response.value.error) {
        const errorMsg = response.status === 'rejected' ? response.reason : response.value.error;
        logger.error('Error fetching grades:', errorMsg);
        setError((prev) => prev || 'فشل تحميل الدرجات');
        return;
      }

      const gradesData = response.value.data;
      if (gradesData?.grades) {
        setUserGrades((prev) => mergeUniqueById(prev, gradesData.grades));
      }

      if (gradesData?.averages) {
        setSubjectAverages(gradesData.averages);
      }
    },
    [],
  );

  const processExamsListResponse = useCallback(
    (response: PromiseSettledResult<{ data: ExamsResponse | null; error: any }>) => {
      if (response.status === 'fulfilled' && !response.value.error) {
        setAvailableExams(Array.isArray(response.value.data?.exams) ? response.value.data.exams : []);
      } else {
        const errorMsg = response.status === 'rejected' ? response.reason : response.value.error;
        logger.warn('Error fetching available exams:', errorMsg);
      }
    },
    [],
  );

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const [examsResponse, gradesResponse, examsListResponse] = await Promise.allSettled([
        safeFetch<{ exams: ExamResult[]; grades: UserGrade[] }>(
          `/api/exams/grades?userId=${userId}`,
          undefined,
          { exams: [], grades: [] },
        ),
        safeFetch<{ grades: UserGrade[]; averages: SubjectAverage[] }>(
          `/api/grades?userId=${userId}`,
          undefined,
          { grades: [], averages: [] },
        ),
        safeFetch<ExamsResponse>('/api/exams', undefined, { exams: [] }),
      ]);

      processExamsResponse(examsResponse);
      processGradesResponse(gradesResponse);
      processExamsListResponse(examsListResponse);
    } catch (err) {
      logger.error('Error fetching data:', err);
      setError('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setIsLoading(false);
    }
  }, [userId, processExamsResponse, processGradesResponse, processExamsListResponse]);

  useEffect(() => {
    fetchData();
  }, [userId, fetchData]);

  const handleDeleteExamResult = useCallback(async (resultId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه النتيجة؟')) return;

    try {
      const { error: deleteError } = await safeFetch(`/api/exams/results/${resultId}`, { method: 'DELETE' }, null);

      if (deleteError) {
        logger.error('Error deleting exam result:', deleteError);
        setError('فشل حذف النتيجة');
      } else {
        setExamResults((prev) => prev.filter((r) => r.id !== resultId));
      }
    } catch (err) {
      logger.error('Error deleting exam result:', err);
      setError('حدث خطأ أثناء حذف النتيجة');
    }
  }, []);

  const statistics = useMemo(() => {
    if (userGrades.length === 0) return null;

    const totalGrades = userGrades.length;
    const averageGrade =
      userGrades.reduce((sum, grade) => sum + (grade.grade / grade.maxGrade) * 100, 0) / totalGrades;
    const maxGrade = Math.max(...userGrades.map((g) => g.grade));
    const minGrade = Math.min(...userGrades.map((g) => g.grade));

    return { totalGrades, averageGrade, maxGrade, minGrade };
  }, [userGrades]);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">الامتحانات والدرجات</h2>
          <p className="text-gray-600">تتبع أدائك الأكاديمي ودرجاتك في المواد المختلفة</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddGradeForm(true)} className="flex items-center gap-2">
            <PlusCircle className="h-4 w-4" />
            إضافة درجة
          </Button>
          <Button onClick={() => setShowAddExamForm(true)} variant="outline" className="flex items-center gap-2">
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
          {examResults.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد امتحانات مسجلة</h3>
                <p className="text-gray-500 mb-4">ابدأ بتسجيل نتائج امتحاناتك لتتبع تقدمك</p>
                <Button onClick={() => setShowAddExamForm(true)}>إضافة نتيجة امتحان</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {examResults.map((exam) => (
                <ExamResultCard key={exam.id} examResult={exam} onDelete={handleDeleteExamResult} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="grades" className="space-y-4">
          {userGrades.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد درجات مسجلة</h3>
                <p className="text-gray-500 mb-4">ابدأ بتسجيل درجاتك لتتبع تقدمك الأكاديمي</p>
                <Button onClick={() => setShowAddGradeForm(true)}>إضافة درجة</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userGrades.map((grade) => (
                <GradeCard key={grade.id} grade={grade} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SubjectAveragesPanel averages={subjectAverages} />
            <StatisticsPanel statistics={statistics} />
          </div>
        </TabsContent>
      </Tabs>

      <AddGradeDialog
        userId={userId}
        subjects={subjects}
        teachers={teachers}
        open={showAddGradeForm}
        onOpenChange={setShowAddGradeForm}
        onSuccess={fetchData}
      />

      <AddExamResultDialog
        userId={userId}
        availableExams={availableExams}
        teachers={teachers}
        open={showAddExamForm}
        onOpenChange={setShowAddExamForm}
        onSuccess={fetchData}
      />

      {error && <ErrorBanner error={error} onClose={() => setError(null)} />}
    </div>
  );
}
