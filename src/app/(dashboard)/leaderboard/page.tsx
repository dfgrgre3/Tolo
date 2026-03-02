"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useGamification } from '@/hooks/use-gamification';
import { AchievementToast } from '@/components/gamification/AchievementToast';

import { ensureUser } from "@/lib/user-utils";

export default function LeaderboardPage() {
  const [userId, setUserId] = useState<string>('');
  const [leaderboardType, setLeaderboardType] = useState<'global' | 'friends'>('global');

  const {
    leaderboard,
    userProgress,
    currentAchievement,
    clearAchievementNotification,
    getUserRank,
    isLoading,
    error
  } = useGamification({
    userId,
    enableRealTime: true,
    enableNotifications: true
  });

  useEffect(() => {
    (async () => {
      const id = await ensureUser();
      setUserId(id);
    })();
  }, []);

  const userRank = getUserRank();

  // Ensure leaderboard is always an array
  const safeLeaderboard = Array.isArray(leaderboard) ? leaderboard : [];

  if (isLoading) {
    return (
              <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
          </div>
        </div>
          );
  }

  return (
          <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🏆 لوحة المتصدرين
          </h1>
          <p className="text-gray-600">
            تابع تقدمك وترتيبك بين المتعلمين
          </p>
        </motion.div>

        {/* User Stats Card */}
        {userProgress && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {userProgress.level}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    مستواك الحالي
                  </h2>
                  <p className="text-gray-600">
                    إجمالي النقاط: {userProgress.totalXP} XP
                  </p>
                  <p className="text-sm text-gray-500">
                    أفضل سلسلة متتالية: {userProgress.longestStreak} أيام
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-indigo-600">
                  #{userRank || '?'}
                </div>
                <div className="text-gray-500">ترتيبك</div>
              </div>
            </div>

            {/* Level Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>المستوى {userProgress.level}</span>
                <span>المستوى {userProgress.level + 1}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((userProgress.totalXP % 100) / 100) * 100}%` }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Leaderboard Type Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8"
        >
          <div className="bg-white rounded-lg p-1 shadow-md">
            <button
              onClick={() => setLeaderboardType('global')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                leaderboardType === 'global'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🌍 عالمي
            </button>
            <button
              onClick={() => setLeaderboardType('friends')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                leaderboardType === 'friends'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👥 الأصدقاء
            </button>
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              {leaderboardType === 'global' ? 'المتصدرون عالمياً' : 'متصدرون الأصدقاء'}
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {safeLeaderboard.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                لا توجد بيانات متاحة بعد
              </div>
            ) : (
              safeLeaderboard.map((entry, index) => (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    entry.userId === userId ? 'bg-indigo-50 border-r-4 border-indigo-600' : ''
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-indigo-100 text-indigo-800'
                    }`}>
                      {entry.rank}
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {entry.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {entry.username}
                        {entry.userId === userId && (
                          <span className="ml-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded-full">
                            أنت
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        مستوى {entry.level}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-gray-900">
                      {entry.totalXP.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      نقاط
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-white rounded-lg p-6 shadow-md text-center">
            <div className="text-2xl font-bold text-indigo-600 mb-2">
              {safeLeaderboard.length}
            </div>
            <div className="text-gray-600">مشارك</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md text-center">
            <div className="text-2xl font-bold text-green-600 mb-2">
              {safeLeaderboard.length > 0 
                ? Math.max(...safeLeaderboard.map(l => l.totalXP)).toLocaleString() 
                : '0'}
            </div>
            <div className="text-gray-600">أعلى نقاط</div>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md text-center">
            <div className="text-2xl font-bold text-purple-600 mb-2">
              {userProgress ? Math.floor(userProgress.totalStudyTime / 60) : 0}
            </div>
            <div className="text-gray-600">ساعات دراسة</div>
          </div>
        </motion.div>
      </div>

        {/* Achievement Toast */}
        <AchievementToast
          achievement={currentAchievement}
          onClose={clearAchievementNotification}
        />
      </div>
      );
}
