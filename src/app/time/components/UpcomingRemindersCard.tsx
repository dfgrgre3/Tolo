'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/card";
import { Badge } from "@/shared/badge";
import { Button } from "@/shared/button";
import { Bell, Eye, EyeOff } from 'lucide-react';
import type { Reminder } from '../types';

interface UpcomingRemindersCardProps {
  reminders: Reminder[];
  showUpcomingOnly: boolean;
  onToggleView: () => void;
  onTabChange: (tab: string) => void;
}

export default function UpcomingRemindersCard({
  reminders,
  showUpcomingOnly,
  onToggleView,
  onTabChange
}: UpcomingRemindersCardProps) {
  return (
    <Card className="border-2 border-primary/10 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row justify-between items-center bg-gradient-to-r from-primary/5 to-transparent dark:from-primary/10">
        <CardTitle className="flex items-center">
          <div className="p-1.5 rounded-lg bg-primary/10 dark:bg-primary/20 ml-2">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          التذكيرات القادمة
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onToggleView}
          className="hover:bg-primary/10 transition-colors"
        >
          {showUpcomingOnly ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {reminders
            .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime())
            .slice(0, 5)
            .map((reminder, index) => {
              const isUpcoming = new Date(reminder.remindAt) > new Date();
              return (
                <div 
                  key={reminder.id} 
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50/50 to-gray-100/30 dark:from-gray-800/50 dark:to-gray-700/30 rounded-lg hover:from-gray-100 hover:to-gray-200 dark:hover:from-gray-700 dark:hover:to-gray-600 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border border-gray-200/50 dark:border-gray-700/50"
                  onClick={() => onTabChange("reminders")}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-base mb-1">{reminder.title}</p>
                    {reminder.message && (
                      <p className="text-sm text-muted-foreground mb-1 line-clamp-1">{reminder.message}</p>
                    )}
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <span>⏰</span>
                      {new Date(reminder.remindAt).toLocaleString('ar-EG', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Badge 
                    variant={isUpcoming ? "default" : "outline"}
                    className={`font-medium ${isUpcoming ? 'bg-yellow-500 hover:bg-yellow-600' : ''}`}
                  >
                    {isUpcoming ? 'قادم' : 'منتهي'}
                  </Badge>
                </div>
              );
            })}
          {reminders.length === 0 && (
            <div className="text-center py-8">
              <div className="mb-2 text-4xl">🔔</div>
              <p className="text-muted-foreground font-medium">لا توجد تذكيرات</p>
              <p className="text-sm text-muted-foreground mt-1">قم بإنشاء تذكير جديد</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

