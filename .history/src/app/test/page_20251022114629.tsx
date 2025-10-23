'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/shared/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/shared/card";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from "@/shared/progress";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from "@/shared/badge";
import { AlertCircle, CheckCircle, Clock, BookOpen, Brain, Lightbulb, Award } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  options?: string[];
  correctAnswer?: string | string[];
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

interface Test {
  id: string;
  title: string;
  subject: string;
  questions: Question[];
  timeLimit?: number; // in minutes
  createdAt: Date;
}

interface Answer {
  questionId: string;
  value: string | string[];
}

interface TestResult {
  testId: string;
  answers: Answer[];
  score: number;
  totalPoints: number;
  timeSpent: number; // in seconds
  completedAt: Date;
  feedback: {
    correctAnswers: number;
    incorrectAnswers: number;
    strengths: string[];
    improvementAreas: string[];
    recommendations: string[];
  };
}

const subjects = [
  { value: 'math', label: 'الرياضيات' },
  { value: 'science', label: 'العلوم' },
  { value: 'history', label: 'التاريخ' },
  { value: 'arabic', label: 'اللغة العربية' },
  { value: 'english', label: 'اللغة الإنجليزية' },
  { value: 'physics', label: 'الفيزياء' },
  { value: 'chemistry', label: 'الكيمياء' },
  { value: 'biology', label: 'الأحياء' },
  { value: 'computer', label: 'علوم الحاسب' },
];

const difficultyLevels = [
  { value: 'easy', label: 'سهل' },
  { value: 'medium', label: 'متوسط' },
  { value: 'hard', label: 'صعب' },
  { value: 'mixed', label: 'مختلط' },
];

const questionTypes = [
  { value: 'multiple-choice', label: 'اختيار من متعدد' },
  { value: 'true-false', label: 'صح/خطأ' },
  { value: 'short-answer', label: 'إجابة قصيرة' },
  { value: 'essay', label: 'مقال' },
];

