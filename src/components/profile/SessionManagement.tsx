'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/card";
import { Button } from "@/shared/button";
import { Badge } from "@/shared/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { Smartphone, Monitor, Tablet, MapPin, Clock, Edit, Trash2, RefreshCw, CheckCircle2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Session {
  id: string;
  deviceInfo: any;
  browser?: string;
  os?: string;
  device?: string;
  ip: string;
  location?: string;
  createdAt: string;
  lastAccessed: string;
  expiresAt: string;
  isActive: boolean;
  isCurrent: boolean;
  trusted?: boolean;
  deviceName?: string;
}

interface SessionManagementProps {
  userId: string;
}

export default function SessionManagement({ userId }: SessionManagementProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState('');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSessions();
    
    // Setup automatic token refresh check
    if (autoRefreshEnabled) {
      const interval = setInterval(() => {
        checkTokenRefresh();
      }, 60000); // Check every minute
      setRefreshInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [userId, autoRefreshEnabled]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      const response = await fetch('/api/auth/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        toast.error('فشل في تحميل الجلسات');
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('حدث خطأ أثناء تحميل الجلسات');
    } finally {
      setLoading(false);
    }
  };

  const checkTokenRefresh = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) return;

      // Check if token needs refresh (5 minutes before expiration)
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.accessToken) {
          localStorage.setItem('authToken', data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
          }
          // Silently refresh token without user notification
        }
      }
    } catch (error) {
      console.error('Token refresh check failed:', error);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== sessionId));
        toast.success('تم إنهاء الجلسة بنجاح');
      } else {
        toast.error('فشل في إنهاء الجلسة');
      }
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error('حدث خطأ أثناء إنهاء الجلسة');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('هل أنت متأكد من إنهاء جميع الجلسات الأخرى؟')) return;

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const currentSession = sessions.find(s => s.isCurrent);
        setSessions(currentSession ? [currentSession] : []);
        toast.success('تم إنهاء جميع الجلسات الأخرى بنجاح');
      } else {
        toast.error('فشل في إنهاء الجلسات');
      }
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      toast.error('حدث خطأ أثناء إنهاء الجلسات');
    }
  };

  const handleUpdateDeviceName = async (sessionId: string, name: string) => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceName: name }),
      });

      if (response.ok) {
        setSessions(sessions.map(s => 
          s.id === sessionId ? { ...s, deviceName: name } : s
        ));
        setEditingId(null);
        toast.success('تم تحديث اسم الجهاز');
      } else {
        toast.error('فشل في تحديث اسم الجهاز');
      }
    } catch (error) {
      console.error('Error updating device name:', error);
      toast.error('حدث خطأ أثناء تحديث اسم الجهاز');
    }
  };

  const getDeviceIcon = (deviceInfo: any) => {
    const device = deviceInfo?.device || '';
    if (device.toLowerCase().includes('mobile') || device.toLowerCase().includes('phone')) {
      return <Smartphone className="h-5 w-5" />;
    } else if (device.toLowerCase().includes('tablet')) {
      return <Tablet className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    const diffDays = Math.floor(diffHours / 24);
    return `منذ ${diffDays} يوم`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>إدارة الجلسات النشطة</CardTitle>
              <CardDescription>
                عرض وإدارة جميع الأجهزة المتصلة بحسابك. يمكنك تسمية الأجهزة وإنهاء الجلسات غير المرغوب فيها.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="auto-refresh" className="text-sm">تحديث تلقائي</Label>
              <input
                id="auto-refresh"
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
                className="w-4 h-4"
                aria-label="تفعيل التحديث التلقائي للتوكن"
                title="تفعيل التحديث التلقائي للتوكن"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessions.length > 1 && (
            <div className="flex justify-end mb-4">
              <Button
                variant="destructive"
                onClick={handleRevokeAllSessions}
                size="sm"
              >
                <Trash2 className="h-4 w-4 ml-2" />
                إنهاء جميع الجلسات الأخرى
              </Button>
            </div>
          )}

          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 rounded-lg border ${
                  session.isCurrent
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {getDeviceIcon(session.deviceInfo)}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {editingId === session.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={deviceName || session.deviceName || ''}
                              onChange={(e) => setDeviceName(e.target.value)}
                              placeholder="اسم الجهاز"
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                handleUpdateDeviceName(session.id, deviceName || session.deviceName || '');
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingId(null);
                                setDeviceName('');
                              }}
                            >
                              إلغاء
                            </Button>
                          </div>
                        ) : (
                          <>
                            <h4 className="font-medium">
                              {session.deviceName || 
                                `${session.deviceInfo?.browser || session.browser || 'متصفح غير معروف'} على ${session.deviceInfo?.os || session.os || 'نظام تشغيل غير معروف'}`}
                            </h4>
                            {session.isCurrent && (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="h-3 w-3 ml-1" />
                                الجلسة الحالية
                              </Badge>
                            )}
                          </>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{session.location || session.ip}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>آخر نشاط: {getTimeAgo(session.lastAccessed)}</span>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>عنوان IP: {session.ip}</p>
                        <p>تاريخ الإنشاء: {formatDate(session.createdAt)}</p>
                        <p>تنتهي في: {formatDate(session.expiresAt)}</p>
                        {session.deviceInfo && (
                          <p>
                            الجهاز: {session.deviceInfo.device || 'غير محدد'} | 
                            المتصفح: {session.deviceInfo.browser || session.browser || 'غير معروف'} | 
                            نظام التشغيل: {session.deviceInfo.os || session.os || 'غير معروف'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!session.isCurrent && editingId !== session.id && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(session.id);
                            setDeviceName(session.deviceName || '');
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokingId === session.id}
                        >
                          {revokingId === session.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {sessions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>لا توجد جلسات نشطة</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

