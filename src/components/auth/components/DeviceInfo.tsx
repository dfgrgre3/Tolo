'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone } from 'lucide-react';

interface DeviceInfoProps {
  deviceFingerprint: {
    browser: string;
    os: string;
    screen: string;
  } | null;
}

export function DeviceInfo({ deviceFingerprint }: DeviceInfoProps) {
  if (!deviceFingerprint) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ delay: 0.8, duration: 0.3 }}
        className="mt-6 rounded-xl bg-white/5 p-4 text-xs text-slate-400 border border-white/10"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex items-center gap-2 mb-2"
        >
          <motion.div
            initial={{ rotate: -180, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ delay: 0.95, type: 'spring', stiffness: 200 }}
          >
            <Smartphone className="h-4 w-4" aria-hidden="true" />
          </motion.div>
          <span className="font-semibold">معلومات الجهاز</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="space-y-1"
        >
          <p>{deviceFingerprint.browser} على {deviceFingerprint.os}</p>
          <p>الشاشة: {deviceFingerprint.screen}</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

