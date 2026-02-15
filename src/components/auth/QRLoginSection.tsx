'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, RefreshCw, Smartphone, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';

interface QRLoginSectionProps {
  onBack: () => void;
}

export const QRLoginSection: React.FC<QRLoginSectionProps> = ({ onBack }) => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'scanned' | 'confirmed' | 'expired'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const fetchQRCode = async () => {
    setIsLoading(true);
    setStatus('pending');
    try {
      const response = await fetch('/api/auth/qr-login/create', { method: 'POST' });
      const data = await response.json();
      if (data.qrCode && data.sessionId) {
        setQrCode(data.qrCode);
        setSessionId(data.sessionId);
      } else {
        toast.error('فشل إنشاء رمز QR');
      }
    } catch (error) {
      toast.error('خطأ في الاتصال');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQRCode();
  }, []);

  // Polling for status
  useEffect(() => {
    if (!sessionId || status === 'confirmed' || status === 'expired') return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/auth/qr-login/status?sessionId=${sessionId}`);
        const data = await response.json();

        if (data.status === 'scanned') {
          setStatus('scanned');
        } else if (data.status === 'confirmed' && data.token) {
          setStatus('confirmed');
          clearInterval(interval);
          toast.success('تم تسجيل الدخول بنجاح');
          login(data.token, data.user);
        } else if (data.status === 'expired') {
          setStatus('expired');
          clearInterval(interval);
        }
      } catch (error) {
        console.error('QR Status poll error:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [sessionId, status, login]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
          <QrCode className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-white">تسجيل دخول بالرمز</h3>
        <p className="text-sm text-slate-400 mt-1">امسح الرمز بواسطة تطبيق Thanawy</p>
      </div>

      <div className="relative flex justify-center">
        <div className="p-4 bg-white rounded-2xl shadow-2xl relative overflow-hidden group">
          {qrCode ? (
            <div className={`transition-opacity duration-300 ${status === 'expired' ? 'opacity-20' : 'opacity-100'}`}>
              <QRCodeSVG 
                value={qrCode} 
                size={200} 
                level="H"
                includeMargin={false}
              />
            </div>
          ) : (
            <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-100 rounded-lg">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          )}

          {/* Overlay Status */}
          {status === 'scanned' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-10 p-4 text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mb-3 animate-bounce">
                 <Smartphone className="w-6 h-6 text-white" />
              </div>
              <p className="text-slate-900 font-bold">تم المسح!</p>
              <p className="text-slate-500 text-xs mt-1">بانتظار التأكيد من هاتفك...</p>
            </div>
          )}

          {status === 'confirmed' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm z-10 p-4 text-center">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-3">
                 <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <p className="text-slate-900 font-bold">تم التأكيد</p>
            </div>
          )}

          {status === 'expired' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-4 text-center">
              <button 
                onClick={fetchQRCode}
                className="flex flex-col items-center gap-2 group hover:scale-105 transition-transform"
              >
                <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-1 group-hover:bg-indigo-600 transition-colors">
                   <RefreshCw className="w-6 h-6 text-white" />
                </div>
                <p className="text-slate-900 font-bold text-sm">انتهت الصلاحية</p>
                <p className="text-slate-500 text-[10px]">اضغط للتحديث</p>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/10 text-[11px] text-slate-400 leading-relaxed">
        <Smartphone className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <p>افتح التطبيق على هاتفك، اذهب إلى "الإعدادات" &gt; "الأجهزة" &gt; "مسح الرمز".</p>
      </div>

      <div className="text-center">
        <button
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          الرجوع لتسجيل الدخول التقليدي
        </button>
      </div>
    </div>
  );
};
