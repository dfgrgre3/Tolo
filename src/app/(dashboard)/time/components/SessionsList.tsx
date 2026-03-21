import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from 'lucide-react';
import { formatTime } from '../utils/timeUtils';
import type { StudySession, TimeTrackerTask } from '../types';

interface SessionsListProps {
  sessions: StudySession[];
  tasks: TimeTrackerTask[];
}

export function SessionsList({ sessions, tasks }: SessionsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          جلسات اليوم
        </CardTitle>
        <CardDescription>سجل جلسات الدراسة الحديثة</CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">لا توجد جلسات بعد</p>
        ) : (
          <div className="space-y-4">
            {sessions.slice(0, 5).map((session, index) => (
              <div 
                key={`${session.id}-${index}`} 
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors border border-border"
              >
                <div className="flex-1">
                  <div className="font-medium mb-1">
                    {session.taskId 
                      ? tasks.find(t => t.id === session.taskId)?.title 
                      : session.subjectId || 'جلسة مذاكرة'}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {formatTime(session.durationMin * 60)} - {new Date(session.startTime).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <Badge variant="secondary" className="ml-3">
                  {Math.floor(session.durationMin)} د
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
