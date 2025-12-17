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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : (error as { message?: string })?.message || 'فشل إضافة المفتاح';
      if (message === 'تم إلغاء عملية التسجيل') {
        toast.info(message);
      } else {
        toast.error(message);
      }
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'فشل حذف المفتاح';
      toast.error(message);
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'فشل تغيير الاسم';
      toast.error(message);
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
      <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-destructive mb-2">
              غير مدعوم
            </h3>
            <p className="text-sm text-destructive/80">
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
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <Key className="h-7 w-7 text-primary" />
            مفاتيح المرور
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            قم بإدارة مفاتيح المرور الخاصة بك للدخول بدون كلمة مرور
          </p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          disabled={isLoading}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          إضافة مفتاح جديد
        </Button>
      </div>

      {/* Info Banner */}
      {isPlatformAvailable && (
        <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-primary/80">
              <p className="font-medium mb-1 text-primary">مصادقة آمنة بدون كلمة مرور</p>
              <p>
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
              className="rounded-xl bg-muted/50 border border-border p-8 text-center"
            >
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">لم تقم بإضافة أي مفاتيح مرور بعد</p>
              <p className="text-sm text-muted-foreground/80 mt-1">
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
                className="rounded-xl bg-card border border-border p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      {getDeviceIcon(passkey.deviceType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingId === passkey.id ? (
                        <div className="flex items-center gap-2 mb-2">
                          <Input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="flex-1 h-8"
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleSaveEdit(passkey.credentialId)}
                            className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleCancelEdit}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <h3 className="text-base font-medium text-foreground mb-1">
                          {passkey.deviceName}
                        </h3>
                      )}
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>تم الإنشاء: {formatDate(passkey.createdAt)}</p>
                        {passkey.lastUsedAt && (
                          <p>آخر استخدام: {formatDate(passkey.lastUsedAt)}</p>
                        )}
                        <p>
                          النوع: {passkey.deviceType === 'platform' ? 'جهاز' : 'خارجي'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {editingId !== passkey.id && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleStartEdit(passkey)}
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeletePasskey(passkey.credentialId)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => !isLoading && setShowAddDialog(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
            >
              <div className="rounded-2xl bg-card border border-border p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-foreground mb-4">
                  إضافة مفتاح مرور جديد
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  سيطلب منك المتصفح التحقق من هويتك باستخدام بصمة الإصبع أو التعرف
                  على الوجه أو رقم PIN.
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={handleAddPasskey}
                    disabled={isLoading}
                    className="flex-1 gap-2"
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
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddDialog(false)}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
