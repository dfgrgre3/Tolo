/**
 * Login Analytics Service
 * خدمة تحليلات تسجيل الدخول
 */

import { prisma } from './prisma';

export interface LoginAnalytics {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  uniqueUsers: number;
  averageLoginTime: number;
  topDevices: Array<{ device: string; count: number }>;
  topLocations: Array<{ location: string; count: number }>;
  loginByHour: Array<{ hour: number; count: number }>;
  loginByDay: Array<{ day: string; count: number }>;
  authMethodBreakdown: {
    email: number;
    google: number;
    facebook: number;
    magicLink: number;
    biometric: number;
  };
}

export interface LoginStatistics {
  period: 'day' | 'week' | 'month' | 'year' | 'all';
  startDate?: Date;
  endDate?: Date;
}

/**
 * Get login analytics
 */
export async function getLoginAnalytics(
  userId?: string,
  statistics: LoginStatistics = { period: 'month' }
): Promise<LoginAnalytics> {
  // Calculate date range
  const now = new Date();
  let startDate: Date;

  switch (statistics.period) {
    case 'day':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      startDate = new Date(0);
  }

  const whereClause: any = {
    createdAt: {
      gte: statistics.startDate || startDate,
      ...(statistics.endDate && { lte: statistics.endDate }),
    },
  };

  if (userId) {
    whereClause.userId = userId;
  }

  // Get all login events
  const loginEvents = await prisma.securityLog.findMany({
    where: {
      ...whereClause,
      eventType: {
        in: [
          'LOGIN_SUCCESS',
          'LOGIN_FAILED',
          'BIOMETRIC_LOGIN_SUCCESS',
          'MAGIC_LINK_USED',
        ],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Calculate statistics
  const successfulLogins = loginEvents.filter(
    (e) => e.eventType === 'LOGIN_SUCCESS' || 
           e.eventType === 'BIOMETRIC_LOGIN_SUCCESS' || 
           e.eventType === 'MAGIC_LINK_USED'
  ).length;
  
  const failedLogins = loginEvents.filter(
    (e) => e.eventType === 'LOGIN_FAILED'
  ).length;

  const uniqueUsers = new Set(
    loginEvents.map((e) => e.userId)
  ).size;

  // Parse device info and location from metadata
  const deviceCounts: Record<string, number> = {};
  const locationCounts: Record<string, number> = {};
  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<string, number> = {};
  const authMethodCounts = {
    email: 0,
    google: 0,
    facebook: 0,
    magicLink: 0,
    biometric: 0,
  };

  loginEvents.forEach((event) => {
    // Device info
    try {
      const metadata = event.deviceInfo ? JSON.parse(event.deviceInfo) : {};
      const device = metadata.browser
        ? `${metadata.browser} على ${metadata.os || 'غير معروف'}`
        : 'غير معروف';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    } catch {
      deviceCounts['غير معروف'] = (deviceCounts['غير معروف'] || 0) + 1;
    }

    // Location
    try {
      const metadata = event.deviceInfo ? JSON.parse(event.deviceInfo) : {};
      const location = event.location || metadata.location || 'غير معروف';
      locationCounts[location] = (locationCounts[location] || 0) + 1;
    } catch {
      locationCounts['غير معروف'] = (locationCounts['غير معروف'] || 0) + 1;
    }

    // Hour distribution
    const hour = new Date(event.createdAt).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;

    // Day distribution
    const day = new Date(event.createdAt).toLocaleDateString('ar-EG');
    dayCounts[day] = (dayCounts[day] || 0) + 1;

    // Auth method
    if (event.eventType === 'BIOMETRIC_LOGIN_SUCCESS') {
      authMethodCounts.biometric++;
    } else if (event.eventType === 'MAGIC_LINK_USED') {
      authMethodCounts.magicLink++;
    } else if (event.eventType === 'LOGIN_SUCCESS') {
      // Try to determine method from metadata
      try {
        const metadata = event.metadata ? JSON.parse(event.metadata) : {};
        if (metadata.provider === 'google') {
          authMethodCounts.google++;
        } else if (metadata.provider === 'facebook') {
          authMethodCounts.facebook++;
        } else {
          authMethodCounts.email++;
        }
      } catch {
        authMethodCounts.email++;
      }
    }
  });

  // Convert to arrays and sort
  const topDevices = Object.entries(deviceCounts)
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topLocations = Object.entries(locationCounts)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const loginByHour = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: hourCounts[i] || 0,
  }));

  const loginByDay = Object.entries(dayCounts)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());

  return {
    totalLogins: loginEvents.length,
    successfulLogins,
    failedLogins,
    uniqueUsers,
    averageLoginTime: 0, // Would need to track login duration
    topDevices,
    topLocations,
    loginByHour,
    loginByDay,
    authMethodBreakdown: authMethodCounts,
  };
}

/**
 * Get login trends
 */
export async function getLoginTrends(
  userId?: string,
  days: number = 30
): Promise<Array<{ date: string; success: number; failed: number }>> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const whereClause: any = {
    createdAt: {
      gte: startDate,
    },
  };

  if (userId) {
    whereClause.userId = userId;
  }

  const events = await prisma.securityLog.findMany({
    where: {
      ...whereClause,
      eventType: {
        in: ['LOGIN_SUCCESS', 'LOGIN_FAILED'],
      },
    },
  });

  const trends: Record<string, { success: number; failed: number }> = {};

  events.forEach((event) => {
    const date = new Date(event.createdAt).toLocaleDateString('ar-EG');
    if (!trends[date]) {
      trends[date] = { success: 0, failed: 0 };
    }
    if (event.eventType === 'LOGIN_SUCCESS') {
      trends[date].success++;
    } else {
      trends[date].failed++;
    }
  });

  return Object.entries(trends)
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

