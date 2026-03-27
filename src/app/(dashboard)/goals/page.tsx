"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGamification, CustomGoal } from '@/hooks/use-gamification';
import { AchievementToast } from '@/components/gamification/AchievementToast';
import { ensureUser } from "@/lib/user-utils";
import { CreateGoalModal } from './components/CreateGoalModal';
import { GoalCard } from './components/GoalCard';

export default function GoalsPage() {
  const [userId, setUserId] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const {
    userProgress,
    currentAchievement,
    clearAchievementNotification,
    createCustomGoal,
    updateCustomGoal,
    isLoading,
    error: _error
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

  const handleCreateGoal = async (goalData: Omit<CustomGoal, 'id' | 'userId' | 'isCompleted' | 'createdAt' | 'completedAt'>) => {
    await createCustomGoal(goalData);
  };

  const handleUpdateGoal = async (goalId: string, currentValue: number) => {
    await updateCustomGoal(goalId, currentValue);
  };

  const filteredGoals = userProgress?.customGoals.filter((goal) => {
    if (filter === 'active') return !goal.isCompleted;
    if (filter === 'completed') return goal.isCompleted;
    return true;
  }) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-600"></div>
          </div>
        </div>
      </div>);

  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8">
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎯 أهدافي المخصصة
          </h1>
          <p className="text-gray-600">
            حدد أهدافك الخاصة وسجل تقدمك نحو تحقيقها
          </p>
        </motion.div>

        {/* Filter Tabs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-8">
          
          <div className="bg-white rounded-lg p-1 shadow-md">
            {[
            { key: 'all', label: 'الكل', icon: '📋' },
            { key: 'active', label: 'نشط', icon: '🔄' },
            { key: 'completed', label: 'مكتمل', icon: '✅' }].
            map((tab) =>
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
              filter === tab.key ?
              'bg-emerald-600 text-white shadow-md' :
              'text-gray-600 hover:text-gray-900'}`
              }>
              
                {tab.icon} {tab.label}
              </button>
            )}
          </div>
        </motion.div>

        {/* Create Goal Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8">
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl">
            
            ➕ إنشاء هدف جديد
          </button>
        </motion.div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {filteredGoals.map((goal, _idx) =>
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdateProgress={handleUpdateGoal}
              onComplete={handleUpdateGoal} />

            )}
          </AnimatePresence>
        </div>

        {filteredGoals.length === 0 &&
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16">
          
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'لا توجد أهداف بعد' :
            filter === 'active' ? 'لا توجد أهداف نشطة' :
            'لا توجد أهداف مكتملة'}
            </h3>
            <p className="text-gray-600 mb-6">
              ابدأ بإنشاء هدف جديد لتتبع تقدمك
            </p>
            <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
            
              إنشاء أول هدف
            </button>
          </motion.div>
        }
      </div>

      {/* Create Goal Modal */}
      <CreateGoalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateGoal={handleCreateGoal} />
      

      {/* Achievement Toast */}
      <AchievementToast
        achievement={currentAchievement}
        onClose={clearAchievementNotification} />
      
      </div>);

}
