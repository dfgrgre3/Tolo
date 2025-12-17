'use client';

/**
 * 🗺️ GeoActivityMap - خريطة النشاط الجغرافية
 * 
 * تعرض خريطة تفاعلية لمواقع تسجيل الدخول
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Globe,
  Clock,
  AlertTriangle,
  CheckCircle,
  Monitor,
  Smartphone,
  Loader2,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getGeoLocationService } from '@/lib/security/geo/geo-location-service';
import type { GeoLocation, GeoLocationSession } from '@/lib/security/geo/geo-location-service';
import { logger } from '@/lib/logger';

// Dynamically import map components (Leaflet requires window)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
) as React.ComponentType<any>;
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
) as React.ComponentType<any>;
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
) as React.ComponentType<any>;
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
) as React.ComponentType<any>;
const Circle = dynamic(
  () => import('react-leaflet').then((mod) => mod.Circle),
  { ssr: false }
) as React.ComponentType<any>;

interface GeoActivityMapProps {
  sessions?: GeoLocationSession[];
  showAllLocations?: boolean;
  height?: string;
  className?: string;
}

// Default sessions for demo
const DEFAULT_SESSIONS: GeoLocationSession[] = [];

export function GeoActivityMap({
  sessions = DEFAULT_SESSIONS,
  showAllLocations = true,
  height = '400px',
  className,
}: GeoActivityMapProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedSession, setSelectedSession] = useState<GeoLocationSession | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [activeSessions, setActiveSessions] = useState<GeoLocationSession[]>(sessions);
  
  const geoService = getGeoLocationService();

  // Load sessions from API
  useEffect(() => {
    const loadSessions = async () => {
      setLoadingSessions(true);
      try {
        const response = await fetch('/api/auth/sessions/geo');
        if (response.ok) {
          const data = await response.json();
          setActiveSessions(data.sessions || []);
        }
      } catch (error) {
        logger.error('Failed to load geo sessions:', error);
      } finally {
        setLoadingSessions(false);
        setIsLoaded(true);
      }
    };

    loadSessions();
  }, []);

  // Calculate map center
  const mapCenter = useMemo(() => {
    if (activeSessions.length === 0) {
      return { lat: 25, lng: 45 }; // Default to Middle East
    }

    const validSessions = activeSessions.filter(
      s => s.location.lat !== 0 && s.location.lng !== 0
    );

    if (validSessions.length === 0) {
      return { lat: 25, lng: 45 };
    }

    const avgLat = validSessions.reduce((sum, s) => sum + s.location.lat, 0) / validSessions.length;
    const avgLng = validSessions.reduce((sum, s) => sum + s.location.lng, 0) / validSessions.length;

    return { lat: avgLat, lng: avgLng };
  }, [activeSessions]);

  // Get unique countries
  const uniqueCountries = useMemo(() => {
    const countries = new Set(activeSessions.map(s => s.location.country));
    return Array.from(countries);
  }, [activeSessions]);

  // Get suspicious sessions
  const suspiciousSessions = useMemo(() => {
    return activeSessions.filter(s => s.isSuspicious);
  }, [activeSessions]);

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  if (!isLoaded || loadingSessions) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            خريطة النشاط
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="flex items-center justify-center bg-muted/50 rounded-lg"
            style={{ height }}
          >
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              خريطة النشاط الجغرافية
            </CardTitle>
            <CardDescription className="mt-1">
              مواقع تسجيل الدخول إلى حسابك
            </CardDescription>
          </div>
          
          {/* Stats badges */}
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <MapPin className="h-3 w-3" />
              {activeSessions.length} جلسة
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Globe className="h-3 w-3" />
              {uniqueCountries.length} دولة
            </Badge>
            {suspiciousSessions.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {suspiciousSessions.length} مشبوهة
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Map */}
        <div 
          className="rounded-lg overflow-hidden border relative"
          style={{ height }}
        >
          {typeof window !== 'undefined' && (
            <MapContainer
              center={[mapCenter.lat, mapCenter.lng]}
              zoom={3}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {activeSessions.map((session) => (
                session.location.lat !== 0 && (
                  <Marker
                    key={session.sessionId}
                    position={[session.location.lat, session.location.lng]}
                    eventHandlers={{
                      click: () => setSelectedSession(session),
                    }}
                  >
                    <Popup>
                      <div className="text-sm space-y-1 min-w-[200px]">
                        <div className="font-bold flex items-center gap-1">
                          {geoService.getCountryFlag(session.location.countryCode)}
                          {session.location.city}, {session.location.country}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(session.timestamp)}
                        </div>
                        {session.device && (
                          <div className="text-muted-foreground flex items-center gap-1">
                            <Monitor className="h-3 w-3" />
                            {session.device}
                          </div>
                        )}
                        {session.isCurrentSession && (
                          <Badge variant="secondary" className="mt-1">
                            الجلسة الحالية
                          </Badge>
                        )}
                        {session.isSuspicious && (
                          <Badge variant="destructive" className="mt-1">
                            نشاط مشبوه
                          </Badge>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}

              {/* Highlight suspicious areas */}
              {suspiciousSessions.map((session) => (
                session.location.lat !== 0 && (
                  <Circle
                    key={`circle-${session.sessionId}`}
                    center={[session.location.lat, session.location.lng]}
                    radius={50000}
                    pathOptions={{
                      color: 'red',
                      fillColor: 'red',
                      fillOpacity: 0.1,
                    }}
                  />
                )
              ))}
            </MapContainer>
          )}

          {/* Current location indicator */}
          {activeSessions.some(s => s.isCurrentSession) && (
            <div className="absolute bottom-4 left-4 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>موقعك الحالي</span>
              </div>
            </div>
          )}
        </div>

        {/* Session list */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              قائمة الجلسات ({activeSessions.length})
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 mt-2 max-h-[300px] overflow-y-auto">
                  {activeSessions.map((session) => (
                    <div
                      key={session.sessionId}
                      className={cn(
                        'p-3 rounded-lg border flex items-center justify-between',
                        session.isCurrentSession && 'bg-green-50 dark:bg-green-900/20 border-green-200',
                        session.isSuspicious && 'bg-red-50 dark:bg-red-900/20 border-red-200'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {geoService.getCountryFlag(session.location.countryCode)}
                        </span>
                        <div>
                          <p className="font-medium text-sm">
                            {session.location.city}, {session.location.country}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(session.timestamp)}
                            {session.device && (
                              <>
                                <span className="mx-1">•</span>
                                {session.device}
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {session.isCurrentSession && (
                          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            الحالية
                          </Badge>
                        )}
                        {session.isSuspicious && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            مشبوهة
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}

                  {activeSessions.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>لا توجد جلسات مسجلة</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}

export default GeoActivityMap;
