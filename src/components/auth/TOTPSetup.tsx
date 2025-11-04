'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { toast } from 'sonner';
import {
  Shield,
  Smartphone,
  Copy,
  CheckCircle2,
  Loader2,
  Key,
  AlertCircle,
} from 'lucide-react';
// QR Code will be generated using external service or library

interface TOTPSetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

export default function TOTPSetup({ onComplete, onCancel }: TOTPSetupProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'setup' | 'verify' | 'recovery'>('setup');
  const [qrCodeURL, setQrCodeURL] = useState<string>('');
  const [manualEntryKey, setManualEntryKey] = useState<string>('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('غير مصرح');
        return;
      }

      const response = await fetch('/api/auth/two-factor/totp/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      // Read response text first to check if it's HTML
      const text = await response.text();
      
      // Check if response is HTML (error page)
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        console.error('Server returned HTML instead of JSON');
        toast.error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
        return;
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        toast.error('فشل في معالجة استجابة الخادم');
        return;
      }

      if (!response.ok) {
        toast.error(data.error || 'فشل إعداد المصادقة الثنائية');
        return;
      }

      setQrCodeURL(data.qrCodeURL);
      setManualEntryKey(data.manualEntryKey);
      setRecoveryCodes(data.recoveryCodes);
      setStep('verify');
      toast.success('تم إنشاء QR Code بنجاح');
    } catch (error) {
      console.error('Setup error:', error);
      toast.error('حدث خطأ أثناء الإعداد');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      toast.error('يرجى إدخال رمز صحيح مكون من 6 أرقام');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        toast.error('غير مصرح');
        return;
      }

      const response = await fetch('/api/auth/two-factor/totp/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      // Read response text first to check if it's HTML
      const text = await response.text();
      
      // Check if response is HTML (error page)
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        console.error('Server returned HTML instead of JSON');
        toast.error('خطأ في الخادم: تم إرجاع HTML بدلاً من JSON');
        return;
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        toast.error('فشل في معالجة استجابة الخادم');
        return;
      }

      if (!response.ok) {
        toast.error(data.error || 'رمز التحقق غير صحيح');
        return;
      }

      setStep('recovery');
      toast.success('تم تفعيل المصادقة الثنائية بنجاح!');
    } catch (error) {
      console.error('Verify error:', error);
      toast.error('حدث خطأ أثناء التحقق');
    } finally {
      setIsLoading(false);
    }
  };

  const copyRecoveryCodes = () => {
    const codesText = recoveryCodes.join('\n');
    navigator.clipboard.writeText(codesText);
    setCopied(true);
    toast.success('تم نسخ رموز الاسترداد');
    setTimeout(() => setCopied(false), 3000);
  };

  const downloadRecoveryCodes = () => {
    const codesText = recoveryCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('تم تحميل رموز الاسترداد');
  };

  if (step === 'setup') {
    return (
      <div className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20">
            <Shield className="h-8 w-8 text-indigo-300" />
          </div>
          <h2 className="text-2xl font-bold text-white">إعداد المصادقة الثنائية</h2>
          <p className="mt-2 text-sm text-slate-300">
            استخدم تطبيق مصادقة مثل Google Authenticator أو Authy
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-4">
            <div className="flex items-start gap-3">
              <Smartphone className="h-5 w-5 text-blue-300 mt-0.5" />
              <div className="text-sm text-blue-100">
                <p className="font-semibold mb-1">خطوات الإعداد:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>قم بتثبيت تطبيق مصادقة على هاتفك</li>
                  <li>انقر على "بدء الإعداد" لإنشاء QR Code</li>
                  <li>امسح QR Code باستخدام التطبيق</li>
                  <li>أدخل رمز التحقق من التطبيق</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleSetup}
          disabled={isLoading}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              جارٍ الإعداد...
            </span>
          ) : (
            'بدء الإعداد'
          )}
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full mt-3 text-sm text-slate-300 hover:text-white transition"
          >
            إلغاء
          </button>
        )}
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white">امسح QR Code</h2>
          <p className="mt-2 text-sm text-slate-300">
            استخدم تطبيق المصادقة لمسح الكود
          </p>
        </div>

        <div className="mb-6 flex justify-center">
          <div className="rounded-xl bg-white p-4">
            {qrCodeURL && (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeURL)}`}
                alt="QR Code"
                className="w-[200px] h-[200px]"
              />
            )}
          </div>
        </div>

        <div className="mb-6 rounded-xl bg-white/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Key className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-300">أو أدخل المفتاح يدوياً:</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white/10 px-3 py-2 text-sm font-mono text-white">
              {manualEntryKey}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(manualEntryKey);
                toast.success('تم النسخ');
              }}
              className="p-2 rounded bg-white/10 hover:bg-white/20 transition"
            >
              <Copy className="h-4 w-4 text-slate-300" />
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-slate-200">
            رمز التحقق من التطبيق
          </label>
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full rounded-xl bg-white/10 px-6 py-4 text-center text-2xl tracking-widest text-white placeholder-slate-400 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            maxLength={6}
            autoFocus
          />
        </div>

        <button
          onClick={handleVerify}
          disabled={isLoading || verificationCode.length !== 6}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              جارٍ التحقق...
            </span>
          ) : (
            'تحقق وتمكين'
          )}
        </button>
      </div>
    );
  }

  if (step === 'recovery') {
    return (
      <div className="rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-300" />
          </div>
          <h2 className="text-2xl font-bold text-white">رموز الاسترداد</h2>
          <p className="mt-2 text-sm text-slate-300">
            احفظ هذه الرموز في مكان آمن - لن تظهر مرة أخرى!
          </p>
        </div>

        <div className="mb-6 rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-300 mt-0.5" />
            <div className="text-sm text-yellow-100">
              <p className="font-semibold mb-1">تحذير مهم:</p>
              <p className="text-xs">
                هذه الرموز تظهر مرة واحدة فقط. استخدمها إذا فقدت وصولك لتطبيق المصادقة.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl bg-white/5 p-4">
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {recoveryCodes.map((code, index) => (
              <div
                key={index}
                className="rounded bg-white/10 px-3 py-2 text-center text-white"
              >
                {code}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 mb-6">
          <button
            onClick={copyRecoveryCodes}
            className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/20 transition flex items-center justify-center gap-2"
          >
            <Copy className="h-4 w-4" />
            {copied ? 'تم النسخ!' : 'نسخ'}
          </button>
          <button
            onClick={downloadRecoveryCodes}
            className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/20 transition flex items-center justify-center gap-2"
          >
            تحميل
          </button>
        </div>

        <button
          onClick={() => {
            onComplete?.();
          }}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4 font-semibold text-white shadow-lg transition hover:from-indigo-600 hover:to-purple-700"
        >
          فهمت، تم الحفظ
        </button>
      </div>
    );
  }

  return null;
}

