'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle2, XCircle, Shield, Lock, Key, Mail, Bell } from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { logger } from '@/lib/logger';

interface SecurityEvent {
  id: string;
  eventType: string;
  ip: string;
  userAgent: string;
  deviceInfo?: any;
  location?: string;
  metadata?: any;
  createdAt: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

interface SecurityLogsProps {
  userId: string;
}

const eventTypeLabels: Record<string, { label: string; color: string; icon: any }> = {
  LOGIN_SUCCESS: { label: 'تسجيل دخول ناجح', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  LOGIN_FAILED: { label: 'محاولة تسجيل دخول فاشلة', color: 'bg-red-100 text-red-800', icon: XCircle },
  LOGIN_NEW_DEVICE: { label: 'تسجيل دخول من جهاز جديد', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  LOGOUT: { label: 'تسجيل خروج', color: 'bg-blue-100 text-blue-800', icon: Key },
  LOGOUT_ALL: { label: 'تسجيل خروج من جميع الأجهزة', color: 'bg-blue-100 text-blue-800', icon: Key },
  PASSWORD_CHANGED: { label: 'تغيير كلمة المرور', color: 'bg-purple-100 text-purple-800', icon: Lock },
  PASSWORD_RESET_REQUESTED: { label: 'طلب إعادة تعيين كلمة المرور', color: 'bg-orange-100 text-orange-800', icon: Mail },
  TWO_FACTOR_ENABLED: { label: 'تفعيل المصادقة الثنائية', color: 'bg-green-100 text-green-800', icon: Shield },
  TWO_FACTOR_DISABLED: { label: 'تعطيل المصادقة الثنائية', color: 'bg-red-100 text-red-800', icon: Shield },
  TWO_FACTOR_SUCCESS: { label: 'المصادقة الثنائية ناجحة', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  TWO_FACTOR_FAILED: { label: 'فشل المصادقة الثنائية', color: 'bg-red-100 text-red-800', icon: XCircle },
  SECURITY_ALERT: { label: 'تنبيه أمني', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  SUSPICIOUS_ACTIVITY: { label: 'نشاط مشبوه', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  IP_WHITELIST_ADDED: { label: 'إضافة IP للقائمة البيضاء', color: 'bg-blue-100 text-blue-800', icon: Shield },
  IP_WHITELIST_REMOVED: { label: 'إزالة IP من القائمة البيضاء', color: 'bg-orange-100 text-orange-800', icon: Shield },
};

export default function SecurityLogs({ userId }: SecurityLogsProps) {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasNotifications, setHasNotifications] = useState(false);

  useEffect(() => {
    loadSecurityEvents();
    checkForNewAlerts();
    
    // Setup polling for new security alerts
    const interval = setInterval(() => {
      checkForNewAlerts();
      loadSecurityEvents();
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, filter]);

  const loadSecurityEvents = useCallback(async () => {
    try {
      setLoading(true);
      // Token is in httpOnly cookie - no need to send Authorization header
      
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('eventType', filter);
      }
      params.append('limit', '50');

      const response = await fetch(`/api/auth/security-logs?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setEvents(data.logs || []);
      } else {
        logger.error('Failed to load security events');
      }
    } catch (error) {
      logger.error('Error loading security events:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const checkForNewAlerts = useCallback(async () => {
    try {
      // Token is in httpOnly cookie - no need to send Authorization header
      const response = await fetch('/api/auth/security-logs?eventType=SECURITY_ALERT&limit=1', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const recentAlerts = data.logs?.filter((log: SecurityEvent) => {
          const alertTime = new Date(log.createdAt).getTime();
          const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
          return alertTime > fiveMinutesAgo;
        });
        
        if (recentAlerts && recentAlerts.length > 0) {
          setHasNotifications(true);
          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            new Notification('تنبيه أمني', {
              body: 'تم اكتشاف نشاط أمني جديد في حسابك',
              icon: '/icon-192x192.png',
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error checking for alerts:', error);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const filteredEvents = events.filter(event => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        event.ip.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query) ||
        event.eventType.toLowerCase().includes(query) ||
        eventTypeLabels[event.eventType]?.label.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRiskLevelBadge = (riskLevel?: string) => {
    if (!riskLevel) return null;
    
    const colors: Record<string, string> = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };

    const labels: Record<string, string> = {
      low: 'منخفض',
      medium: 'متوسط',
      high: 'عالي',
      critical: 'حرج',
    };

    return (
      <Badge className={colors[riskLevel] || 'bg-gray-100 text-gray-800'}>
        {labels[riskLevel] || riskLevel}
      </Badge>
    );
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
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                السجلات الأمنية
                {hasNotifications && (
                  <Badge className="bg-red-500 text-white animate-pulse">
                    تنبيهات جديدة
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                سجل شامل لجميع الأحداث الأمنية في حسابك. يتم تسجيل جميع محاولات تسجيل الدخول، تغييرات كلمة المرور، وتفعيل/إلغاء المصادقة الثنائية.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="بحث في السجلات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="تصفية حسب النوع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأحداث</SelectItem>
                <SelectItem value="LOGIN_SUCCESS">تسجيلات دخول ناجحة</SelectItem>
                <SelectItem value="LOGIN_FAILED">محاولات فاشلة</SelectItem>
                <SelectItem value="LOGIN_NEW_DEVICE">أجهزة جديدة</SelectItem>
                <SelectItem value="TWO_FACTOR_ENABLED">تفعيل 2FA</SelectItem>
                <SelectItem value="TWO_FACTOR_DISABLED">تعطيل 2FA</SelectItem>
                <SelectItem value="PASSWORD_CHANGED">تغيير كلمة المرور</SelectItem>
                <SelectItem value="SECURITY_ALERT">تنبيهات أمنية</SelectItem>
                <SelectItem value="SUSPICIOUS_ACTIVITY">نشاط مشبوه</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-3">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => {
                const eventType = eventTypeLabels[event.eventType] || {
                  label: event.eventType,
                  color: 'bg-gray-100 text-gray-800',
                  icon: Shield,
                };
                const Icon = eventType.icon;

                return (
                  <div
                    key={event.id}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${eventType.color.replace('text-', 'bg-').replace('bg-', 'bg-').split(' ')[0]}/10`}>
                          <Icon className={`h-5 w-5 ${eventType.color.split(' ')[1] || 'text-gray-800'}`} />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={eventType.color}>
                              {eventType.label}
                            </Badge>
                            {getRiskLevelBadge(event.riskLevel)}
                            <span className="text-sm text-muted-foreground">
                              {formatDate(event.createdAt)}
                            </span>
                          </div>
                          <div className="text-sm space-y-1">
                            {event.location && (
                              <p>
                                <span className="font-medium">الموقع:</span> {event.location}
                              </p>
                            )}
                            <p>
                              <span className="font-medium">عنوان IP:</span> {event.ip}
                            </p>
                            {event.deviceInfo && (
                              <p>
                                <span className="font-medium">الجهاز:</span>{' '}
                                {event.deviceInfo.browser || 'متصفح غير معروف'} على{' '}
                                {event.deviceInfo.os || 'نظام تشغيل غير معروف'}
                              </p>
                            )}
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs text-muted-foreground">
                                  تفاصيل إضافية
                                </summary>
                                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                                  {JSON.stringify(event.metadata, null, 2)}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد أحداث أمنية لعرضها</p>
              </div>
            )}
          </div>

          {filteredEvents.length >= 50 && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={() => loadSecurityEvents()}>
                تحميل المزيد
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

