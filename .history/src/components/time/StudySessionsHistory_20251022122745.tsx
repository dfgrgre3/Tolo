'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Button } from "@/shared/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/shared/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar,
  Clock,
  BookOpen,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Award,
  Star,
  Brain,
  Coffee,
  Timer,
  Eye,
  EyeOff,
  Filter,
  Search,
  SortAsc,
  SortDesc,
  Download,
  Upload,
  RefreshCw,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Share2,
  Zap,
  Heart,
  Users,
  Moon,
  Sun,
  Flame,
  Trophy,
  LineChart,
  PieChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, subDays, subWeeks, subMonths, differenceInDays, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

interface StudySession {
  id: string;
  userId: string;
  taskId?: string;
  durationMin: number;
  subject?: string;
  notes?: string;
  mood?: 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';
  productivity?: number;
  breaks?: number;
  distractions?: number;
  focusScore?: number;
  energyLevel?: number;
  difficulty?: number;
  satisfaction?: number;
  tags?: string[];
  location?: string;
  createdAt: string;
  updatedAt: string;
}

interface StudySessionsHistoryProps {
  sessions: StudySession[];
  subjects: string[];
}

interface SessionStats {
  totalSessions: number;
  totalHours: number;
  averageSessionLength: number;
  averageProductivity: number;
  averageFocusScore: number;
  averageMood: number;
  totalBreaks: number;
  totalDistractions: number;
  longestSession: number;
  shortestSession: number;
  mostProductiveDay: string;
  mostProductiveTime: string;
  favoriteSubject: string;
  studyStreak: number;
  weeklyTrend: number;
  monthlyTrend: number;
}

interface ChartData {
  date: string;
  hours: number;
  sessions: number;
  productivity: number;
  mood: number;
}

const MOOD_COLORS = {
  'EXCELLENT': 'bg-green-500 text-green-50',
  'GOOD': 'bg-blue-500 text-blue-50',
  'AVERAGE': 'bg-yellow-500 text-yellow-50',
  'POOR': 'bg-red-500 text-red-50'
};

const MOOD_LABELS = {
  'EXCELLENT': 'ممتاز',
  'GOOD': 'جيد',
  'AVERAGE': 'متوسط',
  'POOR': 'ضعيف'
};

const MOOD_ICONS = {
  'EXCELLENT': '😊',
  'GOOD': '🙂',
  'AVERAGE': '😐',
  'POOR': '😔'
};

const TIME_PERIODS = [
  { value: 'week', label: 'هذا الأسبوع' },
  { value: 'month', label: 'هذا الشهر' },
  { value: 'quarter', label: 'هذا الربع' },
  { value: 'year', label: 'هذا العام' },
  { value: 'all', label: 'كل الوقت' }
];

const CHART_TYPES = [
  { value: 'line', label: 'خط', icon: LineChart },
  { value: 'bar', label: 'أعمدة', icon: BarChart3 },
  { value: 'pie', label: 'دائري', icon: PieChart }
];

