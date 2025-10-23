
"use client";

import React, { useState } from 'react';
import { Search, User, Star, ExternalLink, Youtube, Loader2, BookOpen, Zap } from 'lucide-react';
import { getGeminiInfo } from '@/lib/ai-config';

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: selectedSubject,
          keywords: keywords || undefined,
          platform: selectedPlatform || undefined,
          provider: 'gemini' // استخدام Gemini كخيار افتراضي
        }),
      });

      if (!response.ok) {
        let errorMessage = 'فشلت عملية البحث عن المدرسين';
        
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
          // إذا فشل تحليل استجابة الخطأ، استخدم رسالة عامة بناءً على رمز الحالة
          if (response.status === 401) {
            errorMessage = 'مشكلة في المصادقة. يرجى تسجيل الدخول والمحاولة مرة أخرى.';
          } else if (response.status === 403) {
            errorMessage = 'مفتاح API لـ Google Gemini غير مهيأ. يرجى التواصل مع فريق الدعم.';
          } else if (response.status === 500) {
            errorMessage = 'مشكلة في الخادم. يرجى المحاولة مرة أخرى لاحقاً.';
          } else if (response.status === 429) {
            errorMessage = 'تم تجاوز حد الطلبات. يرجى المحاولة مرة أخرى بعد قليل.';
          }
        }
        
        // لا ترمي الخطأ هنا، بل قم بتعيينه مباشرة
        setError(errorMessage);
        setIsSearching(false);
        return;
      }

      let data;
      try {
        data = await response.json();
        
        // التحقق من أن البيانات تحتوي على الحقول المطلوبة
        if (!data || (typeof data !== 'object')) {
          throw new Error('بيانات غير صالحة من الخادم');
        }
        
        // التأكد من وجود الحقول الأساسية
        if (!data.localTeachers || !data.aiTeachers || !data.youtubeResults) {
          // إذا كانت هناك حقول مفقودة، قم بإنشائها
          data.localTeachers = data.localTeachers || [];
          data.aiTeachers = data.aiTeachers || [];
          data.youtubeResults = data.youtubeResults || [];
        }
        
        setTeachers(data);
      } catch (parseError) {
        console.error('Error parsing response data:', parseError);
        setError('حدث خطأ في تحليل بيانات الاستجابة. يرجى المحاولة مرة أخرى.');
        setIsSearching(false);
        return;
      }
    } catch (err) {
      console.error('Error searching teachers:', err);
      let errorMessage = 'حدث خطأ غير معروف';
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // تحسين رسائل الخطأ الشائعة
        if (errorMessage.includes('API key') || errorMessage.includes('مفتاح API')) {
          errorMessage = 'مفتاح API لـ Google Gemini غير مهيأ. يرجى التواصل مع فريق الدعم لحل هذه المشكلة.';
        } else if (errorMessage.includes('fetch')) {
          errorMessage = 'فشل الاتصال بخدمة الذكاء الاصطناعي. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.';
        }
      }
      
      setError(errorMessage);
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
              i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const renderTeacherCard = (teacher: Teacher, source: string) => (
    <div key={`${teacher.name}-${source}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {teacher.thumbnail ? (
          <img
            src={teacher.thumbnail}
            alt={teacher.name}
            className="w-16 h-16 rounded-lg object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center">
            <User className="h-8 w-8 text-blue-600" />
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-gray-800">{teacher.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  <BookOpen className="h-3 w-3" />
                  {teacher.subject}
                </span>
                {source === 'youtube' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                    <Youtube className="h-3 w-3" />
                    يوتيوب
                  </span>
                )}
                {source === 'ai' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                    Gemini 2.0 Flash
                  </span>
                )}
              </div>
            </div>

            {teacher.url && (
              <a
                href={teacher.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700"
              >
                <ExternalLink className="h-5 w-5" />
              </a>
            )}
          </div>

          {teacher.description && (
            <p className="text-gray-600 text-sm mt-2 line-clamp-2">{teacher.description}</p>
          )}

          <div className="mt-3">
            {renderStars(teacher.rating)}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Search className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-800">البحث عن مدرسين</h2>
        <div className="ml-auto flex items-center gap-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
          <Zap className="h-3 w-3" />
          <span>Gemini 2.0 Flash</span>
        </div>
      </div>

      {!teachers ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المادة <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">اختر المادة</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                كلمات مفتاحية (اختياري)
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="مثال: ثانوي، إعدادي..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                المنصة (اختياري)
              </label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">الكل</option>
                {platforms.map((platform) => (
                  <option key={platform} value={platform}>
                    {platform}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSearching}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSearching ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                جاري البحث...
              </>
            ) : (
              <>
                <Search className="h-5 w-5" />
                بحث عن مدرسين
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-800">نتائج البحث</h3>
            <button
              onClick={() => {
                setTeachers(null);
                setError('');
              }}
              className="text-blue-500 hover:text-blue-700 text-sm font-medium"
            >
              بحث جديد
            </button>
          </div>

          {teachers.localTeachers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">المدرسين المحفوظين ({teachers.localTeachers.length})</h4>
              <div className="space-y-3">
                {teachers.localTeachers.map((teacher) => renderTeacherCard(teacher, 'local'))}
              </div>
            </div>
          )}

          {teachers.aiTeachers.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">مدرسين موصى بهم ({teachers.aiTeachers.length})</h4>
              <div className="space-y-3">
                {teachers.aiTeachers.map((teacher) => renderTeacherCard(teacher, 'ai'))}
              </div>
            </div>
          )}

          {teachers.youtubeResults.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">قنوات يوتيوب ({teachers.youtubeResults.length})</h4>
              <div className="space-y-3">
                {teachers.youtubeResults.map((teacher) => renderTeacherCard(teacher, 'youtube'))}
              </div>
            </div>
          )}

          {teachers.localTeachers.length === 0 && 
           teachers.aiTeachers.length === 0 && 
           teachers.youtubeResults.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              لم يتم العثور على أي مدرسين. يرجى المحاولة مرة أخرى بكلمات مفتاحية مختلفة.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
