"use client";

import React, { useState } from 'react';
import { Brain, Loader2, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MistakeExplainerProps {
  questionId: string;
  userAnswer: string;
  onClose: () => void;
}

export default function MistakeExplainer({
  questionId,
  userAnswer,
  onClose
}: MistakeExplainerProps) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExplanation = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/explain-mistake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, userAnswer })
      });

      if (!response.ok) {
        throw new Error('فشل الحصول على الشرح');
      }

      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchExplanation();
  }, [questionId, userAnswer]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="bg-blue-600 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">شرح المساعد الذكي</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              <p className="text-gray-500 font-medium animate-pulse">جاري تحليل سؤالك وبناء الشرح...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription>{error}</AlertDescription>
              <Button variant="outline" size="sm" onClick={fetchExplanation} className="mt-2">
                إعادة المحاولة
              </Button>
            </Alert>
          ) : explanation ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl">
                <p className="text-blue-800 leading-relaxed text-lg whitespace-pre-wrap">
                  {explanation}
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
                  فهمت، شكراً لك!
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
