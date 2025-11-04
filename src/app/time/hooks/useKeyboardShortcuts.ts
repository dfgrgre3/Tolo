import { useEffect } from 'react';

interface KeyboardShortcutsConfig {
  onTabChange?: (tab: string) => void;
  onTimerToggle?: () => void;
  onRefresh?: () => void;
  onNewTask?: () => void;
  onNewReminder?: () => void;
  disabled?: boolean;
}

export function useKeyboardShortcuts({
  onTabChange,
  onTimerToggle,
  onRefresh,
  onNewTask,
  onNewReminder,
  disabled = false
}: KeyboardShortcutsConfig) {
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input, textarea, or contenteditable
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ctrl/Cmd + Number keys for tabs
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 6) {
          e.preventDefault();
          const tabs = ['dashboard', 'schedule', 'tasks', 'tracker', 'history', 'reminders'];
          if (onTabChange && tabs[num - 1]) {
            onTabChange(tabs[num - 1]);
          }
        }
      }

      // Ctrl/Cmd + T for timer toggle
      if ((e.ctrlKey || e.metaKey) && e.key === 't' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (onTimerToggle) {
          onTimerToggle();
        }
      }

      // Ctrl/Cmd + R for refresh (but allow default on input focus)
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (onRefresh) {
          onRefresh();
        }
      }

      // Ctrl/Cmd + N for new task
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (onNewTask) {
          onNewTask();
        }
      }

      // Ctrl/Cmd + Shift + N for new reminder
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N' && !e.altKey) {
        e.preventDefault();
        if (onNewReminder) {
          onNewReminder();
        }
      }

      // Escape to close dialogs/modals
      if (e.key === 'Escape') {
        // This will be handled by individual components
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onTabChange, onTimerToggle, onRefresh, onNewTask, onNewReminder, disabled]);
}

