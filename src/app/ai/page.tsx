
"use client";

import React, { useState } from 'react';
import { Brain, Bot, MessageSquare, FileText, Search, Lightbulb, BookOpen, Zap } from 'lucide-react';
import AIAssistant from '@/components/ai/AIAssistant';
import ExamGenerator from '@/components/ai/ExamGenerator';
import TeacherSearch from '@/components/ai/TeacherSearch';
import TipsGenerator from '@/components/ai/TipsGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">الذكاء الاصطناعي التعليمي</h1>
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          استخدم أدوات الذكاء الاصطناعي المتقدمة لتعزيز تجربتك التعليمية. احصل على مساعدة شخصية، 
          وامتحانات مخصصة، ونصائح تعليمية، واكتشف أفضل المدرسين لمساعدتك في رحلتك التعليمية.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm bg-green-100 text-green-800 px-3 py-1 rounded-full inline-block">
          <Zap className="h-4 w-4" />
          <span>مدعوم بواسطة Gemini 2.0 Flash</span>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="assistant" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">المساعد الذكي</span>
          </TabsTrigger>
          <TabsTrigger value="exam" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">منشئ الامتحانات</span>
          </TabsTrigger>
          <TabsTrigger value="teachers" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">البحث عن مدرسين</span>
          </TabsTrigger>
          <TabsTrigger value="tips" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            <span className="hidden sm:inline">نصائح تعليمية</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assistant" className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">المساعد الذكي</h2>
              <div className="ml-auto flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                <Zap className="h-3 w-3" />
                <span>Gemini 2.0 Flash</span>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              تحدث مع المساعد الذكي للحصول على إجابات لأسئلتك، شرح للمفاهيم الصعبة، أو مساعدة في واجباتك.
              المساعد متاح على مدار الساعة لمساعدتك في رحلتك التعليمية.
            </p>
            <div className="h-[500px]">
              <AIAssistant 
                initialMessage="مرحباً! أنا مساعدك الذكي في منصة ثناوي. يمكنني مساعدتك في شرح الدروس، حل المسائل، الإجابة على أسئلتك، وغيرها الكثير. كيف يمكنني مساعدتك اليوم؟"
                placeholder="اكتب سؤالك هنا..."
                title="المساعد الذكي التعليمي"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="exam" className="space-y-6">
          <ExamGenerator 
            subjects={subjects}
            years={years}
            className="w-full"
          />
        </TabsContent>

        <TabsContent value="teachers" className="space-y-6">
          <TeacherSearch 
            subjects={subjects}
            className="w-full"
          />
        </TabsContent>

        <TabsContent value="tips" className="space-y-6">
          <TipsGenerator 
            subjects={subjects}
            className="w-full"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
