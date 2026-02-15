'use client';

/**
 * 📱 DeviceManagement - إدارة الأجهزة المتصلة
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone,
  Monitor,
  Tablet,
  Globe,
  Shield,
  ShieldCheck,
  ShieldX,
  MoreVertical,
  LogOut,
  Edit2,
  RefreshCw,
  Clock,
  MapPin,
  Check,
  X,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuthButton } from '@/components/auth';
import { useDeviceManagement, Device } from './useDeviceManagement';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface DeviceCardProps {
  device: Device;
  onRevoke: () => void;
  onTrust: () => void;
  onUntrust: () => void;
  onRename: (name: string) => void;
}

function DeviceCard({ device, onRevoke, onTrust, onUntrust, onRename }: DeviceCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(device.name);
  const [isLoading, setIsLoading] = useState(false);

  const DeviceIcon = device.type === 'mobile' 
    ? Smartphone 
    : device.type === 'tablet' 
    ? Tablet 
    : Monitor;

  const handleRename = async () => {
    if (newName.trim() && newName !== device.name) {
      setIsLoading(true);
      onRename(newName.trim());
      setIsLoading(false);
    }
    setIsEditing(false);
  };

  const timeAgo = formatDistanceToNow(device.lastActive, { 
    addSuffix: true, 
    locale: ar 
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        'relative rounded-xl border p-4 transition-all duration-200',
        device.isCurrent
          ? 'bg-indigo-500/10 border-indigo-500/30'
          : 'bg-white/5 border-white/10 hover:border-white/20'
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl',
            device.isCurrent
              ? 'bg-indigo-500/20 text-indigo-400'
              : 'bg-white/10 text-slate-400'
          )}
        >
          <DeviceIcon className="h-6 w-6" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-white/10 rounded px-2 py-1 text-white text-sm border border-white/20 focus:border-indigo-500 focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                />
                <button
                  onClick={handleRename}
                  className="text-green-400 hover:text-green-300"
                  disabled={isLoading}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <h3 className="font-medium text-white truncate">{device.name}</h3>
                {device.isCurrent && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    هذا الجهاز
                  </span>
                )}
                {device.isTrusted && (
                  <ShieldCheck className="h-4 w-4 text-green-400" />
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span>{device.browser} • {device.os}</span>
            {device.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {device.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </span>
          </div>

          <div className="mt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {device.ip}
            </span>
          </div>
        </div>

        {/* Actions */}
        {!device.isCurrent && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 top-10 z-20 w-48 rounded-xl bg-slate-800 border border-white/10 shadow-xl overflow-hidden"
                  >
                    <button
                      onClick={() => {
                        setIsEditing(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                      تغيير الاسم
                    </button>
                    {device.isTrusted ? (
                      <button
                        onClick={() => {
                          onUntrust();
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-3 flex items-center gap-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                      >
                        <ShieldX className="h-4 w-4" />
                        إزالة من الموثوقة
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onTrust();
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-3 flex items-center gap-2 text-sm text-slate-300 hover:bg-white/5 transition-colors"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        إضافة للموثوقة
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onRevoke();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 flex items-center gap-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      إنهاء الجلسة
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function DeviceManagement() {
  const {
    devices,
    isLoading,
    error,
    fetchDevices,
    revokeDevice,
    revokeAllOther,
    trustDevice,
    untrustDevice,
    renameDevice,
  } = useDeviceManagement();

  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const handleRevokeAll = async () => {
    setIsRevokingAll(true);
    await revokeAllOther();
    setIsRevokingAll(false);
    setShowConfirmAll(false);
  };

  const currentDevice = devices.find(d => d.isCurrent);
  const otherDevices = devices.filter(d => !d.isCurrent);
  const trustedDevices = devices.filter(d => d.isTrusted && !d.isCurrent);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 mb-4">{error}</p>
        <AuthButton onClick={fetchDevices} variant="secondary" icon={RefreshCw}>
          إعادة المحاولة
        </AuthButton>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Smartphone className="h-6 w-6 text-indigo-400" />
            إدارة الأجهزة
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {devices.length} جهاز متصل
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AuthButton
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={fetchDevices}
          >
            تحديث
          </AuthButton>
          {otherDevices.length > 0 && (
            <AuthButton
              variant="danger"
              size="sm"
              icon={LogOut}
              onClick={() => setShowConfirmAll(true)}
            >
              إنهاء الجميع
            </AuthButton>
          )}
        </div>
      </div>

      {/* Current Device */}
      {currentDevice && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-3">الجهاز الحالي</h3>
          <DeviceCard
            device={currentDevice}
            onRevoke={() => {}}
            onTrust={() => trustDevice(currentDevice.id)}
            onUntrust={() => untrustDevice(currentDevice.id)}
            onRename={(name) => renameDevice(currentDevice.id, name)}
          />
        </div>
      )}

      {/* Trusted Devices */}
      {trustedDevices.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-400" />
            الأجهزة الموثوقة ({trustedDevices.length})
          </h3>
          <div className="space-y-3">
            <AnimatePresence>
              {trustedDevices.map(device => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onRevoke={() => revokeDevice(device.id)}
                  onTrust={() => trustDevice(device.id)}
                  onUntrust={() => untrustDevice(device.id)}
                  onRename={(name) => renameDevice(device.id, name)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Other Devices */}
      {otherDevices.filter(d => !d.isTrusted).length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-3">
            أجهزة أخرى ({otherDevices.filter(d => !d.isTrusted).length})
          </h3>
          <div className="space-y-3">
            <AnimatePresence>
              {otherDevices.filter(d => !d.isTrusted).map(device => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onRevoke={() => revokeDevice(device.id)}
                  onTrust={() => trustDevice(device.id)}
                  onUntrust={() => untrustDevice(device.id)}
                  onRename={(name) => renameDevice(device.id, name)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Empty State */}
      {devices.length === 1 && (
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">لا توجد أجهزة أخرى متصلة</p>
        </div>
      )}

      {/* Confirm Revoke All Modal */}
      <AnimatePresence>
        {showConfirmAll && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-2xl border border-white/10 p-6 max-w-md w-full"
            >
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                  <AlertTriangle className="h-8 w-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  إنهاء جميع الجلسات؟
                </h3>
                <p className="text-slate-400 text-sm">
                  سيتم إنهاء جميع الجلسات على الأجهزة الأخرى. سيحتاج المستخدمون لتسجيل الدخول مرة أخرى.
                </p>
              </div>

              <div className="flex gap-3">
                <AuthButton
                  fullWidth
                  variant="secondary"
                  onClick={() => setShowConfirmAll(false)}
                  disabled={isRevokingAll}
                >
                  إلغاء
                </AuthButton>
                <AuthButton
                  fullWidth
                  variant="danger"
                  onClick={handleRevokeAll}
                  isLoading={isRevokingAll}
                  loadingText="جاري الإنهاء..."
                >
                  إنهاء الجميع
                </AuthButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default DeviceManagement;
