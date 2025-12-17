'use client';

/**
 * Security Keys Manager
 * Manage hardware security keys (YubiKey, etc.) using WebAuthn
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Plus,
  Trash2,
  Shield,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Usb,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

// ==================== TYPES ====================

interface SecurityKey {
  id: string;
  credentialId: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  type: 'cross-platform' | 'platform';
}

interface SecurityKeysManagerProps {
  userId: string;
  onKeyAdded?: (key: SecurityKey) => void;
  onKeyRemoved?: (keyId: string) => void;
}

// ==================== COMPONENT ====================

export function SecurityKeysManager({
  userId,
  onKeyAdded,
  onKeyRemoved,
}: SecurityKeysManagerProps) {
  const [keys, setKeys] = useState<SecurityKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);

  // Check WebAuthn support
  const isWebAuthnSupported = typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function';

  // Fetch security keys
  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/security-keys', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setKeys(data.keys || []);
      }
    } catch (error) {
      logger.error('Failed to fetch security keys:', error);
      toast.error('فشل في تحميل مفاتيح الأمان');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Register a new security key
  const registerKey = async () => {
    if (!isWebAuthnSupported) {
      toast.error('متصفحك لا يدعم مفاتيح الأمان');
      return;
    }

    if (!newKeyName.trim()) {
      toast.error('يرجى إدخال اسم للمفتاح');
      return;
    }

    setIsRegistering(true);

    try {
      // Step 1: Get registration options from server
      const optionsResponse = await fetch('/api/auth/security-keys/register/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
        credentials: 'include',
      });

      if (!optionsResponse.ok) {
        throw new Error('فشل في الحصول على خيارات التسجيل');
      }

      const options = await optionsResponse.json();

      // Step 2: Create credential with WebAuthn
      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: base64ToArrayBuffer(options.challenge),
          user: {
            ...options.user,
            id: base64ToArrayBuffer(options.user.id),
          },
          excludeCredentials: (options.excludeCredentials || []).map(
            (cred: { id: string; type: string }) => ({
              ...cred,
              id: base64ToArrayBuffer(cred.id),
            })
          ),
          authenticatorSelection: {
            authenticatorAttachment: 'cross-platform', // For hardware keys
            userVerification: 'preferred',
            residentKey: 'preferred',
          },
        },
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('فشل في إنشاء المفتاح');
      }

      const attestationResponse = credential.response as AuthenticatorAttestationResponse;

      // Step 3: Verify with server
      const verifyResponse = await fetch('/api/auth/security-keys/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: credential.id,
          rawId: arrayBufferToBase64(credential.rawId),
          type: credential.type,
          response: {
            clientDataJSON: arrayBufferToBase64(attestationResponse.clientDataJSON),
            attestationObject: arrayBufferToBase64(attestationResponse.attestationObject),
          },
          name: newKeyName.trim(),
        }),
        credentials: 'include',
      });

      if (!verifyResponse.ok) {
        throw new Error('فشل في تسجيل المفتاح');
      }

      const newKey = await verifyResponse.json();
      setKeys((prev) => [...prev, newKey]);
      setNewKeyName('');
      setShowAddDialog(false);
      toast.success('تم إضافة مفتاح الأمان بنجاح');
      onKeyAdded?.(newKey);
    } catch (error) {
      logger.error('Security key registration failed:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('تم إلغاء العملية أو انتهت المهلة');
      } else {
        toast.error('فشل في تسجيل مفتاح الأمان');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Remove a security key
  const removeKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/auth/security-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('فشل في حذف المفتاح');
      }

      setKeys((prev) => prev.filter((k) => k.id !== keyId));
      setKeyToDelete(null);
      toast.success('تم حذف مفتاح الأمان');
      onKeyRemoved?.(keyId);
    } catch (error) {
      logger.error('Failed to remove security key:', error);
      toast.error('فشل في حذف مفتاح الأمان');
    }
  };

  // Helper functions for WebAuthn
  function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  if (!isWebAuthnSupported) {
    return (
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-400 mb-3" />
        <p className="text-amber-200">متصفحك لا يدعم مفاتيح الأمان (WebAuthn)</p>
        <p className="text-sm text-amber-200/70 mt-1">
          جرب استخدام متصفح حديث مثل Chrome أو Firefox أو Edge
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
            <Key className="h-5 w-5 text-indigo-300" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">مفاتيح الأمان</h3>
            <p className="text-sm text-slate-400">إدارة مفاتيح الأجهزة (YubiKey، إلخ)</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/30 transition"
        >
          <Plus className="h-4 w-4" />
          إضافة مفتاح
        </motion.button>
      </div>

      {/* Security Keys List */}
      <AnimatePresence mode="popLayout">
        {keys.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center"
          >
            <Usb className="mx-auto h-12 w-12 text-slate-500 mb-4" />
            <p className="text-slate-400">لم تقم بإضافة أي مفاتيح أمان بعد</p>
            <p className="text-sm text-slate-500 mt-1">
              مفاتيح الأمان توفر حماية إضافية لحسابك
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {keys.map((key, index) => (
              <motion.div
                key={key.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between rounded-xl bg-white/5 border border-white/10 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
                    <Shield className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{key.name}</p>
                    <p className="text-xs text-slate-400">
                      أضيف في {new Date(key.createdAt).toLocaleDateString('ar-EG')}
                      {key.lastUsedAt && (
                        <> • آخر استخدام {new Date(key.lastUsedAt).toLocaleDateString('ar-EG')}</>
                      )}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setKeyToDelete(key.id)}
                  className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                >
                  <Trash2 className="h-4 w-4" />
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Add Key Dialog */}
      <AnimatePresence>
        {showAddDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => !isRegistering && setShowAddDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-slate-800 border border-white/10 p-6 shadow-xl"
            >
              <h3 className="text-xl font-bold text-white mb-4">إضافة مفتاح أمان</h3>
              
              <div className="mb-6">
                <label htmlFor="keyName" className="block text-sm text-slate-300 mb-2">
                  اسم المفتاح
                </label>
                <input
                  id="keyName"
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="مثال: YubiKey الرئيسي"
                  className="w-full rounded-xl bg-white/10 px-4 py-3 text-white placeholder-slate-400 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  disabled={isRegistering}
                />
              </div>

              <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Usb className="h-5 w-5 text-indigo-300 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-indigo-200 font-medium">تعليمات</p>
                    <p className="text-indigo-200/70 mt-1">
                      1. أدخل مفتاح الأمان في منفذ USB
                      <br />
                      2. اضغط على زر "تسجيل المفتاح"
                      <br />
                      3. المس المفتاح عند طلب ذلك
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddDialog(false)}
                  disabled={isRegistering}
                  className="flex-1 rounded-xl bg-white/10 px-4 py-3 font-medium text-white hover:bg-white/15 transition disabled:opacity-50"
                >
                  إلغاء
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={registerKey}
                  disabled={isRegistering || !newKeyName.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 font-medium text-white hover:bg-indigo-600 transition disabled:opacity-50"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري التسجيل...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      تسجيل المفتاح
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {keyToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setKeyToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-slate-800 border border-white/10 p-6 shadow-xl"
            >
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-white">حذف مفتاح الأمان؟</h3>
                <p className="text-sm text-slate-400 mt-2">
                  لن تتمكن من استخدام هذا المفتاح لتسجيل الدخول بعد حذفه
                </p>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setKeyToDelete(null)}
                  className="flex-1 rounded-xl bg-white/10 px-4 py-3 font-medium text-white hover:bg-white/15 transition"
                >
                  إلغاء
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => removeKey(keyToDelete)}
                  className="flex-1 rounded-xl bg-red-500 px-4 py-3 font-medium text-white hover:bg-red-600 transition"
                >
                  حذف
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SecurityKeysManager;
