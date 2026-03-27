'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Smartphone,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Phone } from
'lucide-react';

import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPhone?: string;
}

export default function PhoneVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  initialPhone = ''
}: PhoneVerificationModalProps) {
  const [step, setStep] = useState<'IDLE' | 'SENDING' | 'OTP' | 'VERIFYING' | 'SUCCESS'>('IDLE');
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      setError('يرجى إدخال رقم هاتف صحيح');
      return;
    }

    setStep('SENDING');
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-phone/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إرسال رمز التحقق');
      }

      setStep('OTP');
      setCountdown(60);
      toast.success('تم إرسال رمز التحقق إلى هاتفك');
    } catch (err: any) {
      setError(err.message);
      setStep('IDLE');
    }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) return;

    setStep('VERIFYING');
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-phone/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'كود التحقق غير صحيح');
      }

      setStep('SUCCESS');
      toast.success('تم تفعيل رقم الهاتف بنجاح');
      setTimeout(() => {
        onSuccess();
        onClose();
        // Reset modal
        setStep('IDLE');
        setOtp(['', '', '', '', '', '']);
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setStep('OTP');
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-verify if last digit entered
    if (index === 5 && value && newOtp.every((digit) => digit !== '')) {
      // Delay slightly for visual feedback
      setTimeout(() => handleVerifyOTP(), 300);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 border border-white/10 shadow-2xl">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors z-10">
            
            <X className="h-5 w-5" />
          </button>

          <div className="p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                {step === 'SUCCESS' ?
                <ShieldCheck className="h-8 w-8 text-green-400" /> :

                <Smartphone className="h-8 w-8" />
                }
              </div>
              <h3 className="text-2xl font-bold text-white">
                {step === 'SUCCESS' ? 'تم التحقق بنجاح' : 'تفعيل رقم الهاتف'}
              </h3>
              <p className="mt-2 text-slate-400">
                {step === 'OTP' || step === 'VERIFYING' ?
                `أدخل رمز التحقق المرسل إلى الرقم ${phone}` :
                'سنقوم بإرسال كود تحقق لمرة واحدة لتأكيد ملكية رقمك'}
              </p>
            </div>

            {error &&
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400">
              
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </motion.div>
            }

            {step === 'SUCCESS' ?
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 flex flex-col items-center justify-center text-center">
              
                <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-10 w-10 text-green-400" />
                </div>
                <p className="text-white font-medium">حسابك الآن أكثر أماناً</p>
              </motion.div> :
            step === 'IDLE' || step === 'SENDING' ?
            <form onSubmit={handleSendOTP} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300">رقم الهاتف</label>
                  <div className="relative">
                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input
                    type="tel"
                    dir="ltr"
                    required
                    placeholder="+20 1XX XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-2xl bg-white/5 border border-white/10 p-4 pr-12 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono" />
                  
                  </div>
                  <p className="text-[10px] text-slate-500 pr-2">أدخل رقم الهاتف مع رمز الدولة (مثال: +2010...)</p>
                </div>

                <button
                type="submit"
                disabled={step === 'SENDING' || !phone}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-500 p-4 font-bold text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                
                  {step === 'SENDING' ?
                <Loader2 className="h-5 w-5 animate-spin" /> :

                <>
                      إرسال رمز التحقق
                      <ArrowRight className="h-5 w-5 rotate-180" />
                    </>
                }
                </button>
              </form> :

            <div className="space-y-6">
                <div className="flex justify-between gap-2" dir="ltr">
                  {otp.map((digit, index) =>
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  autoFocus={index === 0}
                  className="h-14 w-full rounded-xl bg-white/5 border border-white/10 text-center text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all" />

                )}
                </div>

                <div className="flex flex-col items-center gap-4">
                  <button
                  onClick={handleVerifyOTP}
                  disabled={step === 'VERIFYING' || otp.some((d) => d === '')}
                  className="w-full rounded-2xl bg-indigo-500 p-4 font-bold text-white hover:bg-indigo-600 disabled:opacity-50 transition-all">
                  
                    {step === 'VERIFYING' ?
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" /> :

                  'تأكيد الرمز'
                  }
                  </button>

                  <div className="text-center">
                    {countdown > 0 ?
                  <p className="text-sm text-slate-500">
                        يمكنك إعادة الإرسال خلال {countdown} ثانية
                      </p> :

                  <button
                    onClick={handleSendOTP}
                    className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                    
                        إعادة إرسال الرمز
                      </button>
                  }
                  </div>
                </div>
              </div>
            }
          </div>
        </motion.div>
      </div>
    </AnimatePresence>);

}
