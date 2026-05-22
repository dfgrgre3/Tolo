
"use client";

import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Search, User, Star, BookOpen, Zap, ExternalLink, Loader2, Youtube } from 'lucide-react';

import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Teacher {
  name: string;
  subject: string;
  url?: string;
  description?: string;
  rating?: number;
  thumbnail?: string;
}

interface TeacherSearchProps {
  subjects: string[];
  platforms?: string[];
  className?: string;
}

async function resolveErrorMessage(response: Response): Promise<string> {
  try {
    const errorData = await response.json();
    if (errorData?.error) return errorData.error;
  } catch (e) {
    logger.error('Error parsing error response:', e);
    if (response.status === 401) return 'مشكلة في المصادقة. يرجى تسجيل الدخول والمحاولة مرة أخرى.';
    if (response.status === 403) return 'مفتاح API لـ Google Gemini غير مهيأ. يرجى التواصل مع فريق الدعم.';
    if (response.status === 500) return 'مشكلة في الخادم. يرجى المحاولة مرة أخرى لاحقاً.';
    if (response.status === 429) return 'تم تجاوز حد الطلبات. يرجى المحاولة مرة أخرى بعد قليل.';
  }
  return 'فشلت عملية البحث عن المدرسين';
}

function validateAndFormatTeachers(data: any) {
  if (!data || typeof data !== 'object') {
    throw new Error('بيانات غير صالحة من الخادم');
  }

  return {
    localTeachers: Array.isArray(data.localTeachers) ? data.localTeachers : [],
    aiTeachers: Array.isArray(data.aiTeachers) ? data.aiTeachers : [],
    youtubeResults: Array.isArray(data.youtubeResults) ? data.youtubeResults : [],
  };
}

function handleSearchError(err: unknown): string {
  logger.error('Error searching teachers:', err);
  let errorMessage = 'حدث خطأ غير معروف';

  if (err instanceof Error) {
    errorMessage = err.message;
    if (errorMessage.includes('API key') || errorMessage.includes('مفتاح API')) {
      return 'مفتاح API لـ Google Gemini غير مهيأ. يرجى التواصل مع فريق الدعم لحل هذه المشكلة.';
    }
    if (errorMessage.includes('fetch')) {
      return 'فشل الاتصال بخدمة الذكاء الاصطناعي. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.';
    }
  }

  return errorMessage;
}

