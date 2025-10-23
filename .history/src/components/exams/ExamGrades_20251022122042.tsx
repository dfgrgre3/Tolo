"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from "@/shared/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, BookOpen, User, Award, TrendingUp, PlusCircle, Edit } from 'lucide-react';

interface ExamResult {
  id: string;
  exam: {
    id: string;
    title: string;
    subject: string;
    year: number;
    type: string;
  };
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
  teachers?: { id: string; name: string; subject: string }[];
}

export default function ExamGrades({ userId, subjects, teachers = [] }: ExamGradesProps) {
  const [activeTab, setActiveTab] = useState('exams');
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [userGrades, setUserGrades] = useState<UserGrade[]>([]);
  const [subjectAverages, setSubjectAverages] = useState<SubjectAverage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddGradeForm, setShowAddGradeForm] = useState(false);
  const [showAddExamForm, setShowAddExamForm] = useState(false);

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
    { value: 'OTHER', label: 'أخرى' }
  ];

  // جلب البيانات عند تحميل المكون
  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // جلب نتائج الامتحانات
      const examsResponse = await fetch(`/api/exams/grades?userId=${userId}`);
      if (examsResponse.ok) {
        const examsData = await examsResponse.json();
        setExamResults(examsData.exams || []);
      }

      // جلب الدرجات
      const gradesResponse = await fetch(`/api/grades?userId=${userId}`);
      if (gradesResponse.ok) {
        const gradesData = await gradesResponse.json();
        setUserGrades(gradesData.grades || []);
        setSubjectAverages(gradesData.averages || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          subject: newGrade.subject,
          grade: parseFloat(newGrade.grade),
          maxGrade: parseFloat(newGrade.maxGrade),
          date: newGrade.date,
          notes: newGrade.notes,
          isOnline: newGrade.isOnline,
          assignmentType: newGrade.assignmentType,
          teacherId: newGrade.teacherId || undefined
        }),
      });

      if (response.ok) {
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
        // إعادة جلب البيانات
        fetchData();
      } else {
        console.error('Failed to add grade');
      }
    } catch (error) {
      console.error('Error adding grade:', error);
    }
  };

  const handleAddExamResult = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/exams/grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          examId: newExamResult.examId,
          score: parseFloat(newExamResult.score),
          teacherId: newExamResult.teacherId || undefined,
          isOnline: newExamResult.isOnline,
          notes: newExamResult.notes
        }),
      });

      if (response.ok) {
        // إعادة تعيين النموذج وإخفاء النموذج
        setNewExamResult({
          examId: '',
          score: '',
          teacherId: '',
          notes: '',
          isOnline: false
        });
        setShowAddExamForm(false);
        // إعادة جلب البيانات
        fetchData();
      } else {
        console.error('Failed to add exam result');
      }
    } catch (error) {
      console.error('Error adding exam result:', error);
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

  const getGradeColor = (grade: number, maxGrade: number) => {
    const percentage = (grade / maxGrade) * 100;
    if (percentage >= 90) return 'bg-green-100 text-green-800';
    if (percentage >= 80) return 'bg-blue-100 text-blue-800';
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getAssignmentTypeLabel = (type: string) => {
    const assignmentType = assignmentTypes.find(t => t.value === type);
    return assignmentType ? assignmentType.label : type;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
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
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            إضافة درجة
          </Button>
          <Button 
            onClick={() => setShowAddExamForm(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
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
                <Button onClick={() => setShowAddExamForm(true)}>
                  إضافة نتيجة امتحان
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {examResults.map((exam) => (
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
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {formatDate(exam.takenAt)}
                      </div>
                      {exam.teacher && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          {exam.teacher.name}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Award className="h-4 w-4" />
                        {exam.exam.type === 'MIDTERM' ? 'امتحان نصفي' : 
                         exam.exam.type === 'FINAL' ? 'امتحان نهائي' : 
                         exam.exam.type === 'QUIZ' ? 'اختبار قصير' : 'امتحان'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                <Button onClick={() => setShowAddGradeForm(true)}>
                  إضافة درجة
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userGrades.map((grade) => (
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
                      {grade.isOnline && (
                        <Badge variant="outline">أونلاين</Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        {formatDate(grade.date)}
                      </div>
                      {grade.teacher && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          {grade.teacher.name}
                        </div>
                      )}
                      {grade.notes && (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {grade.notes}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
                {subjectAverages.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">لا توجد بيانات كافية لعرض التحليلات</p>
                ) : (
                  <div className="space-y-4">
                    {subjectAverages.map((average) => (
                      <div key={average.subject} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">{average.subject}</span>
                          <span className="font-bold">{average._avg.grade.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${
                              average._avg.grade >= 90 ? 'bg-green-600' :
                              average._avg.grade >= 80 ? 'bg-blue-600' :
                              average._avg.grade >= 70 ? 'bg-yellow-500' : 'bg-red-600'
                            }`}
                            style={{ width: `${Math.min(100, average._avg.grade)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>إحصائيات عامة</CardTitle>
              </CardHeader>
              <CardContent>
                {userGrades.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">لا توجد بيانات كافية لعرض الإحصائيات</p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm text-blue-800">عدد الدرجات المسجلة</p>
                        <p className="text-2xl font-bold text-blue-600">{userGrades.length}</p>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm text-green-800">متوسط الدرجات العام</p>
                        <p className="text-2xl font-bold text-green-600">
                          {(
                            userGrades.reduce((sum, grade) => sum + (grade.grade / grade.maxGrade) * 100, 0) / 
                            userGrades.length
                          ).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <p className="text-sm text-purple-800">أعلى درجة</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {Math.max(...userGrades.map(g => g.grade))}
                        </p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <p className="text-sm text-yellow-800">أقل درجة</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {Math.min(...userGrades.map(g => g.grade))}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* نموذج إضافة درجة جديدة */}
      {showAddGradeForm && (
        <Card className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>إضافة درجة جديدة</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddGrade} className="space-y-4">
                <div>
                  <Label htmlFor="subject">المادة</Label>
                  <Select 
                    value={newGrade.subject} 
                    onValueChange={(value) => setNewGrade({...newGrade, subject: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المادة" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
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
                      onChange={(e) => setNewGrade({...newGrade, grade: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxGrade">الدرجة العظمى</Label>
                    <Input
                      id="maxGrade"
                      type="number"
                      min="1"
                      value={newGrade.maxGrade}
                      onChange={(e) => setNewGrade({...newGrade, maxGrade: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="date">التاريخ</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newGrade.date}
                    onChange={(e) => setNewGrade({...newGrade, date: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="assignmentType">نوع الواجب</Label>
                  <Select 
                    value={newGrade.assignmentType} 
                    onValueChange={(value) => setNewGrade({...newGrade, assignmentType: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assignmentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="teacher">المدرس (اختياري)</Label>
                  <Select 
                    value={newGrade.teacherId} 
                    onValueChange={(value) => setNewGrade({...newGrade, teacherId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المدرس" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} ({teacher.subject})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                  <Textarea
                    id="notes"
                    value={newGrade.notes}
                    onChange={(e) => setNewGrade({...newGrade, notes: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isOnline"
                    checked={newGrade.isOnline}
                    onChange={(e) => setNewGrade({...newGrade, isOnline: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="isOnline">أونلاين</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddGradeForm(false)}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit">حفظ</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Card>
      )}

      {/* نموذج إضافة نتيجة امتحان جديدة */}
      {showAddExamForm && (
        <Card className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>إضافة نتيجة امتحان جديدة</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddExamResult} className="space-y-4">
                <div>
                  <Label htmlFor="examId">الامتحان</Label>
                  <Select 
                    value={newExamResult.examId} 
                    onValueChange={(value) => setNewExamResult({...newExamResult, examId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الامتحان" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* هنا يجب جلب قائمة الامتحانات المتاحة */}
                      <SelectItem value="exam1">امتحان رياضيات - الفصل الأول</SelectItem>
                      <SelectItem value="exam2">امتحان فيزياء - الفصل الثاني</SelectItem>
                      <SelectItem value="exam3">امتحان كيمياء - الفصل الثالث</SelectItem>
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
                    onChange={(e) => setNewExamResult({...newExamResult, score: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="teacher">المدرس (اختياري)</Label>
                  <Select 
                    value={newExamResult.teacherId} 
                    onValueChange={(value) => setNewExamResult({...newExamResult, teacherId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المدرس" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} ({teacher.subject})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">ملاحظات (اختياري)</Label>
                  <Textarea
                    id="notes"
                    value={newExamResult.notes}
                    onChange={(e) => setNewExamResult({...newExamResult, notes: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isOnline"
                    checked={newExamResult.isOnline}
                    onChange={(e) => setNewExamResult({...newExamResult, isOnline: e.target.checked})}
                    className="rounded"
                  />
                  <Label htmlFor="isOnline">أونلاين</Label>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddExamForm(false)}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit">حفظ</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Card>
      )}
    </div>
  );
}
