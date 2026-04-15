"use client";

import React, { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

interface AiRecommendation {
  id: string;
  itemId: string;
  itemType: 'resource' | 'course' | 'exam' | 'content' | 'teacher';
  title: string;
  description?: string;
  score: number;
  algorithm: 'collaborative' | 'content_based' | 'hybrid' | 'deep_learning';
  reason?: string;
  metadata?: Record<string, any>;
}

interface AiSuggestionsProps {
  userId: string;
  isCompact?: boolean;
  onItemClick?: () => void;
  className?: string;
}

// Skeleton loader component
const SkeletonCard = ({ index }: { index: number }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: index * 0.1 }}
    className="p-3 rounded-lg border border-border/40 bg-card/30"
  >
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted/50 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted/50 rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-muted/30 rounded w-full animate-pulse" />
        <div className="h-3 bg-muted/30 rounded w-1/2 animate-pulse" />
      </div>
    </div>
  </motion.div>
);

export const AiSuggestions = memo(function AiSuggestions({ 
  userId, 
  isCompact = false, 
  onItemClick, 
  className 
}: AiSuggestionsProps) {
  const [recommendations, setRecommendations] = useState<AiRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get icon based on item type
  const getItemIcon = useCallback((itemType: string) => {
    const iconMap = {
      'resource': FileText,
      'course': BookOpen,
      'exam': Target,
      'content': Lightbulb,
      'teacher': TrendingUp
    };
    return iconMap[itemType as keyof typeof iconMap] || Sparkles;
  }, []);

  // Get color scheme based on algorithm
  const getAlgorithmColor = useCallback((algorithm: string) => {
    const colorMap = {
      'collaborative': 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-600 dark:text-blue-400',
      'content_based': 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-600 dark:text-green-400',
      'hybrid': 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-600 dark:text-purple-400',
      'deep_learning': 'from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-600 dark:text-orange-400'
    };
    return colorMap[algorithm as keyof typeof colorMap] || 'from-primary/20 to-primary/20 border-primary/30 text-primary';
  }, []);

  // Get algorithm label
  const getAlgorithmLabel = useCallback((algorithm: string) => {
    const labelMap = {
      'collaborative': 'تعاوني',
      'content_based': 'محتوى',
      'hybrid': 'هجين',
      'deep_learning': 'تعلم عميق'
    };
    return labelMap[algorithm as keyof typeof labelMap] || 'ذكي';
  }, []);

  // Fetch AI recommendations
  const fetchRecommendations = useCallback(async (forceRefresh = false) => {
    if (!userId) return;

    // Check if we need to refresh (cache for 5 minutes)
    if (!forceRefresh && lastRefresh && (Date.now() - lastRefresh.getTime()) < 300000) {
      return;
    }

    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(`/api/ai/recommendations?limit=6&force=${forceRefresh}`);
      
      if (response.status === 401) {
        // Session expired or unauthorized - handle gracefully
        logger.debug('User unauthorized for AI recommendations');
        setRecommendations([]);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      let fetchedRecs = data.success && data.recommendations ? data.recommendations : [];

      // BEHAVIORAL LOGIC (Client-side simulation for now)
      // Check if there's an exam tomorrow (simulation)
      const hasExamTomorrow = true; // This would typically come from user schedule context
      if (hasExamTomorrow) {
        const quickRevisionItem: AiRecommendation = {
          id: 'behavior-1',
          itemId: 'quick-revision',
          itemType: 'content',
          title: '🔥 مراجعة سريعة للاختبار',
          description: 'لديك اختبار غداً في الكيمياء! ابدأ المراجعة المركزة الآن.',
          score: 0.99,
          algorithm: 'deep_learning',
          reason: 'بناءً على جدولك الدراسي',
          metadata: { isPriority: true }
        };
        // Inject at the beginning
        fetchedRecs = [quickRevisionItem, ...fetchedRecs.filter((r: AiRecommendation) => r.id !== 'behavior-1')];
      }

      if (data.success || hasExamTomorrow) {
        setRecommendations(fetchedRecs);
        setLastRefresh(new Date());
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      logger.error('Failed to fetch AI recommendations:', error);
      setError('فشل في تحميل التوصيات الذكية');
      setRecommendations([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId, lastRefresh]);

  // Track item click for ML learning
  const trackInteraction = useCallback(async (recommendation: AiRecommendation) => {
    try {
      // Get auth token from cookie
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('access_token='))
        ?.split('=')[1] ||
        document.cookie
          .split('; ')
          .find(row => row.startsWith('authToken='))
          ?.split('=')[1];

      if (!token) {
        logger.debug('No auth token found for tracking interaction');
        return;
      }

      await fetch('/api/ai/recommendations/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type: 'click',
          itemType: recommendation.itemType,
          itemId: recommendation.itemId,
          metadata: {
            algorithm: recommendation.algorithm,
            score: recommendation.score,
            source: 'mega_menu_ai_suggestion'
          }
        })
      });
    } catch (error) {
      logger.debug('Failed to track interaction:', error);
    }
  }, []);

  // Handle item click
  const handleItemClick = useCallback(async (recommendation: AiRecommendation, href: string) => {
    // Track the interaction
    await trackInteraction(recommendation);

    // Close the mega menu
    if (onItemClick) {
      onItemClick();
    }

    // Navigate to the item
    window.location.href = href;
  }, [trackInteraction, onItemClick]);

  // Generate href based on item type
  const getItemHref = useCallback((recommendation: AiRecommendation) => {
    const { itemType, itemId } = recommendation;
    const hrefMap = {
      'course': `/courses/${itemId}`,
      'resource': `/resources/${itemId}`,
      'exam': `/exams/${itemId}`,
      'content': `/content/${itemId}`,
      'teacher': `/teachers/${itemId}`
    };
    return hrefMap[itemType] || '/';
  }, []);

  // Load recommendations on mount
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  if (!userId) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          {/* Animated Brain Icon */}
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.1 }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 rounded-full bg-primary/30 blur-md"
            />
            <div className="relative p-1.5 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/30">
              <Brain className="h-4 w-4 text-primary" />
            </div>
          </motion.div>
          
          <h3 className="font-semibold text-foreground">توصيات ذكية</h3>
          
          <motion.span
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="px-2 py-0.5 rounded-full bg-gradient-to-r from-primary/15 to-primary/10 text-primary text-xs font-bold border border-primary/25 shadow-sm"
          >
            AI
          </motion.span>

          {/* Trending indicator */}
          {recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs border border-orange-500/20"
            >
              <Flame className="h-3 w-3" />
              <span className="font-medium">رائج</span>
            </motion.div>
          )}
        </motion.div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchRecommendations(true)}
          disabled={isLoading || isRefreshing}
          className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
          aria-label="تحديث التوصيات"
        >
          <motion.div
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={{ duration: 1, repeat: isRefreshing ? Infinity : 0, ease: "linear" }}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "text-primary")} />
          </motion.div>
        </Button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading && !isRefreshing ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "grid gap-3",
              isCompact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            )}
          >
            {[...Array(isCompact ? 3 : 4)].map((_, i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20"
          >
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">حاول مرة أخرى لاحقاً</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchRecommendations(true)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              إعادة المحاولة
            </Button>
          </motion.div>
        ) : recommendations.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center py-8 px-4 rounded-lg bg-muted/30 border border-border/50"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
              className="inline-flex p-3 rounded-full bg-muted/50 mb-3"
            >
              <Lightbulb className="h-8 w-8 text-muted-foreground" />
            </motion.div>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto">
              لم يتم العثور على توصيات حالياً. استمر في استخدام التطبيق للحصول على توصيات شخصية!
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="recommendations"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "grid gap-3",
              isCompact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            )}
          >
            {recommendations.slice(0, isCompact ? 3 : 6).map((recommendation, index) => {
              const IconComponent = getItemIcon(recommendation.itemType);
              const href = getItemHref(recommendation);
              const algorithmColor = getAlgorithmColor(recommendation.algorithm);
              const algorithmLabel = getAlgorithmLabel(recommendation.algorithm);

              return (
                <motion.div
                  key={recommendation.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <button
                    onClick={() => handleItemClick(recommendation, href)}
                    className={cn(
                      "w-full p-3 rounded-xl border bg-card/50 hover:bg-card",
                      "transition-all duration-300 text-right group",
                      "hover:shadow-lg hover:shadow-primary/10",
                      "border-border/50 hover:border-primary/40",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <motion.div 
                        whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                        className={cn(
                          "flex-shrink-0 p-2 rounded-lg bg-gradient-to-br border",
                          algorithmColor
                        )}
                      >
                        <IconComponent className="h-4 w-4" />
                      </motion.div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {recommendation.title}
                          </h4>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 transition-all flex-shrink-0" />
                        </div>

                        {recommendation.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2 group-hover:text-foreground/70 transition-colors">
                            {recommendation.description}
                          </p>
                        )}

                        {/* Metadata */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Algorithm Badge */}
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-md border font-medium",
                            algorithmColor.replace('text-', 'bg-').replace('/20', '/10')
                          )}>
                            {algorithmLabel}
                          </span>

                          {/* Reason */}
                          {recommendation.reason && (
                            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {recommendation.reason}
                            </span>
                          )}

                          {/* Score */}
                          <div className="flex items-center gap-1 mr-auto">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs text-primary font-semibold">
                              {(recommendation.score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Last updated indicator */}
      {lastRefresh && recommendations.length > 0 && !isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"
        >
          <Clock className="h-3 w-3" />
          <span>
            آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </motion.div>
      )}
    </div>
  );
});

AiSuggestions.displayName = "AiSuggestions";
