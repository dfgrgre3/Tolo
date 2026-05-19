'use client';

import { useEffect, useState } from 'react';
import { 
  Smartphone, 
  Monitor, 
  Globe, 
  Clock, 
  ShieldCheck, 
  Trash2, 
  Loader2,
  AlertCircle,
  MapPin,
  RefreshCcw,
  ShieldX
} from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UserSession {
  id: string;
  userId: string;
  userAgent: string;
  ip: string;
  location: string | null;
  deviceType: string;
  lastActive: string;
  createdAt: string;
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/sessions', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
      } else {
        toast.error('فشل تحميل قائمة الأجهزة النشطة');
      }
    } catch (err) {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (sessionId: string) => {
    setIsRevoking(sessionId);
    try {
      const res = await fetch(`/api/auth/sessions?sessionId=${sessionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        toast.success('تم إنهاء الجلسة بنجاح');
      } else {
        toast.error('فشل إنهاء الجلسة');
      }
    } catch (err) {
      toast.error('خطأ في الاتصال');
    } finally {
      setIsRevoking(null);
    }
  };

  const getDeviceIcon = (ua: string) => {
    const lowerUA = ua.toLowerCase();
    if (lowerUA.includes('android') || lowerUA.includes('iphone')) return Smartphone;
    return Monitor;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-xs font-black text-gray-500 uppercase tracking-widest">جاري فحص الأجهزة النشطة...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          الأجهزة النشطة حالياً
        </h4>
        <button 
          onClick={fetchSessions}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
        >
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-4">
        <AnimatePresence mode="popLayout">
          {sessions.length === 0 ? (
            <m.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-8 rounded-3xl bg-white/5 border border-dashed border-white/10 text-center space-y-3"
            >
              <AlertCircle className="mx-auto h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-500 font-bold">لا يوجد جلسات نشطة أخرى</p>
            </m.div>
          ) : (
            sessions.map((session, idx) => {
              const Icon = getDeviceIcon(session.userAgent);
              return (
                <m.div
                  key={session.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all flex items-center gap-6"
                >
                  <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-primary transition-colors">
                    <Icon size={28} />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-black text-sm tracking-tight truncate max-w-[200px]">
                        {session.userAgent.split(' ')[0]} / {session.userAgent.includes('Windows') ? 'Windows' : 'Mobile'}
                      </span>
                      {idx === 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[9px] font-black text-green-400 uppercase tracking-widest">
                          هذا الجهاز
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {session.ip}
                      </div>
                      {session.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.location}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(session.lastActive)}
                      </div>
                    </div>
                  </div>

                  {idx !== 0 && (
                    <button
                      onClick={() => handleRevoke(session.id)}
                      disabled={isRevoking === session.id}
                      className="h-12 w-12 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                      title="إنهاء الجلسة"
                    >
                      {isRevoking === session.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Trash2 size={20} />
                      )}
                    </button>
                  )}
                </m.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <div className="p-5 rounded-[1.5rem] bg-amber-500/5 border border-amber-500/10 flex items-start gap-4">
        <ShieldX className="h-6 w-6 text-amber-500 shrink-0 mt-1" />
        <div className="space-y-1">
          <p className="text-xs font-black text-amber-400 uppercase tracking-widest">أمن الحساب</p>
          <p className="text-[10px] text-amber-500/70 font-medium leading-relaxed">
            إذا رأيت جهازاً لا تعرفه، قم بإنهاء جلسته فوراً وتغيير كلمة المرور الخاصة بك لضمان حماية هويتك الرقمية.
          </p>
        </div>
      </div>
    </div>
  );
}
