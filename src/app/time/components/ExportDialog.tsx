'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileText, FileJson, Printer, Calendar } from 'lucide-react';
import { exportToCSV, exportToJSON, generatePDFReport, downloadFile, printPDFReport, type ExportData } from '../utils/exportUtils';
import { format, subDays, subWeeks, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Task, StudySession, Reminder } from '../types';

import { logger } from '@/lib/logger';

interface ExportDialogProps {
  tasks: Task[];
  studySessions: StudySession[];
  reminders: Reminder[];
}

export default function ExportDialog({ tasks, studySessions, reminders }: ExportDialogProps) {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [isExporting, setIsExporting] = useState(false);

  const getPeriodDates = () => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (period) {
      case 'week':
        start = startOfWeek(subWeeks(now, 1), { locale: ar });
        end = endOfWeek(now, { locale: ar });
        break;
      case 'month':
        start = subMonths(now, 1);
        end = now;
        break;
      case 'all':
        start = new Date(0); // Beginning of time
        end = now;
        break;
    }

    return { start, end };
  };

  const filterDataByPeriod = () => {
    const { start, end } = getPeriodDates();
    
    const filteredTasks = tasks.filter(task => {
      const taskDate = task.createdAt ? new Date(task.createdAt) : null;
      return !taskDate || (taskDate >= start && taskDate <= end);
    });

    const filteredSessions = studySessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= start && sessionDate <= end;
    });

    const filteredReminders = reminders.filter(reminder => {
      const reminderDate = new Date(reminder.remindAt);
      return reminderDate >= start && reminderDate <= end;
    });

    return { filteredTasks, filteredSessions, filteredReminders };
  };

  const handleExport = async (format: 'csv' | 'json' | 'pdf' | 'print') => {
    setIsExporting(true);
    try {
      const { start, end } = getPeriodDates();
      const { filteredTasks, filteredSessions, filteredReminders } = filterDataByPeriod();

      const exportData: ExportData = {
        tasks: filteredTasks,
        studySessions: filteredSessions,
        reminders: filteredReminders,
        exportDate: format(new Date(), 'yyyy-MM-dd HH:mm:ss', { locale: ar }),
        period: {
          start: format(start, 'yyyy-MM-dd', { locale: ar }),
          end: format(end, 'yyyy-MM-dd', { locale: ar })
        }
      };

      const filename = `time-management-${format}-${format(new Date(), 'yyyy-MM-dd')}`;

      switch (format) {
        case 'csv':
          const csvContent = exportToCSV(exportData);
          downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
          break;
        
        case 'json':
          const jsonContent = exportToJSON(exportData);
          downloadFile(jsonContent, `${filename}.json`, 'application/json');
          break;
        
        case 'pdf':
          const htmlContent = generatePDFReport(exportData);
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${filename}.html`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          break;
        
        case 'print':
          const printHtml = generatePDFReport(exportData);
          printPDFReport(printHtml);
          break;
      }
    } catch (error) {
      logger.error('Error exporting data:', error);
      alert('حدث خطأ أثناء التصدير. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExporting(false);
    }
  };

  const { start, end } = getPeriodDates();
  const { filteredTasks, filteredSessions, filteredReminders } = filterDataByPeriod();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          تصدير البيانات
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            تصدير بيانات إدارة الوقت
          </DialogTitle>
          <DialogDescription>
            اختر الفترة والصيغة لتصدير بياناتك
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Period Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              الفترة الزمنية
            </label>
            <Select value={period} onValueChange={(value: 'week' | 'month' | 'all') => setPeriod(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">الأسبوع الماضي</SelectItem>
                <SelectItem value="month">الشهر الماضي</SelectItem>
                <SelectItem value="all">جميع البيانات</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {format(start, 'yyyy-MM-dd', { locale: ar })} إلى {format(end, 'yyyy-MM-dd', { locale: ar })}
            </p>
          </div>

          {/* Data Summary */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium mb-2">ملخص البيانات:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• {filteredTasks.length} مهمة</li>
              <li>• {filteredSessions.length} جلسة مذاكرة</li>
              <li>• {filteredReminders.length} تذكير</li>
            </ul>
          </div>

          {/* Export Options */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              CSV
            </Button>
            
            <Button
              onClick={() => handleExport('json')}
              disabled={isExporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileJson className="h-4 w-4" />
              JSON
            </Button>
            
            <Button
              onClick={() => handleExport('pdf')}
              disabled={isExporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              PDF (HTML)
            </Button>
            
            <Button
              onClick={() => handleExport('print')}
              disabled={isExporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              طباعة
            </Button>
          </div>

          {isExporting && (
            <p className="text-sm text-center text-muted-foreground">
              جاري التصدير...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

