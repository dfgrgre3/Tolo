'use client';

/**
 * Passkey Management UI Component
 * User interface for managing passkeys
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Smartphone,
  Monitor,
  Shield,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getPasskeyManager, type PasskeyCredential } from './PasskeyManager';
import { cn } from '@/lib/utils';

export default function PasskeyManagement() {
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [isSupported, setIsSupported] = useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);

  const passkeyManager = getPasskeyManager();

  useEffect(() => {
    checkSupport();
    loadPasskeys();
  }, []);

  const checkSupport = async () => {
    const supported = passkeyManager.isSupported();
    setIsSupported(supported);

    if (supported) {
      const platformAvailable = await passkeyManager.isPlatformAuthenticatorAvailable();
      setIsPlatformAvailable(platformAvailable);
    }
  };

  const loadPasskeys = () => {
    const registered = passkeyManager.getRegisteredPasskeys();
    setPasskeys(registered);
  };

  const handleAddPasskey = async () => {
    setIsLoading(true);
    try {
      // Request registration options from server
      const optionsResponse = await fetch('/api/auth/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!optionsResponse.ok) {
        throw new Error('Failed to get registration options');
      }

      const options = await optionsResponse.json();

      // Register passkey
      await passkeyManager.registerPasskey(options);

      // Reload passkeys
      loadPasskeys();
      setShowAddDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'فشل إضافة المفتاح');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePasskey = async (credentialId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المفتاح؟')) {
      return;
    }

    try {
      await passkeyManager.deletePasskey(credentialId);
      loadPasskeys();
    } catch (error: any) {
      toast.error(error.message || 'فشل حذف المفتاح');
    }
  };

  const handleStartEdit = (passkey: PasskeyCredential) => {
    setEditingId(passkey.id);
    setEditingName(passkey.deviceName);
  };

  const handleSaveEdit = async (credentialId: string) => {
    if (!editingName.trim()) {
      toast.error('يرجى إدخال اسم صحيح');
      return;
    }

    try {
      await passkeyManager.renamePasskey(credentialId, editingName.trim());
      loadPasskeys();
      setEditingId(null);
      setEditingName('');
    } catch (error: any) {
      toast.error(error.message || 'فشل تغيير الاسم');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const getDeviceIcon = (deviceType: string) => {
    return deviceType === 'platform' ? (
      <Smartphone className="h-5 w-5" />
    ) : (
      <Monitor className="h-5 w-5" />
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!isSupported) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-red-300 mb-2">
              غير مدعوم
            </h3>
            <p className="text-sm text-red-200">
              متصفحك لا يدعم مفاتيح المرور (Passkeys). يرجى استخدام متصفح حديث مثل
              Chrome أو Safari أو Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Key className="h-7 w-7 text-indigo-400" />
            مفاتيح المرور
          </h2>
          <p className="mt-1 text-sm text-slate-300">
            قم بإدارة مفاتيح المرور الخاصة بك للدخول بدون كلمة مرور
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddDialog(true)}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          إضافة مفتاح جديد
        </motion.button>
      </div>

      {/* Info Banner */}
      {isPlatformAvailable && (
        <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-indigo-200">
              <p className="font-medium mb-1">مصادقة آمنة بدون كلمة مرور</p>
              <p className="text-indigo-300">
                استخدم بصمة الإصبع أو التعرف على الوجه أو رقم PIN للدخول بسرعة وأمان.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Passkeys List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {passkeys.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-xl bg-white/5 border border-white/10 p-8 text-center"
            >
              <Key className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">لم تقم بإضافة أي مفاتيح مرور بعد</p>
              <p className="text-sm text-slate-500 mt-1">
                قم بإضافة مفتاح مرور للدخول بسرعة وأمان
              </p>
            </motion.div>
          ) : (
            passkeys.map((passkey, index) => (
              <motion.div
                key={passkey.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="rounded-lg bg-indigo-500/20 p-2 text-indigo-400">
                      {getDeviceIcon(passkey.deviceType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingId === passkey.id ? (
                        <div className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(passkey.credentialId)}
                            className="rounded-lg bg-green-500/20 p-1.5 text-green-400 hover:bg-green-500/30"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="rounded-lg bg-red-500/20 p-1.5 text-red-400 hover:bg-red-500/30"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <h3 className="text-base font-medium text-white mb-1">
                          {passkey.deviceName}
                        </h3>
                      )}
                      <div className="space-y-1 text-xs text-slate-400">
                        <p>تم الإنشاء: {formatDate(passkey.createdAt)}</p>
                        {passkey.lastUsedAt && (
                          <p>آخر استخدام: {formatDate(passkey.lastUsedAt)}</p>
                        )}
                        <p className="text-slate-500">
                          النوع: {passkey.deviceType === 'platform' ? 'جهاز' : 'خارجي'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {editingId !== passkey.id && (
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleStartEdit(passkey)}
                        className="rounded-lg bg-blue-500/20 p-2 text-blue-400 hover:bg-blue-500/30"
                      >
                        <Edit2 className="h-4 w-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeletePasskey(passkey.credentialId)}
                        className="rounded-lg bg-red-500/20 p-2 text-red-400 hover:bg-red-500/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </motion.button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Add Passkey Dialog */}
      <AnimatePresence>
        {showAddDialog && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => !isLoading && setShowAddDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
            >
              <div className="rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">
                  إضافة مفتاح مرور جديد
                </h3>
                <p className="text-sm text-slate-300 mb-6">
                  سيطلب منك المتصفح التحقق من هويتك باستخدام بصمة الإصبع أو التعرف
                  على الوجه أو رقم PIN.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleAddPasskey}
                    disabled={isLoading}
                    className={cn(
                      'flex-1 rounded-xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed',
                      'flex items-center justify-center gap-2'
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جارٍ الإضافة...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        إضافة
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowAddDialog(false)}
                    disabled={isLoading}
                    className="flex-1 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    إلغاء
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

