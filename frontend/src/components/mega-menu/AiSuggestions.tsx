"use client";

import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  TrendingUp,
  Target,
  Clock,
  BookOpen,
  FileText,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Brain,
  Star,
  Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from '@/lib/logger';
import { safeFetch } from "@/lib/safe-client-utils";

// ==========================================
// Types & Constants
// ==========================================

interface AiRecommendation {
  id: string;
  itemId: string;
  itemType: 'resource' | 'course' | 'exam' | 'content' | 'teacher';
  title: string;
  description?: string;
  score: number;
  algorithm: 'collaborative' | 'content_based' | 'hybrid' | 'deep_learning';
  reason?: string;
  metadata?: { isPriority?: boolean };
}

interface AiSuggestionsProps {
  userId: string;
  isCompact?: boolean;
  onItemClick?: () => void;
  className?: string;
  /** الحد الأقصى لعدد التوصيات المعروضة (افتراضي: 6) */
  limit?: number;
  /** مدة صلاحية الكاش بالميلي ثانية (افتراضي: 5 دقائق) */
  cacheDuration?: number;
}

const CACHE_KEY_PREFIX = 'ai_recs_';
const SAFE_ID_REGEX = /^[\w-]+$/;

const ICON_MAP: Record<string, React.ElementType> = {
  resource: FileText,
  course: BookOpen,
  exam: Target,
  content: Lightbulb,
  teacher: TrendingUp,
};

const ALGORITHM_STYLES: Record<string, string> = {
  collaborative: 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10',
  content_based: 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/10',
  hybrid: 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10',
  deep_learning: 'from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/10',
};

const ALGORITHM_LABELS: Record<string, string> = {
  collaborative: 'تعاوني',
  content_based: 'محتوى',
  hybrid: 'هجين',
  deep_learning: 'تعلم عميق',
};

const HREF_MAP: Record<string, string> = {
  course: '/courses/',
  resource: '/resources/',
  exam: '/exams/',
  content: '/content/',
  teacher: '/teachers/',
};

// ==========================================
// Custom Hook (Optimized)
// ==========================================

function useAiRecommendations(
  userId: string | undefined,
  limit: number,
  cacheDuration: number
) {
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // استخدام Ref لتجنب Race Condition دون إضافة recommendations.length للـ dependencies
  const hasDataRef = useRef(false);

  const cacheKey = userId ? `${CACHE_KEY_PREFIX}${userId}` : null;

  const fetchRecommendations = useCallback(async (forceRefresh = false) => {
    if (!userId || !cacheKey) return;

    // قراءة الكاش
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.timestamp && (Date.now() - parsed.timestamp) < cacheDuration) {
            setRecommendations(parsed.data);
            setLastRefresh(new Date(parsed.timestamp));
            setIsLoading(false);
            hasDataRef.current = parsed.data.length > 0;
            return;
          }
        }
      } catch (e) {
        logger.debug('Cache read failed', e);
      }
    }

    if (forceRefresh) setIsRefreshing(true);
    else if (!hasDataRef.current) setIsLoading(true);

    setError(null);

    try {
      const { data, response, error: fetchErr } = await safeFetch<{
        success: boolean;
        recommendations: AiRecommendation[];
      }>(`/api/ai/recommendations?limit=${limit}&force=${forceRefresh}`);

      if (response?.status === 401) throw new Error('Unauthorized');
      if (fetchErr || !response?.ok) throw fetchErr || new Error(`HTTP ${response?.status}`);
      if (!data?.success) throw new Error('Invalid response format');

      const newData = data.recommendations || [];

      // كتابة آمنة للكاش مع حماية من امتلاء التخزين
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ data: newData, timestamp: Date.now() }));
      } catch (storageErr) {
        logger.warn('SessionStorage full or unavailable, skipping cache write', storageErr);
      }

      setRecommendations(newData);
      setLastRefresh(new Date());
      hasDataRef.current = newData.length > 0;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error('Failed to fetch AI recommendations:', err);

      if (message === 'Unauthorized') {
        try { sessionStorage.removeItem(cacheKey); } catch {}
        setRecommendations([]);
        hasDataRef.current = false;
      } else {
        setError('فشل في تحميل التوصيات الذكية');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, cacheKey, limit, cacheDuration]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return { recommendations, lastRefresh, isLoading, isRefreshing, error, fetchRecommendations };
}

// ==========================================
// Tracking Utility (Beacon API + Fallback)
// ==========================================

function trackRecommendationClick(rec: AiRecommendation) {
  const payload = JSON.stringify({
    type: 'click',
    itemType: rec.itemType,
    itemId: rec.itemId,
    metadata: { algorithm: rec.algorithm, score: rec.score, source: 'mega_menu_ai_suggestion' }
  });

  // Beacon API يضمن وصول الطلب حتى عند التنقل السريع
  if (navigator.sendBeacon) {
    const sent = navigator.sendBeacon('/api/ai/recommendations/track', payload);
    if (!sent) {
      logger.debug('Beacon failed, falling back to fetch');
      fallbackTrack(payload);
    }
  } else {
    fallbackTrack(payload);
  }
}

function fallbackTrack(payload: string) {
  fetch('/api/ai/recommendations/track', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true
  }).catch(e => logger.debug('Fallback track failed:', e));
}

// ==========================================
// Sub-components
// ==========================================

