"use client";

import { useEffect, useState, useCallback } from 'react';

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

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    if (achievement) {
      queueMicrotask(() => setIsVisible(true));

      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
      }
    }
    return;
  }, [achievement, autoClose, duration, handleClose]);

  if (!achievement) return null;

  return (
    <>
      {isVisible && (
        <div
          className="fixed bottom-4 right-4 z-50 max-w-sm w-full"
        >
          <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-lg shadow-2xl border-2 border-yellow-300 p-4">
            {/* Achievement Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div
                  className="text-3xl"
                >
                  {achievement.icon}
                </div>
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
              <div
                className="bg-white/20 rounded-full px-3 py-1 flex items-center space-x-2"
              >
                <span className="text-2xl">⭐</span>
                <span className="font-bold text-white">
                  +{achievement.xpReward} XP
                </span>
              </div>

              {/* Celebration particles effect */}
              <div className="flex space-x-1">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-yellow-300 rounded-full"
                  />
                ))}
              </div>
            </div>

            {/* Progress bar for auto-close */}
            {autoClose && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 rounded-b-lg origin-left"
                style={{ transformOrigin: 'left' }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
