
"use client";

import React, { useState } from 'react';
import { Lightbulb, BookOpen, Target, AlertTriangle, CheckCircle, Loader2, RefreshCw, Zap } from 'lucide-react';
import { getGeminiInfo } from '@/lib/ai-config';

interface Tip {
  category: 'استراتيجيات الدراسة' | 'التغلب على التحديات' | 'المصادر التعليمية' | 'الخطة الدراسية' | 'تحسين الأداء';
  title: string;
  content: string;
  priority: 'high' | 'medium' | 'low';
}

interface TipsGeneratorProps {
  subjects?: string[];
  userId?: string;
  className?: string;
}

export default function TipsGenerator({
  subjects = [],
  userId,
  className = ""
}: TipsGeneratorProps) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [studyGoal, setStudyGoal] = useState('');
  const [challenges, setChallenges] = useState('');
  const [currentGrade, setCurrentGrade] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tipsData, setTipsData] = useState<{ tips?: Tip[]; summary?: string } | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError('');
    setTipsData(null);

    try {
      const response = await fetch('/api/ai/tips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          subject: selectedSubject || undefined,
          studyGoal: studyGoal || undefined,
          challenges: challenges || undefined,
          currentGrade: currentGrade || undefined,
          provider: 'gemini' // استخدام Gemini كخيار افتراضي
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشلت عملية إنشاء النصائح');
      }

      const data = await response.json();
      setTipsData(data);
    } catch (err) {
      console.error('Error generating tips:', err);
      setError(err instanceof Error ? err.message : 'حدث خطأ غير معروف');
    } finally {
      setIsGenerating(false);
    }
  };

  const getCategoryIcon = (category: Tip['category']) => {
    switch (category) {
      case 'استراتيجيات الدراسة':
        return <BookOpen className="h-5 w-5" />;
      case 'التغلب على التحديات':
        return <AlertTriangle className="h-5 w-5" />;
      case 'المصادر التعليمية':
        return <BookOpen className="h-5 w-5" />;
      case 'الخطة الدراسية':
        return <Target className="h-5 w-5" />;
      case 'تحسين الأداء':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Lightbulb className="h-5 w-5" />;
    }
  };

  const getCategoryColor = (category: Tip['category']) => {
    switch (category) {
      case 'استراتيجيات الدراسة':
        return 'bg-blue-100 text-blue-800';
      case 'التغلب على التحديات':
        return 'bg-yellow-100 text-yellow-800';
      case 'المصادر التعليمية':
        return 'bg-green-100 text-green-800';
      case 'الخطة الدراسية':
        return 'bg-purple-100 text-purple-800';
      case 'تحسين الأداء':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Tip['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityText = (priority: Tip['priority']) => {
    switch (priority) {
      case 'high':
        return 'عالية';
      case 'medium':
        return 'متوسطة';
      case 'low':
        return 'منخفضة';
      default:
        return '';
    }
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Lightbulb className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">النصائح التعليمية</h2>
        <div className="ml-auto text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
          Gemini 2.0 Flash
        </div>
      </div>

      {!tipsData ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subjects.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  المادة (اختياري)
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">اختر المادة</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المستوى الدراسي (اختياري)
              </label>
              <input
                type="text"
                value={currentGrade}
                onChange={(e) => setCurrentGrade(e.target.value)}
                placeholder="مثال: أول ثانوي، ثالث إعدادي..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الهدف الدراسي (اختياري)
              </label>
              <input
                type="text"
                value={studyGoal}
                onChange={(e) => setStudyGoal(e.target.value)}
                placeholder="مثال: تحسين الدرجات، فهم مفاهيم صعبة..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                التحديات (اختياري)
              </label>
              <input
                type="text"
                value={challenges}
                onChange={(e) => setChallenges(e.target.value)}
                placeholder="مثال: صعوبة الحفظ، قلة التركيز..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isGenerating}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                جاري إنشاء النصائح...
              </>
            ) : (
              <>
                <Lightbulb className="h-5 w-5" />
                احصل على نصائح تعليمية
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-800">نصائح مخصصة لك</h3>
            <button
              onClick={() => {
                setTipsData(null);
                setError('');
              }}
              className="text-blue-500 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              نصائح جديدة
            </button>
          </div>

          {tipsData.summary && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-800 mb-2">ملخص النصائح</h4>
              <p className="text-blue-700">{tipsData.summary}</p>
            </div>
          )}

          <div className="space-y-4">
            {tipsData.tips?.map((tip, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${getCategoryColor(tip.category)}`}>
                      {getCategoryIcon(tip.category)}
                    </div>
                    <h4 className="font-bold text-gray-800">{tip.title}</h4>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(tip.priority)}`}>
                    {getPriorityText(tip.priority)}
                  </span>
                </div>
                <p className="text-gray-600">{tip.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