export default function TeacherSearch({
  subjects,
  platforms = ['يوتيوب', 'منصة دروس', 'منصة مدرستي', 'أخرى'],
  className = ""
}: TeacherSearchProps) {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [keywords, setKeywords] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [teachers, setTeachers] = useState<{
    localTeachers: Teacher[];
    aiTeachers: Teacher[];
    youtubeResults: Teacher[];
  } | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) {
      setError('الرجاء اختيار المادة');
      return;
    }

    setIsSearching(true);
    setError('');
    setTeachers(null);

    try {
      const response = await fetch('/api/ai/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: selectedSubject,
          keywords: keywords || undefined,
          platform: selectedPlatform || undefined,
          provider: 'gemini'
        })
      });

      if (!response.ok) {
        setError(await resolveErrorMessage(response));
        return;
      }

      const rawData = await response.json().catch(err => {
        logger.error('Error parsing response data:', err);
        throw new Error('حدث خطأ في تحليل بيانات الاستجابة. يرجى المحاولة مرة أخرى.');
      });

      setTeachers(validateAndFormatTeachers(rawData));
    } catch (err) {
      setError(handleSearchError(err));
    } finally {
      setIsSearching(false);
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;

    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'
            }`}
          />
        ))}
        <span className="text-sm text-gray-400 mr-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const renderTeacherCard = (teacher: Teacher, source: string) => (
    <div
      key={`${teacher.name}-${source}`}
      className="border border-white/10 rounded-xl p-5 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all"
    >
      <div className="flex items-start gap-4">
        {teacher.thumbnail ? (
          <img
            src={teacher.thumbnail}
            alt={teacher.name}
            className="w-16 h-16 rounded-xl object-cover border border-white/10"
          />
        ) : (
          <div className="w-16 h-16 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <User className="h-8 w-8 text-blue-400" />
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-white text-lg">{teacher.name}</h3>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30">
                  <BookOpen className="h-3 w-3" />
                  {teacher.subject}
                </span>
                {source === 'youtube' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30">
                    <Youtube className="h-3 w-3" />
                    يوتيوب
                  </span>
                )}
                {source === 'ai' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/30">
                    <Zap className="h-3 w-3" />
                    AI
                  </span>
                )}
              </div>
            </div>

            {teacher.url && (
              <a
                href={teacher.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 p-2 hover:bg-blue-500/20 rounded-lg transition-all"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            )}
          </div>

          {teacher.description && (
            <p className="text-gray-400 text-sm mt-3 line-clamp-2">{teacher.description}</p>
          )}

          <div className="mt-3">
            {renderStars(teacher.rating)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden ${className}`}>
      <div className="p-8 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/30 blur-lg rounded-full" />
            <div className="relative p-3 bg-purple-500/20 rounded-xl border border-purple-500/30">
              <Search className="h-6 w-6 text-purple-400" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">البحث عن مدرسين</h2>
            <p className="text-gray-400 text-sm mt-1">اعثر على أفضل المعلمين وقنوات يوتيوب</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/30">
          <Zap className="h-3 w-3" />
          <span>Gemini 2.0 Flash</span>
        </div>
      </div>

      <div className="p-8">
        {!teachers ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  المادة <span className="text-red-400">*</span>
                </label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-14 text-white focus:ring-purple-500/50">
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

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  كلمات مفتاحية
                </label>
                <Input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="مثال: ثانوي، إعدادي..."
                  className="bg-white/5 border-white/10 rounded-2xl h-14 text-white focus:ring-purple-500/50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  المنصة
                </label>
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-14 text-white focus:ring-purple-500/50">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/10 text-white">
                    <SelectItem value="">الكل</SelectItem>
                    {platforms.map((platform) => (
                      <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSearching}
              className="w-full md:w-auto px-12 h-14 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-2xl shadow-xl shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSearching ? (
                <>
                  <Loader2 className="h-5 w-5 mr-3 animate-spin" />
                  جاري البحث...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 mr-3" />
                  بحث عن مدرسين
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
              <h3 className="font-bold text-white text-lg">نتائج البحث</h3>
              <Button
                onClick={() => {
                  setTeachers(null);
                  setError('');
                }}
                variant="outline"
                className="h-10 rounded-xl border-white/10 text-gray-400 hover:bg-white/10"
              >
                بحث جديد
              </Button>
            </div>

            {teachers.localTeachers.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">المدرسين المحفوظين ({teachers.localTeachers.length})</h4>
                <div className="space-y-3">
                  {teachers.localTeachers.map((teacher) => renderTeacherCard(teacher, 'local'))}
                </div>
              </div>
            )}

            {teachers.aiTeachers.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">مدرسين موصى بهم ({teachers.aiTeachers.length})</h4>
                <div className="space-y-3">
                  {teachers.aiTeachers.map((teacher) => renderTeacherCard(teacher, 'ai'))}
                </div>
              </div>
            )}

            {teachers.youtubeResults.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">قنوات يوتيوب ({teachers.youtubeResults.length})</h4>
                <div className="space-y-3">
                  {teachers.youtubeResults.map((teacher) => renderTeacherCard(teacher, 'youtube'))}
                </div>
              </div>
            )}

            {teachers.localTeachers.length === 0 &&
              teachers.aiTeachers.length === 0 &&
              teachers.youtubeResults.length === 0 && (
                <div className="text-center py-12">
                  <User className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-500">لم يتم العثور على أي مدرسين. يرجى المحاولة مرة أخرى بكلمات مفتاحية مختلفة.</p>
                </div>
              )}
          </m.div>
        )}
      </div>
    </div>
  );
}
