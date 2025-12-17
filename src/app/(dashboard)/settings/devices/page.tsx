'use client';

/**
 * 📱 صفحة إدارة الأجهزة - Device Management
 * 
 * إدارة الأجهزة المتصلة مع:
 * - عرض الأجهزة النشطة
 * - إلغاء الجلسات
 * - الوثوق بالأجهزة
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Shield,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  MoreVertical,
  LogOut,
  Star,
  StarOff,
  Edit3,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Device {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: Date;
  isCurrent: boolean;
  isTrusted: boolean;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);

  useEffect(() => {
    const loadDevices = async () => {
      setIsLoading(true);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockDevices: Device[] = [
          {
            id: '1',
            name: 'Chrome على Windows',
            type: 'desktop',
            browser: 'Chrome 120',
            os: 'Windows 11',
            ip: '192.168.1.1',
            location: 'القاهرة، مصر',
            lastActive: new Date(),
            isCurrent: true,
            isTrusted: true,
          },
          {
            id: '2',
            name: 'Safari على iPhone',
            type: 'mobile',
            browser: 'Safari 17',
            os: 'iOS 17.2',
            ip: '192.168.1.2',
            location: 'الرياض، السعودية',
            lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000),
            isCurrent: false,
            isTrusted: true,
          },
          {
            id: '3',
            name: 'Firefox على MacBook',
            type: 'desktop',
            browser: 'Firefox 121',
            os: 'macOS Sonoma',
            ip: '192.168.1.3',
            location: 'دبي، الإمارات',
            lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000),
            isCurrent: false,
            isTrusted: false,
          },
          {
            id: '4',
            name: 'Chrome على iPad',
            type: 'tablet',
            browser: 'Chrome 120',
            os: 'iPadOS 17',
            ip: '192.168.1.4',
            location: 'جدة، السعودية',
            lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            isCurrent: false,
            isTrusted: false,
          },
        ];
        
        setDevices(mockDevices);
      } catch {
        toast.error('فشل في تحميل الأجهزة');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDevices();
  }, []);

  const handleRevoke = async (deviceId: string) => {
    setIsRevoking(deviceId);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDevices(prev => prev.filter(d => d.id !== deviceId));
      toast.success('تم إلغاء الجلسة بنجاح');
    } catch {
      toast.error('فشل في إلغاء الجلسة');
    } finally {
      setIsRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setDevices(prev => prev.filter(d => d.isCurrent));
      toast.success('تم إلغاء جميع الجلسات');
      setShowRevokeAllConfirm(false);
    } catch {
      toast.error('فشل في إلغاء الجلسات');
    }
  };

  const handleToggleTrust = async (deviceId: string) => {
    setDevices(prev => prev.map(d => 
      d.id === deviceId ? { ...d, isTrusted: !d.isTrusted } : d
    ));
    
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      toast.success(device.isTrusted ? 'تم إزالة الوثوق بالجهاز' : 'تم الوثوق بالجهاز');
    }
  };

  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const currentDevice = devices.find(d => d.isCurrent);
  const otherDevices = devices.filter(d => !d.isCurrent);
  const trustedCount = devices.filter(d => d.isTrusted).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Smartphone className="h-7 w-7 text-indigo-400" />
            الأجهزة المتصلة
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            إدارة الأجهزة التي سجلت الدخول منها
          </p>
        </div>
        
        {otherDevices.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowRevokeAllConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 font-medium border border-red-500/30 hover:bg-red-500/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            إلغاء الكل
          </motion.button>
        )}
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-white/5 border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
              <Monitor className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{devices.length}</p>
              <p className="text-xs text-slate-400">إجمالي الأجهزة</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl bg-white/5 border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
              <Shield className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{trustedCount}</p>
              <p className="text-xs text-slate-400">أجهزة موثوقة</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-white/5 border border-white/10 p-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/20">
              <Globe className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{new Set(devices.map(d => d.location.split('،')[1]?.trim())).size}</p>
              <p className="text-xs text-slate-400">مناطق مختلفة</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Current Device */}
      {currentDevice && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 overflow-hidden"
        >
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <h3 className="font-semibold text-white">الجهاز الحالي</h3>
            </div>
          </div>
          <DeviceCard device={currentDevice} onRevoke={() => {}} onToggleTrust={() => handleToggleTrust(currentDevice.id)} />
        </motion.div>
      )}

      {/* Other Devices */}
      {otherDevices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Monitor className="h-5 w-5 text-indigo-400" />
              الأجهزة الأخرى ({otherDevices.length})
            </h3>
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث
            </button>
          </div>
          <div className="divide-y divide-white/5">
            <AnimatePresence>
              {otherDevices.map((device, index) => (
                <motion.div
                  key={device.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <DeviceCard 
                    device={device} 
                    onRevoke={() => handleRevoke(device.id)}
                    onToggleTrust={() => handleToggleTrust(device.id)}
                    isRevoking={isRevoking === device.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Empty State */}
      {otherDevices.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center"
        >
          <Shield className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">لا توجد أجهزة أخرى</h3>
          <p className="text-sm text-slate-400">
            أنت مسجل الدخول فقط من هذا الجهاز
          </p>
        </motion.div>
      )}

      {/* Revoke All Confirmation Modal */}
      <AnimatePresence>
        {showRevokeAllConfirm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRevokeAllConfirm(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20">
                    <AlertTriangle className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">إلغاء جميع الجلسات</h3>
                    <p className="text-sm text-slate-400">سيتم تسجيل خروجك من جميع الأجهزة</p>
                  </div>
                </div>
                
                <p className="text-slate-300 mb-6">
                  هل أنت متأكد من رغبتك في إلغاء جميع الجلسات؟ سيتم تسجيل خروجك من {otherDevices.length} جهاز باستثناء هذا الجهاز.
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRevokeAllConfirm(false)}
                    className="flex-1 p-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleRevokeAll}
                    className="flex-1 p-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                  >
                    تأكيد الإلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Device Card Component
function DeviceCard({ 
  device, 
  onRevoke,
  onToggleTrust,
  isRevoking = false,
}: { 
  device: Device; 
  onRevoke: () => void;
  onToggleTrust: () => void;
  isRevoking?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  
  const getDeviceIcon = (type: Device['type']) => {
    switch (type) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };
  
  const Icon = getDeviceIcon(device.type);

  return (
    <div className="p-4 hover:bg-white/5 transition-colors">
      <div className="flex items-start gap-4">
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl',
          device.isCurrent ? 'bg-indigo-500/20' : 'bg-white/10'
        )}>
          <Icon className={cn(
            'h-6 w-6',
            device.isCurrent ? 'text-indigo-400' : 'text-slate-400'
          )} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-white truncate">{device.name}</h4>
            {device.isCurrent && (
              <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-500/20 text-green-400">
                هذا الجهاز
              </span>
            )}
            {device.isTrusted && (
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {device.browser} • {device.os}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {device.location}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {device.isCurrent ? 'نشط الآن' : formatDistanceToNow(device.lastActive, { addSuffix: true, locale: ar })}
            </span>
          </div>
        </div>
        
        {!device.isCurrent && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <MoreVertical className="h-5 w-5 text-slate-400" />
            </button>
            
            <AnimatePresence>
              {showMenu && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowMenu(false)}
                    className="fixed inset-0 z-10"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute left-0 top-full mt-2 w-48 rounded-xl bg-slate-800 border border-white/10 shadow-xl z-20 overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        onToggleTrust();
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-2 p-3 text-sm text-slate-300 hover:bg-white/10 transition-colors"
                    >
                      {device.isTrusted ? (
                        <>
                          <StarOff className="h-4 w-4" />
                          إزالة الوثوق
                        </>
                      ) : (
                        <>
                          <Star className="h-4 w-4" />
                          الوثوق بالجهاز
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        onRevoke();
                        setShowMenu(false);
                      }}
                      disabled={isRevoking}
                      className="w-full flex items-center gap-2 p-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {isRevoking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                      إلغاء الجلسة
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
