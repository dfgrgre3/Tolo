export interface StudySession {
  id: string;
  userId: string;
  taskId?: string;
  durationMin: number;
  subject?: string | { name: string };
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

export interface StudySessionsHistoryProps {
  readonly sessions: StudySession[];
  readonly subjects: string[];
}

export interface SessionStats {
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

export interface ChartData {
  date: string;
  hours: number;
  sessions: number;
  productivity: number;
  mood: number;
}

export const MOOD_COLORS = {
  'EXCELLENT': 'bg-green-500 text-green-50',
  'GOOD': 'bg-blue-500 text-blue-50',
  'AVERAGE': 'bg-yellow-500 text-yellow-50',
  'POOR': 'bg-red-500 text-red-50'
};

export const MOOD_LABELS = {
  'EXCELLENT': 'ممتاز',
  'GOOD': 'جيد',
  'AVERAGE': 'متوسط',
  'POOR': 'ضعيف'
};

export const MOOD_ICONS = {
  'EXCELLENT': '🤩',
  'GOOD': '🙂',
  'AVERAGE': '😑',
  'POOR': '😔'
};

export const TIME_PERIODS = [
  { value: 'week', label: 'هذا الأسبوع' },
  { value: 'month', label: 'هذا الشهر' },
  { value: 'quarter', label: 'هذا الربع' },
  { value: 'year', label: 'هذا العام' },
  { value: 'all', label: 'كل الوقت' }
];

export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}س ${mins}د`;
  }
  return `${mins}د`;
}
