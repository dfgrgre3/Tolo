"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGamification, CustomGoal } from '@/hooks/use-gamification';
import { AchievementToast } from '@/components/gamification/AchievementToast';

import { ensureUser } from "@/lib/user-utils";

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGoal: (goalData: Omit<CustomGoal, 'id' | 'userId' | 'isCompleted' | 'createdAt' | 'completedAt'>) => Promise<void>;
}

function CreateGoalModal({ isOpen, onClose, onCreateGoal }: CreateGoalModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetValue: '',
    unit: 'count',
    category: 'study'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.targetValue) return;

    await onCreateGoal({
      title: formData.title,
      description: formData.description || undefined,
      targetValue: parseFloat(formData.targetValue),
      currentValue: 0,
      unit: formData.unit,
      category: formData.category
    });

    setFormData({
      title: '',
      description: '',
      targetValue: '',
      unit: 'count',
      category: 'study'
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl max-w-md w-full p-6"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            إنشاء هدف جديد 🎯
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                عنوان الهدف
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="مثال: دراسة الرياضيات يومياً"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الوصف (اختياري)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="وصف تفصيلي للهدف..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الهدف المطلوب
                </label>
                <input
                  type="number"
                  value={formData.targetValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="100"
                  min="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الوحدة
                </label>
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="count">عدد</option>
                  <option value="minutes">دقائق</option>
                  <option value="hours">ساعات</option>
                  <option value="percentage">نسبة مئوية</option>
                  <option value="points">نقاط</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                الفئة
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="study">📚 دراسة</option>
                <option value="tasks">✅ مهام</option>
                <option value="exams">🎯 امتحانات</option>
                <option value="custom">🎨 مخصص</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                إنشاء الهدف
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

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

  const handleCreateGoal = async (goalData: Omit<CustomGoal, 'id' | 'userId' | 'isCompleted' | 'createdAt' | 'completedAt'>) => {
    await createCustomGoal(goalData);
  };

  const handleUpdateGoal = async (goalId: string, currentValue: number) => {
    await updateCustomGoal(goalId, currentValue);
  };

  const filteredGoals = userProgress?.customGoals.filter(goal => {
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
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
          className="flex justify-center mb-8"
        >
          <div className="bg-white rounded-lg p-1 shadow-md">
            {[
              { key: 'all', label: 'الكل', icon: '📋' },
              { key: 'active', label: 'نشط', icon: '🔄' },
              { key: 'completed', label: 'مكتمل', icon: '✅' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  filter === tab.key
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Create Goal Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl"
          >
            ➕ إنشاء هدف جديد
          </button>
        </motion.div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {filteredGoals.map((goal, index) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white rounded-xl shadow-lg p-6 border-2 ${
                  goal.isCompleted
                    ? 'border-green-200 bg-green-50'
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {goal.title}
                    </h3>
                    {goal.description && (
                      <p className="text-gray-600 text-sm mb-3">
                        {goal.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span className="bg-gray-100 px-2 py-1 rounded-full">
                        {goal.category}
                      </span>
                      <span>•</span>
                      <span>{goal.unit}</span>
                    </div>
                  </div>
                  <div className={`text-2xl ${goal.isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                    {goal.isCompleted ? '✅' : '🎯'}
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>التقدم الحالي</span>
                    <span>
                      {goal.currentValue} / {goal.targetValue} {goal.unit}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min((goal.currentValue / goal.targetValue) * 100, 100)}%`
                      }}
                      className={`h-3 rounded-full ${
                        goal.isCompleted
                          ? 'bg-green-500'
                          : 'bg-gradient-to-r from-emerald-400 to-green-500'
                      }`}
                    />
                  </div>
                  <div className="text-right mt-1">
                    <span className={`text-sm font-medium ${
                      goal.isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {Math.round((goal.currentValue / goal.targetValue) * 100)}%
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                {!goal.isCompleted && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUpdateGoal(goal.id, goal.currentValue + 1)}
                      className="flex-1 bg-emerald-100 text-emerald-700 py-2 px-4 rounded-lg font-medium hover:bg-emerald-200 transition-colors"
                    >
                      + إضافة تقدم
                    </button>
                    <button
                      onClick={() => handleUpdateGoal(goal.id, goal.targetValue)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      إكمال
                    </button>
                  </div>
                )}

                {goal.isCompleted && goal.completedAt && (
                  <div className="text-center text-green-600 text-sm font-medium">
                    تم الإكمال في {new Date(goal.completedAt).toLocaleDateString('ar-SA')}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredGoals.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
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
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              إنشاء أول هدف
            </button>
          </motion.div>
        )}
      </div>

      {/* Create Goal Modal */}
      <CreateGoalModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateGoal={handleCreateGoal}
      />

      {/* Achievement Toast */}
      <AchievementToast
        achievement={currentAchievement}
        onClose={clearAchievementNotification}
      />
    </div>
  );
}
