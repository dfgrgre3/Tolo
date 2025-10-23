"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AchievementToastProps {
  achievement: {
    key: string;
    title: string;
    description: string;
    icon: string;
    xpReward: number;
  } | null;
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export function AchievementToast({
  achievement,
  onClose,
  autoClose = true,
  duration = 5000
}: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (achievement) {
      setIsVisible(true);

      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    }
  }, [achievement, autoClose, duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  if (!achievement) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          transition={{
            type: "spring",
            damping: 20,
            stiffness: 300
          }}
          className="fixed bottom-4 right-4 z-50 max-w-sm w-full"
        >
          <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-lg shadow-2xl border-2 border-yellow-300 p-4">
            {/* Achievement Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <motion.div
                  animate={{
                    rotate: [0, 10, -10, 0],
                    scale: [1, 1.2, 1.2, 1]
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: 2,
                    ease: "easeInOut"
                  }}
                  className="text-3xl"
                >
                  {achievement.icon}
                </motion.div>
                <div>
                  <h3 className="font-bold text-white text-lg">
                    إنجاز جديد! 🎉
                  </h3>
                  <p className="text-yellow-100 text-sm">
                    {achievement.title}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:text-yellow-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Achievement Description */}
            <div className="mb-3">
              <p className="text-white text-sm leading-relaxed">
                {achievement.description}
              </p>
            </div>

            {/* XP Reward */}
            <div className="flex items-center justify-between">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="bg-white/20 rounded-full px-3 py-1 flex items-center space-x-2"
              >
                <span className="text-2xl">⭐</span>
                <span className="font-bold text-white">
                  +{achievement.xpReward} XP
                </span>
              </motion.div>

              {/* Celebration particles effect */}
              <div className="flex space-x-1">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: [0, 1.5, 0],
                      opacity: [0, 1, 0],
                      y: [0, -20, -40]
                    }}
                    transition={{
                      duration: 1,
                      delay: 0.5 + (i * 0.1),
                      repeat: 2
                    }}
                    className="w-2 h-2 bg-yellow-300 rounded-full"
                  />
                ))}
              </div>
            </div>

            {/* Progress bar for auto-close */}
            {autoClose && (
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: duration / 1000, ease: "linear" }}
                className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 rounded-b-lg origin-left"
                style={{ transformOrigin: 'left' }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
