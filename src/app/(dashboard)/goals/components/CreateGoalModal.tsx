import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CustomGoal } from '@/hooks/use-gamification';

interface CreateGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGoal: (goalData: Omit<CustomGoal, 'id' | 'userId' | 'isCompleted' | 'createdAt' | 'completedAt'>) => Promise<void>;
}

export function CreateGoalModal({ isOpen, onClose, onCreateGoal }: CreateGoalModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetValue: '',
    unit: 'count',
    // category: ''
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
      category: 'custom',
      xpReward: 10
    });

    setFormData({
      title: '',
      description: '',
      targetValue: '',
      unit: 'count',
      // category: ''
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
