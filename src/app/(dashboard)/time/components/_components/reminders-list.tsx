'use client';

import { Bell, CheckCircle, Clock, Repeat, Edit, Copy, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Reminder } from './types';
import { SNOOZE_OPTIONS, getReminderTypeInfo, getPriorityColor, getPriorityText, getTimeInfo } from './types';
import { Tag, MapPin } from './icons';

interface RemindersListProps {
  readonly reminders: Reminder[];
  readonly bulkSelectMode: boolean;
  readonly selectedReminderIds: string[];
  readonly emptyMessage: string;
  readonly onToggleSelect: (id: string) => void;
  readonly onComplete: (id: string) => void;
  readonly onSnooze: (id: string, minutes: number) => void;
  readonly onEdit: (reminder: Reminder) => void;
  readonly onDuplicate: (reminder: Reminder) => void;
  readonly onDelete: (id: string) => void;
}

export function RemindersList({
  reminders,
  bulkSelectMode,
  selectedReminderIds,
  emptyMessage,
  onToggleSelect,
  onComplete,
  onSnooze,
  onEdit,
  onDuplicate,
  onDelete,
}: RemindersListProps) {
  if (reminders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Bell className="mx-auto h-12 w-12 opacity-50 mb-4" />
        <p className="text-lg font-medium mb-2">لا توجد تذكيرات</p>
        <p className="text-sm">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {reminders.map((reminder) => {
        const typeInfo = getReminderTypeInfo(reminder.type)!;
        const timeInfo = getTimeInfo(reminder.remindAt);
        const Icon = typeInfo.icon;

        return (
          <div
            key={reminder.id}
            className={cn(
              "border-b last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors",
              reminder.isCompleted && 'bg-green-50 dark:bg-green-900/10',
              reminder.isSnoozed && 'bg-yellow-50 dark:bg-yellow-900/10',
              timeInfo.urgent && !reminder.isCompleted && !reminder.isSnoozed && 'bg-red-50 dark:bg-red-900/10',
              bulkSelectMode && selectedReminderIds.includes(reminder.id) && 'bg-blue-50 dark:bg-blue-900/20'
            )}
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                {bulkSelectMode && (
                  <input
                    type="checkbox"
                    checked={selectedReminderIds.includes(reminder.id)}
                    onChange={() => onToggleSelect(reminder.id)}
                    className="mt-1"
                    aria-label={`تحديد تذكير ${reminder.title}`}
                  />
                )}

                <div
                  className={cn("p-2 rounded shrink-0", typeInfo.color)}
                  {...(reminder.color ? { style: { backgroundColor: reminder.color } } : {})}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn(
                          "font-medium text-lg",
                          reminder.isCompleted && "line-through text-gray-500"
                        )}>
                          {reminder.title}
                        </h3>

                        {reminder.isRecurring && (
                          <Repeat className="h-4 w-4 text-blue-500" />
                        )}
                      </div>

                      {reminder.message && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                          {reminder.message}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {typeInfo.label}
                        </Badge>

                        <Badge className={cn("text-xs", getPriorityColor(reminder.priority))}>
                          {getPriorityText(reminder.priority)}
                        </Badge>

                        <Badge
                          variant={timeInfo.urgent ? "destructive" : "outline"}
                          className="text-xs"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {format(new Date(reminder.remindAt), 'dd/MM HH:mm', { locale: ar })}
                        </Badge>

                        <Badge variant="outline" className={cn("text-xs", timeInfo.color)}>
                          {timeInfo.text}
                        </Badge>

                        {reminder.location && (
                          <Badge variant="outline" className="text-xs">
                            <MapPin className="h-3 w-3 mr-1" />
                            {reminder.location}
                          </Badge>
                        )}

                        {reminder.isCompleted && (
                          <Badge variant="default" className="text-xs bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            مكتمل
                          </Badge>
                        )}

                        {reminder.isSnoozed && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            مؤجل
                          </Badge>
                        )}
                      </div>

                      {reminder.tags && reminder.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {reminder.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {reminder.notes && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                          &quot;{reminder.notes}&quot;
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {!reminder.isCompleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onComplete(reminder.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}

                      {!reminder.isCompleted && timeInfo.urgent && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Clock className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {SNOOZE_OPTIONS.map(option => (
                              <DropdownMenuItem
                                key={option.minutes}
                                onClick={() => onSnooze(reminder.id, option.minutes)}
                              >
                                {option.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(reminder)}>
                            <Edit className="h-4 w-4 mr-2" />
                            تعديل
                          </DropdownMenuItem>

                          <DropdownMenuItem onClick={() => onDuplicate(reminder)}>
                            <Copy className="h-4 w-4 mr-2" />
                            نسخ
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => onDelete(reminder.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            حذف
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