const SkeletonCard = ({ isCompact }: { isCompact: boolean }) => (
  <div className={cn("p-3 rounded-lg border border-border/40 bg-card/30", isCompact ? "col-span-1" : "col-span-1 md:col-span-1")}>
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted/50" aria-hidden="true" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted/50 rounded w-3/4" />
        <div className="h-3 bg-muted/30 rounded w-full" />
        <div className="h-3 bg-muted/30 rounded w-1/2" />
      </div>
    </div>
  </div>
);

// ==========================================
// Main Component
// ==========================================

export default memo(function AiSuggestions({
  userId,
  isCompact = false,
  onItemClick,
  className,
  limit = 6,
  cacheDuration = 5 * 60 * 1000
}: AiSuggestionsProps) {
  const router = useRouter();
  const { recommendations, lastRefresh, isLoading, isRefreshing, error, fetchRecommendations } =
    useAiRecommendations(userId, limit, cacheDuration);

  const handleItemClick = useCallback((rec: AiRecommendation) => {
    const safeId = SAFE_ID_REGEX.test(rec.itemId) ? rec.itemId : '';
    if (!safeId) {
      logger.warn(`Invalid itemId detected: ${rec.itemId}`);
      return;
    }

    // تتبع موثوق عبر Beacon API
    trackRecommendationClick({ ...rec, itemId: safeId });

    onItemClick?.();
    const basePath = HREF_MAP[rec.itemType] || '/';
    router.push(`${basePath}${safeId}`);
  }, [onItemClick, router]);

  const formattedTime = lastRefresh && !isNaN(lastRefresh.getTime())
    ? lastRefresh.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    : '';

  if (!userId) return null;

  // عدد عناصر Skeleton ديناميكي بناءً على limit لمنع CLS
  const skeletonCount = isCompact ? Math.min(limit, 3) : Math.min(limit, 4);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative p-1.5 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
            <Brain className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>

          <h3 className="font-semibold text-foreground">توصيات ذكية</h3>

          <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-primary/15 to-primary/10 text-primary text-xs font-bold border border-primary/25 shadow-sm">
            AI
          </span>

          {recommendations.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs border border-orange-500/20">
              <Flame className="h-3 w-3" aria-hidden="true" />
              <span className="font-medium">رائج</span>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchRecommendations(true)}
          disabled={isLoading || isRefreshing}
          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors active:scale-95"
          aria-label={isRefreshing ? "جاري تحديث التوصيات" : "تحديث التوصيات"}
        >
          <RefreshCw className={cn("h-4 w-4 transition-transform duration-700", isRefreshing && "animate-spin text-primary")} aria-hidden="true" />
        </Button>
      </div>

      {/* Content List */}
      <div
        role="list"
        className={cn("grid gap-3", isCompact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}
      >
        {isLoading && !isRefreshing ? (
          Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={i} role="listitem"><SkeletonCard isCompact={isCompact} /></div>
          ))
        ) : error ? (
          <div role="listitem" className="col-span-full flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">حاول مرة أخرى لاحقاً</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchRecommendations(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              aria-label="إعادة محاولة تحميل التوصيات"
            >
              إعادة المحاولة
            </Button>
          </div>
        ) : recommendations.length === 0 ? (
          <div role="listitem" className="col-span-full text-center py-8 px-4 rounded-lg bg-muted/30 border border-border/50">
            <div className="inline-flex p-3 rounded-full bg-muted/50 mb-3">
              <Lightbulb className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              لم يتم العثور على توصيات حالياً. استمر في استخدام التطبيق للحصول على توصيات شخصية!
            </p>
          </div>
        ) : (
          recommendations.slice(0, limit).map((rec) => {
            const Icon = ICON_MAP[rec.itemType] || Sparkles;
            const style = ALGORITHM_STYLES[rec.algorithm] || ALGORITHM_STYLES.collaborative;
            const label = ALGORITHM_LABELS[rec.algorithm] || 'ذكي';
            const safeId = SAFE_ID_REGEX.test(rec.itemId) ? rec.itemId : '';

            if (!safeId) return null;

            return (
              <div key={rec.id} role="listitem">
                <button
                  onClick={() => handleItemClick(rec)}
                  className={cn(
                    "w-full p-3 rounded-xl border bg-card/50 text-right group",
                    "transition-all duration-200 ease-out",
                    "hover:bg-card hover:shadow-lg hover:shadow-primary/5 hover:border-primary/40 hover:-translate-y-0.5",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    "border-border/50 active:scale-[0.99]"
                  )}
                  aria-label={`توصية: ${rec.title}، النوع: ${label}، الثقة: ${(rec.score * 100).toFixed(0)}%`}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("flex-shrink-0 p-2 rounded-lg bg-gradient-to-br border transition-transform duration-300 group-hover:scale-110", style)}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {rec.title}
                        </h4>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 flex-shrink-0" aria-hidden="true" />
                      </div>

                      {rec.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2 group-hover:text-foreground/70 transition-colors">
                          {rec.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-md border font-medium", style)}>
                          {label}
                        </span>

                        {rec.reason && (
                          <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {rec.reason}
                          </span>
                        )}

                        <div className="flex items-center gap-1 mr-auto">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" aria-hidden="true" />
                          <span className="text-xs text-primary font-semibold">
                            {(rec.score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {formattedTime && recommendations.length > 0 && !isLoading && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-2">
          <Clock className="h-3 w-3" aria-hidden="true" />
          <span>آخر تحديث: {formattedTime}</span>
        </div>
      )}
    </div>
  );
});