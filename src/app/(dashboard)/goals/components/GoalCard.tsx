"use client";

import { m } from "framer-motion";
import { CustomGoal } from '@/hooks/use-gamification';

interface GoalCardProps {
  goal: CustomGoal;
  onUpdateProgress: (goalId: string, newValue: number) => void;
  onComplete: (goalId: string, targetValue: number) => void;
}

export function GoalCard({ goal, onUpdateProgress, onComplete }: GoalCardProps) {
  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
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
              {'Goal'}
            </span>
            <span>⬢</span>
            <span>{''}</span>
          </div>
        </div>
        <div className={`text-2xl ${goal.isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
          {goal.isCompleted ? 'âœ…' : 'ًںژ¯'}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>التقدم الحالي</span>
          <span>
            {goal.currentValue} / {goal.targetValue} {''}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <m.div
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
            onClick={() => onUpdateProgress(goal.id, goal.currentValue + 1)}
            className="flex-1 bg-emerald-100 text-emerald-700 py-2 px-4 rounded-lg font-medium hover:bg-emerald-200 transition-colors"
          >
            + إضافة تقدم
          </button>
          <button
            onClick={() => onComplete(goal.id, goal.targetValue)}
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
    </m.div>
  );
}
