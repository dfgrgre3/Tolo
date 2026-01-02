'use client';

/**
 * 📱 QRLoginWidget - ويدجت تسجيل الدخول عبر QR Code
 * 
 * يعرض QR Code للمسح من تطبيق الموبايل
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode,
  Smartphone,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Clock,
  Shield,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logger } from '@/lib/logger';

type QRStatus = 'loading' | 'ready' | 'scanned' | 'confirmed' | 'expired' | 'error';

interface QRLoginWidgetProps {
  onSuccess?: (userId: string, sessionId: string) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  size?: number;
  showInstructions?: boolean;
  className?: string;
}

export function QRLoginWidget({
  onSuccess,
  onError,
  onExpire,
  size = 200,
  showInstructions = true,
  className,
}: QRLoginWidgetProps) {
  const [status, setStatus] = useState<QRStatus>('loading');
  const [qrData, setQrData] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(300);
  const [scannedDevice, setScannedDevice] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize QR session
  const initializeSession = useCallback(async () => {
    setStatus('loading');
    setQrData(null);
    setScannedDevice(null);

    try {
      const response = await fetch('/api/auth/qr-login/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          browserInfo: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create QR session');
      }

      const data = await response.json();
      
      setSessionId(data.sessionId);
      setQrData(data.qrData);
      setRemainingTime(data.expiresIn || 300);
      setStatus('ready');

      // Start polling
      startPolling(data.sessionId);

    } catch (error: unknown) {
      logger.error('QR init error:', error);
      setStatus('error');
      const message = error instanceof Error ? error.message : 'فشل في إنشاء رمز QR';
      onError?.(message);
    }
  }, [onError]);

  // Poll for status updates
  const startPolling = useCallback((sid: string) => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }

    pollingRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/qr-login/status?sessionId=${sid}`);
        
        if (!response.ok) {
          throw new Error('Failed to check status');
        }

        const data = await response.json();

        switch (data.status) {
          case 'scanned':
            setStatus('scanned');
            setScannedDevice(data.scannedByDevice || 'جهاز غير معروف');
            break;

          case 'confirmed':
            setStatus('confirmed');
            if (pollingRef.current) clearInterval(pollingRef.current);
            onSuccess?.(data.userId, sid);
            break;

          case 'expired':
            setStatus('expired');
            if (pollingRef.current) clearInterval(pollingRef.current);
            onExpire?.();
            break;

          case 'cancelled':
            setStatus('error');
            if (pollingRef.current) clearInterval(pollingRef.current);
            break;
        }
      } catch (error) {
        logger.error('Polling error:', error);
      }
    }, 2000);
  }, [onSuccess, onExpire]);

  // Countdown timer
  useEffect(() => {
    if (status === 'ready' || status === 'scanned') {
      countdownRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            setStatus('expired');
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            onExpire?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [status, onExpire]);

  // Initialize on mount
  useEffect(() => {
    initializeSession();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [initializeSession]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Render based on status
  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center"
            style={{ width: size, height: size }}
          >
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground text-sm">جاري إنشاء رمز QR...</p>
          </motion.div>
        );

      case 'ready':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <div className="relative p-3 bg-white rounded-xl shadow-sm">
              <QRCodeSVG
                value={qrData!}
                size={size}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#000000"
              />
              
              {/* Logo overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>

            {/* Timer */}
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>ينتهي خلال {formatTime(remainingTime)}</span>
            </div>
          </motion.div>
        );

      case 'scanned':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center"
            style={{ width: size, height: size }}
          >
            <div className="relative">
              <Smartphone className="h-16 w-16 text-primary mb-4" />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute -top-1 -right-1"
              >
                <div className="w-4 h-4 bg-green-500 rounded-full" />
              </motion.div>
            </div>
            <p className="font-medium text-lg mb-1">تم المسح!</p>
            <p className="text-sm text-muted-foreground mb-2">
              {scannedDevice}
            </p>
            <p className="text-xs text-muted-foreground">
              يرجى التأكيد من الجهاز...
            </p>

            {/* Timer */}
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{formatTime(remainingTime)}</span>
            </div>
          </motion.div>
        );

      case 'confirmed':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-center"
            style={{ width: size, height: size }}
          >
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <p className="font-medium text-lg text-green-600">تم تسجيل الدخول!</p>
            <p className="text-sm text-muted-foreground">
              جاري التحويل...
            </p>
          </motion.div>
        );

      case 'expired':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center text-center"
            style={{ width: size, height: size }}
          >
            <Clock className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="font-medium text-lg mb-2">انتهت الصلاحية</p>
            <Button onClick={initializeSession} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              إنشاء رمز جديد
            </Button>
          </motion.div>
        );

      case 'error':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center text-center"
            style={{ width: size, height: size }}
          >
            <XCircle className="h-16 w-16 text-red-500 mb-4" />
            <p className="font-medium text-lg mb-2">حدث خطأ</p>
            <Button onClick={initializeSession} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              إعادة المحاولة
            </Button>
          </motion.div>
        );
    }
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center">
          {/* Content */}
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>

          {/* Instructions */}
          {showInstructions && status === 'ready' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-2 text-center"
            >
              <div className="flex items-center justify-center gap-2 text-sm font-medium">
                <Shield className="h-4 w-4 text-primary" />
                <span>تسجيل دخول سريع وآمن</span>
              </div>
              <ol className="text-xs text-muted-foreground space-y-1">
                <li>1. افتح التطبيق على هاتفك</li>
                <li>2. اختر "مسح QR للدخول"</li>
                <li>3. وجه الكاميرا نحو الرمز</li>
              </ol>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default QRLoginWidget;