export default function TestPage() {
  const [testConfig, setTestConfig] = useState({
    subject: '',
    difficulty: 'mixed' as 'easy' | 'medium' | 'hard' | 'mixed',
    questionCount: 10,
    questionTypes: ['multiple-choice'] as string[],
    timeLimit: 30,
  });

  const [test, setTest] = useState<Test | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [testState, setTestState] = useState<'config' | 'loading' | 'in-progress' | 'completed'>('config');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  // Handle timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (testState === 'in-progress' && timeRemaining > 0) {
      timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
    } else if (testState === 'in-progress' && timeRemaining === 0) {
      handleSubmitTest();
    }
    return () => clearTimeout(timer);
  }, [testState, timeRemaining]);

  const handleGenerateTest = async () => {
    setIsGenerating(true);
    setTestState('loading');
    setGenerationProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      // API call to generate test with AI
      const response = await fetch('/api/generate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testConfig),
      });

      if (!response.ok) {
        throw new Error('Failed to generate test');
      }

      const data = await response.json();
      const newTest = data.test as Test;

      setTest(newTest);
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setTimeRemaining(newTest.timeLimit! * 60);
      setTestState('in-progress');
      setGenerationProgress(100);
    } catch (error) {
      console.error('Error generating test:', error);
      alert('حدث خطأ أثناء إنشاء الاختبار. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsGenerating(false);
      clearInterval(progressInterval);
    }
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => {
      const existingAnswerIndex = prev.findIndex(a => a.questionId === questionId);
      if (existingAnswerIndex !== -1) {
        const newAnswers = [...prev];
        newAnswers[existingAnswerIndex] = { questionId, value };
        return newAnswers;
      } else {
        return [...prev, { questionId, value }];
      }
    });
  };

  const handleNextQuestion = () => {
    if (test && currentQuestionIndex < test.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitTest = async () => {
    if (!test) return;

    // Simulate progress
    setIsGenerating(true);
    setTestState('loading');
    setGenerationProgress(0);

    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 20;
      });
    }, 500);

    try {
      // API call to evaluate test with AI
      const response = await fetch('/api/evaluate-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testId: test.id,
          answers,
          questions: test.questions,
          timeSpent: test.timeLimit! * 60 - timeRemaining
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to evaluate test');
      }

      const data = await response.json();
      const result = data.result as TestResult;

      setTestResult(result);
      setTestState('completed');
      setGenerationProgress(100);
    } catch (error) {
      console.error('Error evaluating test:', error);
      alert('حدث خطأ أثناء تقييم الاختبار. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsGenerating(false);
      clearInterval(progressInterval);
    }
  };

  const handleRestartTest = () => {
    setTestState('config');
    setTest(null);
    setTestResult(null);
    setAnswers([]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number, total: number) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (testState === 'config') {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
            <Brain className="h-8 w-8 text-blue-600" />
            الاختبار الذاتي الذكي
          </h1>
          <p className="text-gray-600">
            قم بإنشاء اختبار مخصص باستخدام الذكاء الاصطناعي واختبر معرفتك في المادة التي تختارها
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              إعدادات الاختبار
            </CardTitle>
            <CardDescription>
              قم بتحديد إعدادات الاختبار الذي تريد إنشاءه
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject">المادة الدراسية</Label>
              <Select value={testConfig.subject} onValueChange={(value) => setTestConfig({...testConfig, subject: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المادة الدراسية" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.value} value={subject.value}>{subject.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty">مستوى الصعوبة</Label>
              <Select value={testConfig.difficulty} onValueChange={(value) => setTestConfig({...testConfig, difficulty: value as any})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficultyLevels.map(level => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="questionCount">عدد الأسئلة: {testConfig.questionCount}</Label>
              <Input 
                id="questionCount"
                type="range" 
                min="5" 
                max="30" 
                value={testConfig.questionCount} 
                onChange={(e) => setTestConfig({...testConfig, questionCount: parseInt(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label>أنواع الأسئلة</Label>
              <div className="grid grid-cols-2 gap-2">
                {questionTypes.map(type => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox 
                      id={type.value}
                      checked={testConfig.questionTypes.includes(type.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setTestConfig({
                            ...testConfig, 
                            questionTypes: [...testConfig.questionTypes, type.value]
                          });
                        } else {
                          setTestConfig({
                            ...testConfig, 
                            questionTypes: testConfig.questionTypes.filter(t => t !== type.value)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={type.value}>{type.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeLimit">المدة الزمنية (بالدقائق): {testConfig.timeLimit}</Label>
              <Input 
                id="timeLimit"
                type="range" 
                min="10" 
                max="120" 
                step="5"
                value={testConfig.timeLimit} 
                onChange={(e) => setTestConfig({...testConfig, timeLimit: parseInt(e.target.value)})}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleGenerateTest} 
              className="w-full" 
              disabled={!testConfig.subject || isGenerating}
            >
              {isGenerating ? 'جاري إنشاء الاختبار...' : 'إنشاء الاختبار'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (testState === 'loading') {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              {test ? 'جاري تقييم إجاباتك...' : 'جاري إنشاء الاختبار...'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={generationProgress} className="w-full" />
            <p className="text-center text-gray-600">
              {test ? 'يقوم الذكاء الاصطناعي بتحليل إجاباتك وتقديم تقييم دقيق...' : 'يقوم الذكاء الاصطناعي بإنشاء اختبار مخصص لك...'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (testState === 'in-progress' && test) {
    const currentQuestion = test.questions[currentQuestionIndex];
    const currentAnswer = answers.find(a => a.questionId === currentQuestion.id)?.value || '';
    const progress = ((currentQuestionIndex + 1) / test.questions.length) * 100;

    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{test.title}</h1>
            <p className="text-gray-600">السؤال {currentQuestionIndex + 1} من {test.questions.length}</p>
          </div>
          <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="font-medium">{formatTime(timeRemaining)}</span>
          </div>
        </div>

        <Progress value={progress} className="mb-8" />

        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">{currentQuestion.text}</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge variant={
                    currentQuestion.difficulty === 'easy' ? 'default' : 
                    currentQuestion.difficulty === 'medium' ? 'secondary' : 'destructive'
                  }>
                    {currentQuestion.difficulty === 'easy' ? 'سهل' : 
                     currentQuestion.difficulty === 'medium' ? 'متوسط' : 'صعب'}
                  </Badge>
                  <Badge variant="outline">{currentQuestion.points} نقطة</Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
              <RadioGroup 
                value={currentAnswer as string} 
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`}>{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion.type === 'true-false' && (
              <RadioGroup 
                value={currentAnswer as string} 
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="true" />
                  <Label htmlFor="true">صحيح</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="false" />
                  <Label htmlFor="false">خطأ</Label>
                </div>
              </RadioGroup>
            )}

            {currentQuestion.type === 'short-answer' && (
              <Textarea 
                value={currentAnswer as string}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="اكتب إجابتك هنا..."
                rows={3}
              />
            )}

            {currentQuestion.type === 'essay' && (
              <Textarea 
                value={currentAnswer as string}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                placeholder="اكتب مقالك هنا..."
                rows={6}
              />
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={handlePrevQuestion}
              disabled={currentQuestionIndex === 0}
            >
              السؤال السابق
            </Button>
            <div className="flex gap-2">
              {currentQuestionIndex === test.questions.length - 1 ? (
                <Button onClick={handleSubmitTest}>
                  إنهاء الاختبار
                </Button>
              ) : (
                <Button onClick={handleNextQuestion}>
                  السؤال التالي
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>تمت الإجابة: {answers.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span>متبقي: {test.questions.length - answers.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-500" />
                <span>الدرجة الكلية: {test.questions.reduce((sum, q) => sum + q.points, 0)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (testState === 'completed' && testResult && test) {
    const percentage = Math.round((testResult.score / testResult.totalPoints) * 100);

    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-4 flex items-center justify-center gap-2">
            <Award className="h-8 w-8 text-yellow-500" />
            نتائج الاختبار
          </h1>
          <p className="text-gray-600">
            لقد أكملت الاختبار بنجاح! إليك تقييم أدائك
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>النتيجة الإجمالية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className={`text-5xl font-bold ${getScoreColor(testResult.score, testResult.totalPoints)}`}>
                {percentage}%
              </div>
              <div className="text-xl">
                {testResult.score} من {testResult.totalPoints} نقطة
              </div>
              <div className="text-gray-600">
                وقت الاختبار: {formatTime(testResult.timeSpent)}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                الإجابات الصحيحة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 text-center">
                {testResult.feedback.correctAnswers}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                الإجابات الخاطئة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 text-center">
                {testResult.feedback.incorrectAnswers}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                نقاط القوة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {testResult.feedback.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                مجالات التحسين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {testResult.feedback.improvementAreas.map((area, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-500" />
              توصيات للدراسة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {testResult.feedback.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
                  <span className="font-bold text-purple-700">{index + 1}.</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button onClick={handleRestartTest} size="lg">
            إنشاء اختبار جديد
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
