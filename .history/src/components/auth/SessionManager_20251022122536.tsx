'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/card';
import { toast } from 'sonner';
import { Icons } from '@/components/ui/icons';
import { useEnhancedAuth } from '@/lib/auth-hook-enhanced';

interface Session {
  id: string;
  userAgent: string;
  ip: string;
  deviceInfo: any;
  createdAt: string;
  expiresAt: string;
  lastAccessed: string;
  isActive: boolean;
  isCurrent: boolean;
}

export default function SessionManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const { getUserSessions, revokeSession } = useEnhancedAuth();

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const data = await getUserSessions();
      setSessions(data);
    } catch (error) {
      toast.error('فشل في تحميل الجلسات');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      setRevokingId(sessionId);
      await revokeSession(sessionId);
      setSessions(sessions.filter(session => session.id !== sessionId));
      toast.success('تم إنهاء الجلسة بنجاح');
    } catch (error) {
      toast.error('فشل في إنهاء الجلسة');
    } finally {
      setRevokingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>إدارة الجلسات</CardTitle>
        <CardDescription>
          عرض وإدارة الأجهزة المتصلة بحسابك
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {session.deviceInfo?.browser || 'متصفح غير معروف'} على {session.deviceInfo?.os || 'نظام تشغيل غير معروف'}
                    </span>
                    {session.isCurrent && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        الجلسة الحالية
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    <p>عنوان IP: {session.ip}</p>
                    <p>آخر نشاط: {new Date(session.lastAccessed).toLocaleString('ar-EG')}</p>
                    <p>تنتهي في: {new Date(session.expiresAt).toLocaleString('ar-EG')}</p>
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokingId === session.id}
                  >
                    {revokingId === session.id ? (
                      <Icons.spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      'إنهاء الجلسة'
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          {sessions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>لا توجد جلسات نشطة</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}