
"use client";

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { BookOpen, Lightbulb, Target, AlertTriangle, CheckCircle, Loader2, RefreshCw, Zap } from 'lucide-react';

import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [tipsData, setTipsData] = useState<{tips?: Tip[];summary?: string;} | null>(null);
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          subject: selectedSubject || undefined,
          studyGoal: studyGoal || undefined,
          challenges: challenges || undefined,
          currentGrade: currentGrade || undefined,
          provider: 'gemini'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'فشلت عملية إنشاء النصائح');
      }

      const data = await response.json();
      setTipsData(data);
    } catch (err) {
      logger.error('Error generating tips:', err);
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

  const getCategoryStyle = (category: Tip['category']) => {
    switch (category) {
      case 'استراتيجيات الدراسة':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'التغلب على التحديات':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'المصادر التعليمية':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'الخطة الدراسية':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'تحسين الأداء':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityStyle = (priority: Tip['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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
    <div className={`bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden ${className}`}>
      <div className="p-8 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/30 blur-lg rounded-full" />
            <div className="relative p-3 bg-amber-500/20 rounded-xl border border-amber-500/30">
              <Lightbulb className="h-6 w-6 text-amber-400" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">النصائح التعليمية</h2>
            <p className="text-gray-400 text-sm mt-1">نصائح مخصصة لتحسين أدائك الدراسي</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/30">
          <Zap className="h-3 w-3" />
          <span>Gemini 2.0 Flash</span>
        </div>
      </div>

      <div className="p-8">
        {!tipsData ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {subjects.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                    المادة
                  </label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-14 text-white focus:ring-amber-500/50">
                      <SelectValue placeholder="اختر المادة" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/10 text-white">
                      <SelectItem value="">اختر المادة</SelectItem>
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  المستوى الدراسي
                </label>
                <Input
                  type="text"
                  value={currentGrade}
                  onChange={(e) => setCurrentGrade(e.target.value)}
                  placeholder="مثال: أول ثانوي، ثالث إعدادي..."
                  className="bg-white/5 border-white/10 rounded-2xl h-14 text-white focus:ring-amber-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  الهدف الدراسي
                </label>
                <Input
                  type="text"
                  value={studyGoal}
                  onChange={(e) => setStudyGoal(e.target.value)}
                  placeholder="مثال: تحسين الدرجات، فهم مفاهيم صعبة..."
                  className="bg-white/5 border-white/10 rounded-2xl h-14 text-white focus:ring-amber-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  التحديات
                </label>
                <Input
                  type="text"
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  placeholder="مثال: صعوبة الحفظ، قلة التركيز..."
                  className="bg-white/5 border-white/10 rounded-2xl h-14 text-white focus:ring-amber-500/50"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isGenerating}
              className="w-full md:w-auto px-12 h-14 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-2xl shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  جاري إنشاء النصائح...
                </>
              ) : (
                <>
                  <Lightbulb className="h-5 w-5 mr-3" />
                  احصل على نصائح تعليمية
                </>
              )}
            </Button>
          </form>
        ) : (
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">نصائح مخصصة لك</h3>
              <Button
                onClick={() => {
                  setTipsData(null);
                  setError('');
                }}
                variant="outline"
                className="h-10 rounded-xl border-white/10 text-gray-400 hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                نصائح جديدة
              </Button>
            </div>

            {tipsData.summary && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
                <h4 className="font-bold text-blue-400 mb-2">ملخص النصائح</h4>
                <p className="text-blue-300">{tipsData.summary}</p>
              </div>
            )}

            <div className="space-y-4">
              {tipsData.tips?.map((tip, index) => (
                <div
                  key={index}
                  className="border border-white/10 rounded-xl p-5 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl border ${getCategoryStyle(tip.category)}`}>
                        {getCategoryIcon(tip.category)}
                      </div>
                      <h4 className="font-bold text-white text-lg">{tip.title}</h4>
                    </div>
                    <span className={`text-xs px-3 py-1.5 rounded-full border font-bold ${getPriorityStyle(tip.priority)}`}>
                      {getPriorityText(tip.priority)}
                    </span>
                  </div>
                  <p className="text-gray-300 leading-relaxed">{tip.content}</p>
                </div>
              ))}
            </div>
          </m.div>
        )}
      </div>
    </div>
  );
}
