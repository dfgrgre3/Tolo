import React from 'react';

export const ThemeToggle = ({ isDarkMode, onToggle }) => {
  return (
    <button 
      onClick={onToggle}
      className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 transition-colors"
      title={isDarkMode ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"}
    >
      {isDarkMode ? '☀️' : '🌙'}
    </button>
  );
};

export default ThemeToggle;