export default function StudySessionsHistory({ sessions, subjects }: StudySessionsHistoryProps) {
  const [filteredSessions, setFilteredSessions] = useState<StudySession[]>(sessions);
  const [timePeriod, setTimePeriod] = useState('month');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedMood, setSelectedMood] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'duration' | 'productivity' | 'mood'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'chart'>('list');
  const [chartType, setChartType] = useState('line');
  const [showStats, setShowStats] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Date range
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });

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
      const avgProductivity = dayStats[day].totalProductivity / dayStats[day].sessions;
      const bestAvg = dayStats[best]?.totalProductivity / dayStats[best]?.sessions || 0;
      return avgProductivity > bestAvg ? day : best;
    }, Object.keys(dayStats)[0] || '');
    
    // Find most productive time
    const hourStats = filteredSessions.reduce((acc, session) => {
      const hour = new Date(session.createdAt).getHours();
      if (!acc[hour]) acc[hour] = { sessions: 0, totalProductivity: 0 };
      acc[hour].sessions++;
      acc[hour].totalProductivity += session.productivity || 0;
      return acc;
    }, {} as Record<number, { sessions: number; totalProductivity: number }>);
    
    const mostProductiveHour = Object.keys(hourStats).reduce((best, hour) => {
      const avgProductivity = hourStats[parseInt(hour)].totalProductivity / hourStats[parseInt(hour)].sessions;
      const bestAvg = hourStats[parseInt(best)]?.totalProductivity / hourStats[parseInt(best)]?.sessions || 0;
      return avgProductivity > bestAvg ? hour : best;
    }, Object.keys(hourStats)[0] || '0');
    
    const mostProductiveTime = `${mostProductiveHour}:00 - ${parseInt(mostProductiveHour) + 1}:00`;
    
    // Find favorite subject
    const subjectStats = filteredSessions.reduce((acc, session) => {
      if (session.subject) {
        acc[session.subject] = (acc[session.subject] || 0) + session.durationMin;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const favoriteSubject = Object.keys(subjectStats).reduce((best, subject) => 
      subjectStats[subject] > (subjectStats[best] || 0) ? subject : best, ''
    );
    
    // Calculate study streak (consecutive days with sessions)
    const sortedSessions = [...filteredSessions].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    let studyStreak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 365; i++) { // Check up to a year
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
        break; // Streak broken
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
    
    filteredSessions.forEach(session => {
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
    });
    
    // Calculate averages
    Object.values(data).forEach(day => {
      day.productivity = Math.round(day.productivity / day.sessions);
      day.mood = Math.round(day.mood / day.sessions);
      day.hours = Math.round(day.hours * 10) / 10;
    });
    
    return Object.values(data).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSessions]);

  // Filter sessions based on criteria
  useEffect(() => {
    let filtered = [...sessions];
    
    // Time period filter
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
    
    // Subject filter
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(session => session.subject === selectedSubject);
    }
    
    // Mood filter
    if (selectedMood !== 'all') {
      filtered = filtered.filter(session => session.mood === selectedMood);
    }
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(session =>
        session.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Sort sessions
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
        case 'mood':
          const moodValues = { 'EXCELLENT': 4, 'GOOD': 3, 'AVERAGE': 2, 'POOR': 1 };
          comparison = (moodValues[a.mood || 'AVERAGE'] || 2) - (moodValues[b.mood || 'AVERAGE'] || 2);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredSessions(filtered);
    setCurrentPage(1); // Reset pagination
  }, [sessions, timePeriod, selectedSubject, selectedMood, searchQuery, sortBy, sortOrder, customDateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const paginatedSessions = filteredSessions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}س ${mins}د`;
    }
    return `${mins}د`;
  };

  const exportData = () => {
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
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <BarChart3 className="mx-auto h-12 w-12 opacity-50 mb-2" />
          <p>لا توجد بيانات لعرض الرسم البياني</p>
        </div>
      );
    }

    // Simple chart representation (in a real app, you'd use a charting library like Chart.js or Recharts)
    const maxHours = Math.max(...chartData.map(d => d.hours));
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.totalHours}س</div>
                <div className="text-sm text-gray-600">إجمالي الساعات</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.totalSessions}</div>
                <div className="text-sm text-gray-600">إجمالي الجلسات</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.averageProductivity}%</div>
                <div className="text-sm text-gray-600">متوسط الإنتاجية</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.studyStreak}</div>
                <div className="text-sm text-gray-600">أيام متتالية</div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Simple bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>الساعات اليومية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {chartData.slice(-14).map((day, index) => (
                <div key={day.date} className="flex items-center gap-3">
                  <div className="w-20 text-sm text-gray-600">
                    {format(new Date(day.date), 'dd/MM', { locale: ar })}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div 
                        className="bg-blue-500 h-6 rounded"
                        style={{ width: `${(day.hours / maxHours) * 100}%`, minWidth: '2px' }}
                      />
                      <span className="text-sm font-medium">{day.hours}س</span>
                    </div>
                  </div>
                  <div className="w-16 text-sm text-gray-500">
                    {day.sessions} جلسة
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSessionsList = () => (
    <div className="space-y-3">
      {paginatedSessions.map((session, index) => (
        <Card key={session.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{formatDuration(session.durationMin)}</span>
                  </div>
                  
                  {session.subject && (
                    <Badge variant="outline" className="text-xs">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {session.subject}
                    </Badge>
                  )}
                  
                  {session.mood && (
                    <Badge className={cn("text-xs", MOOD_COLORS[session.mood])}>
                      {MOOD_ICONS[session.mood]} {MOOD_LABELS[session.mood]}
                    </Badge>
                  )}
                  
                  {session.productivity !== undefined && (
                    <Badge variant="secondary" className="text-xs">
                      <Activity className="h-3 w-3 mr-1" />
                      {session.productivity}%
                    </Badge>
                  )}
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  {format(new Date(session.createdAt), 'EEEE، dd MMMM yyyy - HH:mm', { locale: ar })}
                </div>
                
                {session.notes && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-2">
                    {session.notes}
                  </p>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {session.breaks !== undefined && session.breaks > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Coffee className="h-3 w-3 mr-1" />
                      {session.breaks} استراحة
                    </Badge>
                  )}
                  
                  {session.distractions !== undefined && session.distractions > 0 && (
                    <Badge variant="outline" className="text-xs text-red-600">
                      <Zap className="h-3 w-3 mr-1" />
                      {session.distractions} تشتت
                    </Badge>
                  )}
                  
                  {session.focusScore !== undefined && (
                    <Badge variant="outline" className="text-xs">
                      <Brain className="h-3 w-3 mr-1" />
                      تركيز {session.focusScore}%
                    </Badge>
                  )}
                  
                  {session.tags && session.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                {bulkSelectMode && (
                  <input
                    type="checkbox"
                    checked={selectedSessions.includes(session.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedSessions([...selectedSessions, session.id]);
                      } else {
                        setSelectedSessions(selectedSessions.filter(id => id !== session.id));
                      }
                    }}
                  />
                )}
                
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderSessionsGrid = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {paginatedSessions.map((session) => (
        <Card key={session.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="text-center mb-3">
              <div className="text-2xl font-bold text-blue-600 mb-1">
                {formatDuration(session.durationMin)}
              </div>
              <div className="text-sm text-gray-500">
                {format(new Date(session.createdAt), 'dd/MM/yyyy', { locale: ar })}
              </div>
            </div>
            
            <div className="space-y-2">
              {session.subject && (
                <div className="flex items-center justify-center">
                  <Badge variant="outline">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {session.subject}
                  </Badge>
                </div>
              )}
              
              {session.mood && (
                <div className="flex items-center justify-center">
                  <Badge className={cn("text-xs", MOOD_COLORS[session.mood])}>
                    {MOOD_ICONS[session.mood]} {MOOD_LABELS[session.mood]}
                  </Badge>
                </div>
              )}
              
              {session.productivity !== undefined && (
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">الإنتاجية</div>
                  <Progress value={session.productivity} className="h-2" />
                  <div className="text-xs text-gray-500 mt-1">{session.productivity}%</div>
                </div>
              )}
              
              {session.notes && (
                <p className="text-xs text-gray-600 text-center line-clamp-3 mt-2">
                  {session.notes}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">سجل جلسات المذاكرة</h2>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>الإجمالي: {stats.totalSessions} جلسة</span>
            <span className="text-blue-600">الساعات: {stats.totalHours}س</span>
            <span className="text-green-600">المتوسط: {stats.averageSessionLength}د</span>
            <span className="text-purple-600">الإنتاجية: {stats.averageProductivity}%</span>
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

      {/* Statistics Cards */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">أطول جلسة</p>
                  <p className="text-2xl font-bold text-blue-600">{formatDuration(stats.longestSession)}</p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">سلسلة الدراسة</p>
                  <p className="text-2xl font-bold text-green-600">{stats.studyStreak} يوم</p>
                </div>
                <Flame className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">المادة المفضلة</p>
                  <p className="text-lg font-bold text-purple-600">{stats.favoriteSubject || 'غير محدد'}</p>
                </div>
                <BookOpen className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">الوقت الأمثل</p>
                  <p className="text-sm font-bold text-orange-600">{stats.mostProductiveTime}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Trends */}
      {showStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">الاتجاه الأسبوعي</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-lg font-bold",
                      stats.weeklyTrend > 0 ? "text-green-600" : stats.weeklyTrend < 0 ? "text-red-600" : "text-gray-600"
                    )}>
                      {stats.weeklyTrend > 0 ? '+' : ''}{stats.weeklyTrend}%
                    </span>
                    {stats.weeklyTrend > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : stats.weeklyTrend < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">الاتجاه الشهري</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-lg font-bold",
                      stats.monthlyTrend > 0 ? "text-green-600" : stats.monthlyTrend < 0 ? "text-red-600" : "text-gray-600"
                    )}>
                      {stats.monthlyTrend > 0 ? '+' : ''}{stats.monthlyTrend}%
                    </span>
                    {stats.monthlyTrend > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : stats.monthlyTrend < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : null}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">الفترة الزمنية</label>
                <Select value={timePeriod} onValueChange={setTimePeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_PERIODS.map(period => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">المادة</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المواد</SelectItem>
                    {subjects.map(subject => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">المزاج</label>
                <Select value={selectedMood} onValueChange={setSelectedMood}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    {Object.entries(MOOD_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {MOOD_ICONS[value as keyof typeof MOOD_ICONS]} {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">البحث</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="البحث في الملاحظات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-4">
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">التاريخ</SelectItem>
                    <SelectItem value="duration">المدة</SelectItem>
                    <SelectItem value="productivity">الإنتاجية</SelectItem>
                    <SelectItem value="mood">المزاج</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>
              
              <div className="text-sm text-gray-600">
                {filteredSessions.length} من {sessions.length} جلسة
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <Card>
        <CardContent className="p-6">
          {viewMode === 'chart' ? (
            renderChart()
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Activity className="mx-auto h-12 w-12 opacity-50 mb-4" />
              <p className="text-lg font-medium mb-2">لا توجد جلسات</p>
              <p className="text-sm">
                {searchQuery || timePeriod !== 'all' || selectedSubject !== 'all' || selectedMood !== 'all'
                  ? 'لا توجد جلسات تطابق المرشحات المحددة'
                  : 'ابدأ أول جلسة مذاكرة!'}
              </p>
            </div>
          ) : (
            <>
              {viewMode === 'list' ? renderSessionsList() : renderSessionsGrid()}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      عرض {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredSessions.length)} من {filteredSessions.length}
                    </span>
                    
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    
                    <span className="px-3 py-1 text-sm">
                      {currentPage} من {totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}