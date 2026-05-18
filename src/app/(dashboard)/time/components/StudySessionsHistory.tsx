'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy, Activity, Clock, Brain, BarChart3,
  Filter, Eye, EyeOff, Download
} from 'lucide-react';
import { format, startOfWeek, subMonths, startOfMonth, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';

import { logger } from '@/lib/logger';
import type { StudySession, StudySessionsHistoryProps, SessionStats, ChartData } from './_components/study-session-types';
import { StudyChart } from './_components/StudyChart';
import { SessionsListView } from './_components/SessionsListView';
import { SessionsGridView } from './_components/SessionsGridView';
import { StatsSection } from './_components/StatsSection';
import { FilterPanel } from './_components/FilterPanel';
import { PaginationBar } from './_components/PaginationBar';

export default function StudySessionsHistory({ sessions, subjects }: StudySessionsHistoryProps) {
  const [timePeriod, setTimePeriod] = useState('month');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedMood, setSelectedMood] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'productivity' | 'mood'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'chart'>('list');
  const [showStats, setShowStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Date range
  const [customDateRange] = useState({
    start: '',
    end: ''
  });

  // Filter sessions based on criteria
  const filteredSessions = useMemo(() => {
    let filtered = [...sessions];

    const now = new Date();
    let startDate: Date;

    switch (timePeriod) {
      case 'week':
        startDate = startOfWeek(now, { weekStartsOn: 0 });
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      case 'quarter':
        startDate = subMonths(startOfMonth(now), 3);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        startDate = new Date(0);
        break;
    }

    if (customDateRange.start && customDateRange.end) {
      const customStart = new Date(customDateRange.start);
      const customEnd = new Date(customDateRange.end);
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.createdAt);
        return sessionDate >= customStart && sessionDate <= customEnd;
      });
    } else if (timePeriod !== 'all') {
      filtered = filtered.filter(session => new Date(session.createdAt) >= startDate);
    }

    if (selectedSubject !== 'all') {
      filtered = filtered.filter(session => session.subject === selectedSubject);
    }

    if (selectedMood !== 'all') {
      filtered = filtered.filter(session => session.mood === selectedMood);
    }

    if (searchQuery) {
      filtered = filtered.filter(session => {
        const subjectName = typeof session.subject === 'string' ? session.subject : session.subject?.name;
        return (
          session.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          subjectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          session.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      });
    }

    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'duration':
          comparison = a.durationMin - b.durationMin;
          break;
        case 'productivity':
          comparison = (a.productivity || 0) - (b.productivity || 0);
          break;
        case 'mood': {
          const moodValues = { 'EXCELLENT': 4, 'GOOD': 3, 'AVERAGE': 2, 'POOR': 1 };
          comparison = (moodValues[a.mood || 'AVERAGE'] || 2) - (moodValues[b.mood || 'AVERAGE'] || 2);
          break;
        }
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [sessions, timePeriod, selectedSubject, selectedMood, searchQuery, sortBy, sortOrder, customDateRange]);

  // Handler for session toggle in bulk select mode
  const handleToggleSession = useCallback((sessionId: string, checked: boolean) => {
    setSelectedSessions(prev => {
      if (checked) return [...prev, sessionId];
      return prev.filter(id => id !== sessionId);
    });
  }, []);

  // Calculate comprehensive statistics
  const stats: SessionStats = useMemo(() => {
    if (filteredSessions.length === 0) {
      return {
        totalSessions: 0,
        totalHours: 0,
        averageSessionLength: 0,
        averageProductivity: 0,
        averageFocusScore: 0,
        averageMood: 0,
        totalBreaks: 0,
        totalDistractions: 0,
        longestSession: 0,
        shortestSession: 0,
        mostProductiveDay: '',
        mostProductiveTime: '',
        favoriteSubject: '',
        studyStreak: 0,
        weeklyTrend: 0,
        monthlyTrend: 0
      };
    }

    const totalSessions = filteredSessions.length;
    const totalMinutes = filteredSessions.reduce((acc, session) => acc + session.durationMin, 0);
    const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
    const averageSessionLength = Math.round(totalMinutes / totalSessions);

    const productiveSessions = filteredSessions.filter(s => s.productivity !== undefined);
    const averageProductivity = productiveSessions.length > 0
      ? Math.round(productiveSessions.reduce((acc, s) => acc + (s.productivity || 0), 0) / productiveSessions.length)
      : 0;

    const focusSessions = filteredSessions.filter(s => s.focusScore !== undefined);
    const averageFocusScore = focusSessions.length > 0
      ? Math.round(focusSessions.reduce((acc, s) => acc + (s.focusScore || 0), 0) / focusSessions.length)
      : 0;

    const moodSessions = filteredSessions.filter(s => s.mood !== undefined);
    const moodValues = { 'EXCELLENT': 4, 'GOOD': 3, 'AVERAGE': 2, 'POOR': 1 };
    const averageMood = moodSessions.length > 0
      ? Math.round(moodSessions.reduce((acc, s) => acc + (moodValues[s.mood || 'AVERAGE'] || 2), 0) / moodSessions.length)
      : 0;

    const totalBreaks = filteredSessions.reduce((acc, s) => acc + (s.breaks || 0), 0);
    const totalDistractions = filteredSessions.reduce((acc, s) => acc + (s.distractions || 0), 0);

    const durations = filteredSessions.map(s => s.durationMin);
    const longestSession = Math.max(...durations);
    const shortestSession = Math.min(...durations);

    // Find most productive day of week
    const dayStats = filteredSessions.reduce((acc, session) => {
      const day = format(new Date(session.createdAt), 'EEEE', { locale: ar });
      if (!acc[day]) acc[day] = { sessions: 0, totalProductivity: 0 };
      acc[day].sessions++;
      acc[day].totalProductivity += session.productivity || 0;
      return acc;
    }, {} as Record<string, { sessions: number; totalProductivity: number }>);

    const mostProductiveDay = Object.keys(dayStats).reduce((best, day) => {
      const avgProductivity = dayStats[day]!.totalProductivity / dayStats[day]!.sessions;
      const bestAvg = (dayStats[best]?.totalProductivity ?? 0) / (dayStats[best]?.sessions ?? 1);
      return avgProductivity > bestAvg ? day : best;
    }, Object.keys(dayStats)[0] ?? '');

    // Find most productive time
    const hourStats = filteredSessions.reduce((acc, session) => {
      const hour = new Date(session.createdAt).getHours();
      if (!acc[hour]) acc[hour] = { sessions: 0, totalProductivity: 0 };
      acc[hour].sessions++;
      acc[hour].totalProductivity += session.productivity || 0;
      return acc;
    }, {} as Record<number, { sessions: number; totalProductivity: number }>);

    const mostProductiveHour = Object.keys(hourStats).reduce((best, hour) => {
      const avgProductivity = hourStats[Number.parseInt(hour)]!.totalProductivity / hourStats[Number.parseInt(hour)]!.sessions;
      const bestAvg = (hourStats[Number.parseInt(best)]?.totalProductivity ?? 0) / (hourStats[Number.parseInt(best)]?.sessions ?? 1);
      return avgProductivity > bestAvg ? hour : best;
    }, Object.keys(hourStats)[0] ?? '0');

    const mostProductiveTime = `${mostProductiveHour}:00 - ${Number.parseInt(mostProductiveHour) + 1}:00`;

    // Find favorite subject
    const subjectStats = filteredSessions.reduce((acc, session) => {
      const subjectName = typeof session.subject === 'string' ? session.subject : session.subject?.name;
      if (subjectName) {
        acc[subjectName] = (acc[subjectName] || 0) + session.durationMin;
      }
      return acc;
    }, {} as Record<string, number>);

    const favoriteSubject = Object.keys(subjectStats).reduce((best, subject) =>
      subjectStats[subject]! > (subjectStats[best] ?? 0) ? subject : best, ''
    );

    // Calculate study streak (consecutive days with sessions)
    const sortedSessions = [...filteredSessions].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    let studyStreak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const hasSessionThisDay = sortedSessions.some(session => {
        const sessionDate = new Date(session.createdAt);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });

      if (hasSessionThisDay) {
        studyStreak++;
      } else if (studyStreak > 0) {
        break;
      }

      currentDate.setDate(currentDate.getDate() - 1);
    }

    // Calculate trends
    const now = new Date();
    const weekAgo = subDays(now, 7);
    const twoWeeksAgo = subDays(now, 14);
    const monthAgo = subDays(now, 30);
    const twoMonthsAgo = subDays(now, 60);

    const thisWeekSessions = filteredSessions.filter(s => new Date(s.createdAt) >= weekAgo);
    const lastWeekSessions = filteredSessions.filter(s => {
      const date = new Date(s.createdAt);
      return date >= twoWeeksAgo && date < weekAgo;
    });

    const thisMonthSessions = filteredSessions.filter(s => new Date(s.createdAt) >= monthAgo);
    const lastMonthSessions = filteredSessions.filter(s => {
      const date = new Date(s.createdAt);
      return date >= twoMonthsAgo && date < monthAgo;
    });

    const thisWeekHours = thisWeekSessions.reduce((acc, s) => acc + s.durationMin, 0) / 60;
    const lastWeekHours = lastWeekSessions.reduce((acc, s) => acc + s.durationMin, 0) / 60;
    const thisMonthHours = thisMonthSessions.reduce((acc, s) => acc + s.durationMin, 0) / 60;
    const lastMonthHours = lastMonthSessions.reduce((acc, s) => acc + s.durationMin, 0) / 60;

    const weeklyTrend = lastWeekHours > 0 ? Math.round(((thisWeekHours - lastWeekHours) / lastWeekHours) * 100) : 0;
    const monthlyTrend = lastMonthHours > 0 ? Math.round(((thisMonthHours - lastMonthHours) / lastMonthHours) * 100) : 0;

    return {
      totalSessions,
      totalHours,
      averageSessionLength,
      averageProductivity,
      averageFocusScore,
      averageMood,
      totalBreaks,
      totalDistractions,
      longestSession,
      shortestSession,
      mostProductiveDay,
      mostProductiveTime,
      favoriteSubject,
      studyStreak,
      weeklyTrend,
      monthlyTrend
    };
  }, [filteredSessions]);

  // Generate chart data
  const chartData: ChartData[] = useMemo(() => {
    const data: Record<string, ChartData> = {};

    for (const session of filteredSessions) {
      const date = format(new Date(session.createdAt), 'yyyy-MM-dd');

      if (!data[date]) {
        data[date] = {
          date,
          hours: 0,
          sessions: 0,
          productivity: 0,
          mood: 0
        };
      }

      data[date].hours += session.durationMin / 60;
      data[date].sessions += 1;
      data[date].productivity += session.productivity || 0;

      const moodValues = { 'EXCELLENT': 4, 'GOOD': 3, 'AVERAGE': 2, 'POOR': 1 };
      data[date].mood += moodValues[session.mood || 'AVERAGE'] || 2;
    }

    for (const day of Object.values(data)) {
      day.productivity = Math.round(day.productivity / day.sessions);
      day.mood = Math.round(day.mood / day.sessions);
      day.hours = Math.round(day.hours * 10) / 10;
    }

    return Object.values(data).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSessions]);

  // Pagination
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportData = useCallback(() => {
    try {
      const data = {
        sessions: filteredSessions,
        stats,
        chartData,
        exportDate: new Date().toISOString(),
        filters: {
          timePeriod,
          selectedSubject,
          selectedMood,
          searchQuery
        }
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `study-sessions-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      logger.error('Error exporting data:', error instanceof Error ? error.message : String(error));
    }
  }, [filteredSessions, stats, chartData, timePeriod, selectedSubject, selectedMood, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-amber-200 to-yellow-500 bg-clip-text text-transparent flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-500" />
            موسوعة السجل (Chronicles)
          </h2>
          <div className="flex flex-wrap gap-4 text-sm font-bold text-muted-foreground/80 mt-2">
            <span className="flex items-center gap-1.5"><Activity className="h-4 w-4 text-blue-400" /> الإجمالي: {stats.totalSessions} جلسة</span>
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-emerald-400" /> الساعات: {stats.totalHours}س</span>
            <span className="flex items-center gap-1.5"><Brain className="h-4 w-4 text-purple-400" /> الإنتاجية: {stats.averageProductivity}%</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* View Mode Buttons */}
          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              قائمة
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              شبكة
            </Button>
            <Button
              variant={viewMode === 'chart' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('chart')}
            >
              رسم بياني
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
          >
            <BarChart3 className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkSelectMode(!bulkSelectMode)}
          >
            {bulkSelectMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Statistics Cards & Trends */}
      {showStats && <StatsSection stats={stats} />}

      {/* Filters */}
      {showFilters && (
        <FilterPanel
          timePeriod={timePeriod}
          setTimePeriod={setTimePeriod}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          selectedMood={selectedMood}
          setSelectedMood={setSelectedMood}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          subjects={subjects}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          filteredSessions={filteredSessions}
          allSessions={sessions}
        />
      )}

      {/* Content */}
      <Card>
        <CardContent className="p-6">
          {(() => {
            if (viewMode === 'chart') {
              return <StudyChart chartData={chartData} stats={stats} />;
            }
            if (filteredSessions.length === 0) {
              const hasFilters = Boolean(
                searchQuery || timePeriod !== 'all' || selectedSubject !== 'all' || selectedMood !== 'all'
              );
              const emptyMessage = hasFilters
                ? 'لا توجد جلسات تطابق المرشحات المحددة'
                : 'ابدأ أول جلسة مذاكرة!';
              return (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="mx-auto h-12 w-12 opacity-50 mb-4" />
                  <p className="text-lg font-medium mb-2">لا توجد جلسات</p>
                  <p className="text-sm">{emptyMessage}</p>
                </div>
              );
            }
            const sessionView = viewMode === 'list' ? (
              <SessionsListView
                sessions={paginatedSessions}
                bulkSelectMode={bulkSelectMode}
                selectedSessions={selectedSessions}
                onToggleSession={handleToggleSession}
              />
            ) : (
              <SessionsGridView sessions={paginatedSessions} />
            );
            return (
              <>
                {sessionView}
                {totalPages > 1 && (
                  <PaginationBar
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    setItemsPerPage={setItemsPerPage}
                    totalItems={filteredSessions.length}
                  />
                )}
              </>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
