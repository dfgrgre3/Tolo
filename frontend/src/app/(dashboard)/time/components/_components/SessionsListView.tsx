'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, Activity, Coffee, Brain, Zap, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { StudySession } from './study-session-types';
import { MOOD_COLORS, MOOD_LABELS, MOOD_ICONS, formatDuration } from './study-session-types';

interface SessionsListViewProps {
  sessions: StudySession[];
  bulkSelectMode: boolean;
  selectedSessions: string[];
  onToggleSession: (sessionId: string, checked: boolean) => void;
}

export function SessionsListView({ sessions, bulkSelectMode, selectedSessions, onToggleSession }: SessionsListViewProps) {
  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const subjectLabel = typeof session.subject === 'string' ? session.subject : session.subject?.name;
        return (
          <Card key={session.id} className="bg-background/40 backdrop-blur-xl border-white/10 shadow-lg hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 rounded-2xl overflow-hidden group">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="font-black text-blue-500">{formatDuration(session.durationMin)}</span>
                    </div>
                    {session.subject && (
                      <Badge variant="outline" className="text-xs">
                        <BookOpen className="h-3 w-3 mr-1" />
                        {subjectLabel}
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
                    {session.tags?.map(tag => (
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
                      aria-label={subjectLabel ? `تحديد جلسة المذاكرة للمادة ${subjectLabel}` : 'تحديد جلسة المذاكرة'}
                      checked={selectedSessions.includes(session.id)}
                      onChange={(e) => onToggleSession(session.id, e.target.checked)}
                    />
                  )}
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
