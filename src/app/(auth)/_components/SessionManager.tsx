'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
// import { useEnhancedAuth } from '@/lib/auth-hook-enhanced';
import { LogOut, Monitor, Smartphone, Tablet, Globe, Shield, RefreshCw, Loader2 } from 'lucide-react';

interface DeviceInfo {
  browser?: string;
  os?: string;
  device?: string;
  platform?: string;
}

interface Session {
  id: string;
  userAgent: string;
  ip: string;
  deviceInfo: DeviceInfo | null;
  createdAt: string;
  expiresAt: string;
  lastAccessed: string;
  isActive: boolean;
  isCurrent: boolean;
  location?: {
    city?: string;
    country?: string;
  };
}

// Get device icon based on device type
function getDeviceIcon(deviceInfo: DeviceInfo | null) {
  if (!deviceInfo?.device) return <Globe className="h-5 w-5" />;
  
  const device = deviceInfo.device.toLowerCase();
  if (device.includes('mobile') || device.includes('phone')) {
    return <Smartphone className="h-5 w-5" />;
  }
  if (device.includes('tablet') || device.includes('ipad')) {
    return <Tablet className="h-5 w-5" />;
  }
  return <Monitor className="h-5 w-5" />;
}

export default function SessionManager() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  // const auth = useEnhancedAuth(); // Removed unused auth hook
  
  // Fetch user sessions from API
  const getUserSessions = useCallback(async (): Promise<Session[]> => {
    try {
      const response = await fetch('/api/auth/sessions');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      return await response.json();
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }, []);
  
  // Revoke a single session
  const revokeSession = async (sessionId: string) => {
    const response = await fetch(`/api/auth/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to revoke session');
  };

  // Revoke all other sessions
  const revokeAllOtherSessions = async () => {
    const response = await fetch('/api/auth/sessions/revoke-all', {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to revoke sessions');
    return await response.json();
  };

  // Load sessions
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserSessions();
      setSessions(data);
    } catch (error) {
      toast.error('فشل في تحميل الجلسات');
    } finally {
      setLoading(false);
    }
  }, [getUserSessions]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Handle single session revoke
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

  // Handle revoke all other sessions
  const handleRevokeAllOthers = async () => {
    const otherSessions = sessions.filter(s => !s.isCurrent);
    if (otherSessions.length === 0) {
      toast.info('لا توجد جلسات أخرى لإنهائها');
      return;
    }

    try {
      setRevokingAll(true);
      await revokeAllOtherSessions();
      setSessions(sessions.filter(session => session.isCurrent));
      toast.success(`تم إنهاء ${otherSessions.length} جلسة بنجاح`, {
        description: 'جميع الأجهزة الأخرى تم تسجيل خروجها',
      });
    } catch (error) {
      toast.error('فشل في إنهاء الجلسات');
    } finally {
      setRevokingAll(false);
    }
  };

  // Count other sessions
  const otherSessionsCount = sessions.filter(s => !s.isCurrent).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            إدارة الجلسات
          </CardTitle>
          <CardDescription className="mt-1.5">
            عرض وإدارة الأجهزة المتصلة بحسابك
            {sessions.length > 0 && (
              <span className="mr-2 inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-300">
                {sessions.length} جلسة نشطة
              </span>
            )}
          </CardDescription>
        </div>
        <div className="flex gap-2">
          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadSessions}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          {/* Revoke All Button */}
          {otherSessionsCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={revokingAll}
                  className="gap-2"
                >
                  {revokingAll ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  إنهاء الجلسات الأخرى ({otherSessionsCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>تأكيد إنهاء جميع الجلسات الأخرى</AlertDialogTitle>
                  <AlertDialogDescription className="text-right">
                    سيتم تسجيل الخروج من جميع الأجهزة الأخرى ({otherSessionsCount} جهاز). 
                    ستبقى هذه الجلسة الحالية نشطة فقط.
                    <br /><br />
                    <strong>هل أنت متأكد من هذا الإجراء؟</strong>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2">
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRevokeAllOthers}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    نعم، إنهاء الجلسات
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((session) => (
            <div 
              key={session.id} 
              className={`p-4 rounded-lg border transition-all duration-200 ${
                session.isCurrent 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-sm' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                {/* Device Icon */}
                <div className={`flex-shrink-0 p-2 rounded-full ${
                  session.isCurrent 
                    ? 'bg-green-100 dark:bg-green-800/30 text-green-600 dark:text-green-400' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}>
                  {getDeviceIcon(session.deviceInfo)}
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium truncate">
                      {session.deviceInfo?.browser || 'متصفح غير معروف'} على {session.deviceInfo?.os || 'نظام تشغيل غير معروف'}
                    </span>
                    {session.isCurrent && (
                      <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-800/40 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
                        ✓ الجلسة الحالية
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 space-y-0.5">
                    <p className="flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5" />
                      <span>عنوان IP: {session.ip}</span>
                      {session.location?.city && (
                        <span className="text-gray-400">
                          • {session.location.city}، {session.location.country}
                        </span>
                      )}
                    </p>
                    <p>آخر نشاط: {new Date(session.lastAccessed).toLocaleString('ar-EG')}</p>
                    <p className="text-xs text-gray-400">
                      تنتهي في: {new Date(session.expiresAt).toLocaleString('ar-EG')}
                    </p>
                  </div>
                </div>

                {/* Revoke Button */}
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokingId === session.id}
                    className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {revokingId === session.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <LogOut className="h-4 w-4 mr-1" />
                        إنهاء
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          {sessions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Monitor className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="font-medium">لا توجد جلسات نشطة</p>
              <p className="text-sm text-gray-400">ستظهر الجلسات النشطة هنا</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
