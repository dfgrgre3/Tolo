'use client';

/**
 * 📱 QRLoginScanner - ماسح QR للتطبيق
 * 
 * مكون لمسح QR Code من الكاميرا (للاستخدام في تطبيق الموبايل)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  QrCode,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Monitor,
  MapPin,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';

interface QRLoginScannerProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface ScannedSession {
  sessionId: string;
  token: string;
  browserInfo?: string;
  ipAddress?: string;
  expiresAt: string;
}

type ScanStatus = 'idle' | 'scanning' | 'scanned' | 'confirming' | 'success' | 'error';

export function QRLoginScanner({
  onSuccess,
  onCancel,
  className,
}: QRLoginScannerProps) {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [scannedData, setScannedData] = useState<ScannedSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setStatus('scanning');
      }
    } catch (error: unknown) {
      logger.error('Camera error:', error);
      setError('تعذر الوصول إلى الكاميرا');
      setStatus('error');
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Parse QR data
  const parseQRData = (data: string): ScannedSession | null => {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.type !== 'thanawy_qr_login') {
        throw new Error('Invalid QR type');
      }

      return {
        sessionId: parsed.sessionId,
        token: parsed.token,
        browserInfo: parsed.browserInfo,
        ipAddress: parsed.ipAddress,
        expiresAt: parsed.expiresAt,
      };
    } catch {
      return null;
    }
  };

  // Handle QR scan (simulated - in real app, use a QR scanning library)
  const handleManualInput = useCallback(async (qrValue: string) => {
    const session = parseQRData(qrValue);
    
    if (!session) {
      setError('رمز QR غير صالح');
      setStatus('error');
      return;
    }

    // Check expiration
    if (new Date(session.expiresAt) < new Date()) {
      setError('انتهت صلاحية رمز QR');
      setStatus('error');
      return;
    }

    stopCamera();
    setScannedData(session);
    setStatus('scanned');

    // Notify server about scan
    try {
      const response = await fetch('/api/auth/qr-login/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          device: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to notify scan');
      }
    } catch (error) {
      logger.error('Scan notification failed:', error);
    }
  }, [stopCamera]);

  // Confirm login
  const confirmLogin = useCallback(async () => {
    if (!scannedData) return;

    setStatus('confirming');

    try {
      const response = await fetch('/api/auth/qr-login/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: scannedData.sessionId,
          token: scannedData.token,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Confirmation failed');
      }

      setStatus('success');
      onSuccess?.();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'فشل تأكيد تسجيل الدخول';
      setError(message);
      setStatus('error');
    }
  }, [scannedData, onSuccess]);

  // Cancel
  const handleCancel = useCallback(() => {
    stopCamera();
    setStatus('idle');
    setScannedData(null);
    setError(null);
    onCancel?.();
  }, [stopCamera, onCancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const renderContent = () => {
    switch (status) {
      case 'idle':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-4"
          >
            <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <QrCode className="h-12 w-12 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">مسح رمز QR</h3>
              <p className="text-sm text-muted-foreground mt-1">
                امسح رمز QR المعروض على الكمبيوتر لتسجيل الدخول
              </p>
            </div>
            <Button onClick={startCamera} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              فتح الكاميرا
            </Button>
          </motion.div>
        );

      case 'scanning':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              
              {/* Scan overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/50 rounded-lg">
                  <motion.div
                    className="w-full h-0.5 bg-primary"
                    animate={{ y: ['0%', '19200%', '0%'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </div>

              {/* Corner decorations */}
              <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-lg" />
              <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-lg" />
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-lg" />
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-lg" />
            </div>

            <p className="text-sm text-center text-muted-foreground">
              وجّه الكاميرا نحو رمز QR
            </p>

            <Button variant="outline" onClick={handleCancel} className="w-full">
              إلغاء
            </Button>
          </motion.div>
        );

      case 'scanned':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-3">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg">تم المسح!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                هل تريد تسجيل الدخول على هذا الجهاز؟
              </p>
            </div>

            {/* Device info */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">
                    {scannedData?.browserInfo || 'جهاز غير معروف'}
                  </span>
                </div>
                {scannedData?.ipAddress && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{scannedData.ipAddress}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 text-sm">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>تأكد من أنك تحاول تسجيل الدخول على جهازك الخاص</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                إلغاء
              </Button>
              <Button onClick={confirmLogin} className="flex-1 gap-2">
                <Shield className="h-4 w-4" />
                تأكيد الدخول
              </Button>
            </div>
          </motion.div>
        );

      case 'confirming':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">جاري تأكيد تسجيل الدخول...</p>
          </motion.div>
        );

      case 'success':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="font-semibold text-lg text-green-600">تم تسجيل الدخول!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              يمكنك الآن استخدام حسابك على الجهاز الآخر
            </p>
          </motion.div>
        );

      case 'error':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-4"
          >
            <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg text-red-600">حدث خطأ</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {error || 'فشلت العملية'}
              </p>
            </div>
            <Button onClick={handleCancel} variant="outline" className="w-full">
              المحاولة مرة أخرى
            </Button>
          </motion.div>
        );
    }
  };

  return (
    <Card className={cn('max-w-sm mx-auto', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <QrCode className="h-5 w-5 text-primary" />
          تسجيل الدخول بالـ QR
        </CardTitle>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {renderContent()}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

export default QRLoginScanner;
