'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { Laptop, Smartphone, Tablet, Monitor, Trash2, ShieldAlert } from "lucide-react";
import { logger } from '@/lib/logger';

interface UserSession {
  id: string;
  ip: string;
  userAgent: string;
  browser: string;
  os: string;
  deviceType: string;
  lastActive: string;
  isActive: boolean;
  location?: string;
}

export default function ActiveSessions() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/sessions', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setSessions(data.data || data || []);
      } else {
        logger.error('Failed to load active sessions');
      }
    } catch (error) {
      logger.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        toast.success('تم إنهاء الجلسة بنجاح');
        setSessions(sessions.filter((s) => s.id !== sessionId));
      } else {
        toast.error('فشل في إنهاء الجلسة');
      }
    } catch (error) {
      logger.error('Error revoking session:', error);
      toast.error('حدث خطأ أثناء إنهاء الجلسة');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!confirm('هل أنت متأكد من رغبتك في تسجيل الخروج من جميع الأجهزة والجلسات الأخرى؟')) {
      return;
    }
    setRevokingAll(true);
    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        toast.success('تم تسجيل الخروج من جميع الأجهزة الأخرى بنجاح');
        loadSessions(); // Reload list
      } else {
        toast.error('فشل تسجيل الخروج من الأجهزة الأخرى');
      }
    } catch (error) {
      logger.error('Error revoking all sessions:', error);
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    } finally {
      setRevokingAll(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="h-5 w-5 text-muted-foreground" />;
      case 'tablet':
        return <Tablet className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Laptop className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'نشط الآن';
    return new Date(dateString).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7 flex-wrap gap-4">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            الأجهزة النشطة وجلسات تسجيل الدخول
          </CardTitle>
          <CardDescription className="mt-1">
            إدارة ومراقبة الأجهزة النشطة حالياً التي تستخدم حسابك. يمكنك تسجيل الخروج من أي جهاز غير معروف.
          </CardDescription>
        </div>
        {sessions.length > 1 && (
          <Button
            variant="destructive"
            size="sm"
            disabled={revokingAll}
            onClick={handleRevokeAllSessions}
            className="font-bold bg-red-600 hover:bg-red-700 text-white"
          >
            {revokingAll ? 'جاري التسجيل...' : 'تسجيل الخروج من كل الأجهزة الأخرى'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 mt-1">
                    {getDeviceIcon(session.deviceType)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-base">
                        {session.os || 'نظام تشغيل غير معروف'} - {session.browser || 'متصفح غير معروف'}
                      </span>
                      {session.isActive && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                          هذا الجهاز حالياً
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <p>عنوان IP: {session.ip}</p>
                      {session.location && <p>الموقع: {session.location}</p>}
                      <p>آخر نشاط: {formatDate(session.lastActive)}</p>
                    </div>
                  </div>
                </div>
                {!session.isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={revokingId === session.id}
                    onClick={() => handleRevokeSession(session.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-95 transition-all shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldAlert className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد جلسات نشطة لعرضها</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
