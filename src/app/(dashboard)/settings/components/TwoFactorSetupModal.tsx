'use client';

import { useState, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from "framer-motion";
import {
  Shield,

  Key,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Copy,
  Check,
  Eye,
  EyeOff } from
'lucide-react';

import { toast } from 'sonner';


interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SetupData {
  secret: string;
  qrCode: string;
}

export function TwoFactorSetupModal({ isOpen, onClose, onSuccess }: TwoFactorSetupModalProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'recovery'>('setup');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [token, setToken] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const fetchSetupData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/2fa/setup');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'فشل في إعداد المصادقة الثنائية');
      }
      const data = await res.json();
      setSetupData(data);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'فشل في تحميل بيانات الإعداد');
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setStep('setup');
      setToken('');
      setRecoveryCodes([]);
      fetchSetupData();
    }
  }, [isOpen, fetchSetupData]);

  const handleVerify = async () => {
    if (!token || token.length < 6) {
      toast.error('يرجى إدخال رمز التحقق المكون من 6 أرقام');
      return;
    }

    if (!setupData) return;

    setIsVerifying(true);
    try {
      const res = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: setupData.secret, token })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'رمز التحقق غير صحيح');
      }

      // Fetch recovery codes
      const userRes = await fetch('/api/users/profile');
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.recoveryCodes) {
          setRecoveryCodes(JSON.parse(userData.recoveryCodes));
        }
      }

      setStep('recovery');
      toast.success('تم تفعيل المصادقة الثنائية بنجاح!');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'فشل في التحقق من الرمز');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopySecret = async () => {
    if (setupData?.secret) {
      await navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      toast.success('تم نسخ المفتاح السري');
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCopyRecoveryCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast.success('تم نسخ رموز الاسترداد');
  };

  const handleClose = () => {
    if (step === 'recovery') {
      onSuccess();
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen &&
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}>
        
          <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">المصادقة الثنائية</h2>
                  <p className="text-xs text-slate-400">
                    {step === 'setup' && 'الخطوة 1 من 3: إعداد التطبيق'}
                    {step === 'verify' && 'الخطوة 2 من 3: التحقق'}
                    {step === 'recovery' && 'الخطوة 3 من 3: رموز الاسترداد'}
                  </p>
                </div>
              </div>
              <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
              
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {isLoading ?
            <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <Loader2 className="h-8 w-8 text-green-500 animate-spin" />
                  <p className="text-slate-400">جاري إعداد المصادقة الثنائية...</p>
                </div> :
            step === 'setup' && setupData ?
            <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-slate-300 mb-4">
                      قم بمسح رمز QR هذا باستخدام تطبيق المصادقة (مثل Google Authenticator أو Microsoft Authenticator)
                    </p>
                    
                    <div className="inline-block p-4 bg-white rounded-xl">
                      <img src={setupData.qrCode} alt="QR Code" className="w-40 h-40" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">أو أدخل هذا المفتاح يدوياً:</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <input
                      type={showSecret ? 'text' : 'password'}
                      value={setupData.secret}
                      readOnly
                      className="w-full p-3 pr-10 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm" />
                    
                        <button
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      
                          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <button
                    onClick={handleCopySecret}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                    
                        {copiedSecret ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                onClick={() => setStep('verify')}
                className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors">
                
                    التالي
                  </button>
                </div> :
            step === 'verify' ?
            <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-4">
                      <Key className="h-8 w-8 text-green-400" />
                    </div>
                    <p className="text-sm text-slate-300">
                      أدخل الرمز المكون من 6 أرقام من تطبيق المصادقة
                    </p>
                  </div>

                  <div className="space-y-2">
                    <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full p-4 rounded-xl bg-white/5 border border-white/10 text-white text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-green-500/50"
                  maxLength={6}
                  autoFocus />
                
                  </div>

                  <div className="flex gap-3">
                    <button
                  onClick={() => setStep('setup')}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors">
                  
                      السابق
                    </button>
                    <button
                  onClick={handleVerify}
                  disabled={token.length !== 6 || isVerifying}
                  className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  
                      {isVerifying ?
                  <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          جاري التحقق...
                        </> :

                  'تحقق'
                  }
                    </button>
                  </div>
                </div> :
            step === 'recovery' ?
            <div className="space-y-6">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-4">
                      <CheckCircle2 className="h-8 w-8 text-green-400" />
                    </div>
                    <p className="text-sm text-slate-300 mb-2">
                      تم تفعيل المصادقة الثنائية بنجاح!
                    </p>
                    <p className="text-xs text-slate-400">
                      احفظ هذه الرموز في مكان آمن. يمكنك استخدامها للوصول إلى حسابك إذا فقدت هاتفك.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-400">رموز الاسترداد:</label>
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                        {recoveryCodes.map((code, index) =>
                    <div key={index} className="text-slate-300 text-center">
                            {code}
                          </div>
                    )}
                      </div>
                    </div>
                  </div>

                  <button
                onClick={handleCopyRecoveryCodes}
                className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                
                    <Copy className="h-4 w-4" />
                    نسخ الرموز
                  </button>

                  <button
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors">
                
                    تم
                  </button>
                </div> :
            null}
            </div>

            {/* Footer Warning */}
            {step !== 'recovery' &&
          <div className="px-6 pb-6">
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex gap-3 items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-200/80">
                    تأكد من حفظ المفتاح السري ورموز الاسترداد في مكان آمن. ستحتاجها للوصول إلى حسابك إذا فقدت هاتفك.
                  </p>
                </div>
              </div>
          }
          </m.div>
        </m.div>
      }
    </AnimatePresence>);

}