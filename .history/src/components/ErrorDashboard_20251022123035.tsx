import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../shared/card';
import { Button } from '../shared/button';
import { Badge } from '../shared/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { AlertCircle, CheckCircle, Clock, Download, Trash2, Filter, X } from 'lucide-react';
import errorLogger, { ErrorLogEntry } from '../services/ErrorLogger';

interface ErrorDashboardProps {
  onClose?: () => void;
}

const ErrorDashboard: React.FC<ErrorDashboardProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<ErrorLogEntry | null>(null);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'low' | 'medium' | 'high' | 'critical'>('all');

  // Load logs on component mount
  useEffect(() => {
    setLogs(errorLogger.getLogs());
  }, []);

  // Refresh logs
  const refreshLogs = () => {
    setLogs(errorLogger.getLogs());
  };

  // Handle marking a log as resolved
  const handleMarkAsResolved = (errorId: string) => {
    errorLogger.markAsResolved(errorId);
    refreshLogs();
    setSelectedLog(null);
  };

  // Handle clearing all logs
  const handleClearLogs = () => {
    if (confirm('هل أنت متأكد من أنك تريد حذف جميع سجلات الأخطاء؟')) {
      errorLogger.clearLogs();
      refreshLogs();
      setSelectedLog(null);
    }
  };

  // Handle exporting logs
  const handleExportLogs = () => {
    const logsJson = errorLogger.exportLogs();
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filter logs based on current filter
  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'unresolved') return !log.resolved;
    return log.severity === filter;
  });

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ar-SA');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">لوحة تحكم الأخطاء</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshLogs}>
              تحديث
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportLogs}>
              <Download className="ml-2 h-4 w-4" />
              تصدير
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearLogs}>
              <Trash2 className="ml-2 h-4 w-4" />
              حذف الكل
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-1/3 border-r overflow-y-auto">
            <div className="p-4">
              <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="all">الكل</TabsTrigger>
                  <TabsTrigger value="unresolved">غير محلولة</TabsTrigger>
                  <TabsTrigger value="high">عالية</TabsTrigger>
                </TabsList>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="medium">متوسطة</TabsTrigger>
                  <TabsTrigger value="critical">حرجة</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-2">
                {filteredLogs.length === 0 ? (
                  <p className="text-center text-gray-500 py-4">لا توجد أخطاء</p>
                ) : (
                  filteredLogs.map((log) => (
                    <Card
                      key={log.id}
                      className={`cursor-pointer transition-colors ${
                        selectedLog?.id === log.id ? 'bg-blue-50 border-blue-200' : ''
                      } ${log.resolved ? 'opacity-60' : ''}`}
                      onClick={() => setSelectedLog(log)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            {log.resolved ? (
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium line-clamp-2">{log.message}</p>
                              <p className="text-xs text-gray-500 mt-1">{formatDate(log.timestamp)}</p>
                            </div>
                          </div>
                          <Badge className={getSeverityColor(log.severity)}>
                            {log.severity}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedLog ? (
              <div className="p-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{selectedLog.message}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(selectedLog.timestamp)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(selectedLog.severity)}>
                          {selectedLog.severity}
                        </Badge>
                        {selectedLog.resolved ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle className="ml-1 h-3 w-3" />
                            تم الحل
                          </Badge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkAsResolved(selectedLog.id)}
                          >
                            <CheckCircle className="ml-1 h-3 w-3" />
                            علامة كـ "تم الحل"
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">معلومات الخطأ</h4>
                      <div className="bg-gray-50 p-3 rounded-md text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="font-medium">المصدر:</span> {selectedLog.source}
                          </div>
                          <div>
                            <span className="font-medium">الجلسة:</span> {selectedLog.sessionId}
                          </div>
                          <div>
                            <span className="font-medium">معرّف الخطأ:</span> {selectedLog.id}
                          </div>
                          <div>
                            <span className="font-medium">URL:</span> {selectedLog.url}
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedLog.stack && (
                      <div>
                        <h4 className="font-medium mb-2">تتبع المكدس (Stack Trace)</h4>
                        <div className="bg-gray-50 p-3 rounded-md text-xs overflow-auto max-h-40">
                          <pre className="whitespace-pre-wrap">{selectedLog.stack}</pre>
                        </div>
                      </div>
                    )}

                    {selectedLog.additionalData && Object.keys(selectedLog.additionalData).length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">بيانات إضافية</h4>
                        <div className="bg-gray-50 p-3 rounded-md text-sm">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(selectedLog.additionalData, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">اختر خطأ لعرض التفاصيل</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDashboard;
