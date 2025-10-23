'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/card";
import { Badge } from "@/shared/badge";
import { Icons } from '@/components/ui/icons';

interface SecurityEvent {
  id: string;
  eventType: string;
  ip: string;
  userAgent: string;
  deviceInfo: any;
  location: string;
  createdAt: string;
}

const eventTypeLabels: Record<string, { label: string; color: string }> = {
  LOGIN_SUCCESS: { label: 'تسجيل دخول ناجح', color: 'bg-green-100 text-green-800' },
  TWO_FACTOR_REQUESTED: { label: 'مطلوب المصادقة الثنائية', color: 'bg-yellow-100 text-yellow-800' },
  TWO_FACTOR_SUCCESS: { label: 'المصادقة الثنائية ناجحة', color: 'bg-green-100 text-green-800' },
  LOGOUT: { label: 'تسجيل خروج', color: 'bg-blue-100 text-blue-800' },
  LOGOUT_ALL: { label: 'تسجيل خروج من جميع الأجهزة', color: 'bg-blue-100 text-blue-800' },
  default: { label: 'حدث أمان', color: 'bg-gray-100 text-gray-800' }
};

export default function SecurityLog() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSecurityEvents();
  }, []);

  const loadSecurityEvents = async () => {
    try {
      // In a real implementation, you would fetch from an API endpoint
      // For now, we'll use mock data to demonstrate the UI
      const mockEvents: SecurityEvent[] = [
        {
          id: '1',
          eventType: 'LOGIN_SUCCESS',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          deviceInfo: { browser: 'Chrome', os: 'Windows' },
          location: 'Cairo, Egypt',
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 minutes ago
        },
        {
          id: '2',
          eventType: 'TWO_FACTOR_REQUESTED',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          deviceInfo: { browser: 'Chrome', os: 'Windows' },
          location: 'Cairo, Egypt',
          createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString() // 35 minutes ago
        },
        {
          id: '3',
          eventType: 'LOGOUT',
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          deviceInfo: { browser: 'Chrome', os: 'Windows' },
          location: 'Cairo, Egypt',
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
        }
      ];
      
      setEvents(mockEvents);
    } catch (error) {
      console.error('Error loading security events:', error);
    } finally {
      setLoading(false);
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
        <CardTitle>سجل الأمان</CardTitle>
        <CardDescription>
          عرض الأحداث الأمنية الأخيرة لحسابك
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event) => {
            const eventType = eventTypeLabels[event.eventType] || eventTypeLabels.default;
            
            return (
              <div key={event.id} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={eventType.color}>
                        {eventType.label}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {new Date(event.createdAt).toLocaleString('ar-EG')}
                      </span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><span className="font-medium">الموقع:</span> {event.location}</p>
                      <p><span className="font-medium">عنوان IP:</span> {event.ip}</p>
                      <p>
                        <span className="font-medium">الجهاز:</span> 
                        {event.deviceInfo?.browser || 'متصفح غير معروف'} على {event.deviceInfo?.os || 'نظام تشغيل غير معروف'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {events.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>لا توجد أحداث أمنية</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}