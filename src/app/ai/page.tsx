
"use client";

import React, { useState } from 'react';
import { AuthGuard } from "@/components/auth/AuthGuard";
import { Brain, Bot, MessageSquare, FileText, Search, Lightbulb, BookOpen, Zap } from 'lucide-react';
import AIAssistant from '@/components/ai/AIAssistant';
import ExamGenerator from '@/components/ai/ExamGenerator';
import TeacherSearch from '@/components/ai/TeacherSearch';
import TipsGenerator from '@/components/ai/TipsGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageContainer } from "@/components/ui/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AILearningPage() {
  const [activeTab, setActiveTab] = useState('assistant');

  // قائمة المواد للامتحانات والبحث عن المدرسين
  const subjects = [
    'الرياضيات',
    'العلوم',
    'اللغة العربية',
    'اللغة الإنجليزية',
    'الدراسات الاجتماعية',
    'الفيزياء',
    'الكيمياء',
    'الأحياء',
    'التربية الإسلامية',
    'الحاسوب'
  ];

  // قائمة السنوات الدراسية
  const years = [1, 2, 3];

  return (
    <AuthGuard>
      <PageContainer size="xl" spacing="lg">
      <div className="mb-8 sm:mb-10 md:mb-12 text-center">
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl sm:rounded-2xl shadow-lg">
            <Brain className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 dark:text-gray-100">
            الذكاء الاصطناعي التعليمي
          </h1>
        </div>
        <p className="text-sm sm:text-base md:text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed px-4">
          استخدم أدوات الذكاء الاصطناعي المتقدمة لتعزيز تجربتك التعليمية. احصل على مساعدة شخصية، 
          وامتحانات مخصصة، ونصائح تعليمية، واكتشف أفضل المدرسين لمساعدتك في رحلتك التعليمية.
        </p>
        <div className="mt-4 sm:mt-6 flex items-center justify-center gap-2 text-xs sm:text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full inline-block">
          <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>مدعوم بواسطة Gemini 2.0 Flash</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6 sm:mb-8 gap-2 sm:gap-3">
          <TabsTrigger value="assistant" className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm">
            <Bot className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden xs:inline sm:inline">المساعد الذكي</span>
          </TabsTrigger>
          <TabsTrigger value="exam" className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden xs:inline sm:inline">منشئ الامتحانات</span>
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm">
            <Search className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden xs:inline sm:inline">البحث عن مدرسين</span>
          </TabsTrigger>
          <TabsTrigger value="tips" className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm">
            <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden xs:inline sm:inline">نصائح تعليمية</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="space-y-4 sm:space-y-6">
          <Card padding="lg" shadow="lg" className="w-full">
            <CardHeader padding="lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 flex-1">
                  <div className="p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg sm:rounded-xl">
                    <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle size="lg">المساعد الذكي</CardTitle>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full">
                  <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  <span>Gemini 2.0 Flash</span>
                </div>
              </div>
            </CardHeader>
            <CardContent padding="lg" className="pt-0">
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 sm:mb-6 leading-relaxed">
                تحدث مع المساعد الذكي للحصول على إجابات لأسئلتك، شرح للمفاهيم الصعبة، أو مساعدة في واجباتك.
                المساعد متاح على مدار الساعة لمساعدتك في رحلتك التعليمية.
              </p>
              <div className="h-[400px] sm:h-[500px] md:h-[600px] rounded-lg overflow-hidden">
                <AIAssistant 
                  initialMessage="مرحباً! أنا مساعدك الذكي في منصة ثناوي. يمكنني مساعدتك في شرح الدروس، حل المسائل، الإجابة على أسئلتك، وغيرها الكثير. كيف يمكنني مساعدتك اليوم؟"
                  placeholder="اكتب سؤالك هنا..."
                  title="المساعد الذكي التعليمي"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exam" className="space-y-4 sm:space-y-6">
          <ExamGenerator 
            subjects={subjects}
            years={years}
            className="w-full"
          />
        </TabsContent>

        <TabsContent value="teachers" className="space-y-4 sm:space-y-6">
          <TeacherSearch 
            subjects={subjects}
            className="w-full"
          />
        </TabsContent>

        <TabsContent value="tips" className="space-y-4 sm:space-y-6">
          <TipsGenerator 
            subjects={subjects}
            className="w-full"
          />
        </TabsContent>
      </Tabs>
      </PageContainer>
    </AuthGuard>
  );
}
