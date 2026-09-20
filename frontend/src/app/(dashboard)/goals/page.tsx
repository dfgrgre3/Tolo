"use client";

import { useState } from 'react';
import { useGamification, CustomGoal } from '@/features/gamification';
import { AchievementToast } from '@/components/gamification/AchievementToast';
import { CreateGoalModal } from './components/CreateGoalModal';
import { GoalCard } from './components/GoalCard';

export default function GoalsPage() {
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
    enableNotifications: true
  });

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
    // `m.*` here (and in GoalCard/CreateGoalModal) is animated by the global
    // LazyMotion provider in providers/index.tsx â€” do not add a nested one
    // here, it can desync from the root provider's context under HMR.
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div
          className="text-center mb-8">
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            ðŸŽ¯ Ø£Ù‡Ø¯Ø§ÙÙŠ Ø§Ù„Ù…Ø®ØµØµØ©
          </h1>
          <p className="text-gray-600">
            Ø­Ø¯Ø¯ Ø£Ù‡Ø¯Ø§ÙÙƒ Ø§Ù„Ø®Ø§ØµØ© ÙˆØ³Ø¬Ù„ ØªÙ‚Ø¯Ù…Ùƒ Ù†Ø­Ùˆ ØªØ­Ù‚ÙŠÙ‚Ù‡Ø§
          </p>
        </div>

        {/* Filter Tabs */}
        <div
          className="flex justify-center mb-8">
          
          <div className="bg-white rounded-lg p-1 shadow-md">
            {[
            { key: 'all', label: 'Ø§Ù„ÙƒÙ„', icon: 'ðŸ“‹' },
            { key: 'active', label: 'Ù†Ø´Ø·', icon: 'ðŸ”„' },
            { key: 'completed', label: 'Ù…ÙƒØªÙ…Ù„', icon: 'âœ…' }].
            map((tab) =>
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as 'all' | 'active' | 'completed')}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
              filter === tab.key ?
              'bg-emerald-600 text-white shadow-md' :
              'text-gray-600 hover:text-gray-900'}`
              }>
              
                {tab.icon} {tab.label}
              </button>
            )}
          </div>
        </div>

        {/* Create Goal Button */}
        <div
          className="mb-8">
          
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl">
            
            âœ¦ Ø¥Ù†Ø´Ø§Ø¡ Ù‡Ø¯Ù Ø¬Ø¯ÙŠØ¯
          </button>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <>
            {filteredGoals.map((goal, _idx) =>
            <GoalCard
              key={goal.id}
              goal={goal}
              onUpdateProgress={handleUpdateGoal}
              onComplete={handleUpdateGoal} />

            )}
          </>
        </div>

        {filteredGoals.length === 0 &&
        <div
          className="text-center py-16">
          
            <div className="text-6xl mb-4">ðŸŽ¯</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ù‡Ø¯Ø§Ù Ø¨Ø¹Ø¯' :
            filter === 'active' ? 'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ù‡Ø¯Ø§Ù Ù†Ø´Ø·Ø©' :
            'Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ù‡Ø¯Ø§Ù Ù…ÙƒØªÙ…Ù„Ø©'}
            </h3>
            <p className="text-gray-600 mb-6">
              Ø§Ø¨Ø¯Ø£ Ø¨Ø¥Ù†Ø´Ø§Ø¡ Ù‡Ø¯Ù Ø¬Ø¯ÙŠØ¯ Ù„ØªØªØ¨Ø¹ ØªÙ‚Ø¯Ù…Ùƒ
            </p>
            <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors">
            
              Ø¥Ù†Ø´Ø§Ø¡ Ø£ÙˆÙ„ Ù‡Ø¯Ù
            </button>
          </div>
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
