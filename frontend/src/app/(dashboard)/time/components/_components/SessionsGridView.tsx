'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { StudySession } from './study-session-types';
import { MOOD_COLORS, MOOD_LABELS, MOOD_ICONS, formatDuration } from './study-session-types';

interface SessionsGridViewProps {
  sessions: StudySession[];
}

export function SessionsGridView({ sessions }: SessionsGridViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sessions.map((session) => (
        <Card key={session.id} className="bg-background/40 backdrop-blur-xl border-white/10 shadow-lg hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 rounded-2xl overflow-hidden group">
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
                    {typeof session.subject === 'string' ? session.subject : session.subject.name}
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
}
