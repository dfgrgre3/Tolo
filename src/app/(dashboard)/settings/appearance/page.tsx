'use client';

/**
 * ًںژ¨ طµظپط­ط© ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ظ…ط¸ظ‡ط± - Appearance Settings
 * 
 * طھط®طµظٹطµ ظ…ط¸ظ‡ط± ط§ظ„طھط·ط¨ظٹظ‚ ظ…ط¹:
 * - ط§ظ„ط³ظ…ط§طھ (ظپط§طھط­/ط¯ط§ظƒظ†/طھظ„ظ‚ط§ط¦ظٹ)
 * - ط£ظ„ظˆط§ظ† ظ…ط®طµطµط©
 * - ط­ط¬ظ… ط§ظ„ط®ط·
 * - طھط¹ط¯ظٹظ„ط§طھ ط§ظ„ظˆط§ط¬ظ‡ط©
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Palette,
  Sun,
  Moon,
  Monitor,
  Type,
  Sparkles,
  Eye,
  Layout,
  Loader2,
  Check,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DEFAULT_APPEARANCE_SETTINGS,
  type AppearanceSettingsPreference,
} from '@/types/settings-preferences';
import {
  fetchSettingsPreferences,
  saveSettingsPreferences,
} from '@/app/(dashboard)/settings/preferences-client';

const colorPresets = [
  { name: 'ط¨ظ†ظپط³ط¬ظٹ', primary: '#6366f1', accent: '#8b5cf6' },
  { name: 'ط£ط²ط±ظ‚', primary: '#3b82f6', accent: '#0ea5e9' },
  { name: 'ط£ط®ط¶ط±', primary: '#22c55e', accent: '#10b981' },
  { name: 'ط¨ط±طھظ‚ط§ظ„ظٹ', primary: '#f97316', accent: '#fb923c' },
  { name: 'ظˆط±ط¯ظٹ', primary: '#ec4899', accent: '#f472b6' },
  { name: 'ط£ط­ظ…ط±', primary: '#ef4444', accent: '#f87171' },
];

const fontOptions = [
  { value: 'system', label: 'ط®ط· ط§ظ„ظ†ط¸ط§ظ…', sample: 'ط£ ط¨ طھ' },
  { value: 'cairo', label: 'Cairo', sample: 'ط£ ط¨ طھ' },
  { value: 'tajawal', label: 'Tajawal', sample: 'ط£ ط¨ طھ' },
  { value: 'noto-kufi', label: 'Noto Kufi', sample: 'ط£ ط¨ طھ' },
];

const fontSizes = [
  { value: 'small', label: 'طµط؛ظٹط±', size: '14px' },
  { value: 'medium', label: 'ظ…طھظˆط³ط·', size: '16px' },
  { value: 'large', label: 'ظƒط¨ظٹط±', size: '18px' },
  { value: 'xlarge', label: 'ظƒط¨ظٹط± ط¬ط¯ط§ظ‹', size: '20px' },
];

export default function AppearanceSettingsPage() {
  const [settings, setSettings] = useState<AppearanceSettingsPreference>({ ...DEFAULT_APPEARANCE_SETTINGS });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const preferences = await fetchSettingsPreferences();
        if (!mounted) return;
        setSettings(preferences.appearance);
      } catch {
        if (!mounted) return;
        setSettings({ ...DEFAULT_APPEARANCE_SETTINGS });
        toast.error('ظپط´ظ„ طھط­ظ…ظٹظ„ ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ظ…ط¸ظ‡ط±');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const updateSetting = <K extends keyof AppearanceSettingsPreference>(
    key: K,
    value: AppearanceSettingsPreference[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedPreferences = await saveSettingsPreferences({
        appearance: settings,
      });
      setSettings(updatedPreferences.appearance);
      toast.success('تم حفظ إعدادات المظهر');
      setHasChanges(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ الإعدادات';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_APPEARANCE_SETTINGS });
    setHasChanges(true);
    toast.info('طھظ… ط¥ط¹ط§ط¯ط© ط§ظ„ط¥ط¹ط¯ط§ط¯ط§طھ ظ„ظ„ظ‚ظٹظ… ط§ظ„ط§ظپطھط±ط§ط¶ظٹط©');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Palette className="h-7 w-7 text-indigo-400" />
            ط§ظ„ظ…ط¸ظ‡ط±
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            طھط®طµظٹطµ ظ…ط¸ظ‡ط± ط§ظ„طھط·ط¨ظٹظ‚ ظˆط£ظ„ظˆط§ظ†ظ‡
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
            ط¥ط¹ط§ط¯ط© طھط¹ظٹظٹظ†
          </motion.button>
          
          {hasChanges && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              ط­ظپط¸ ط§ظ„طھط؛ظٹظٹط±ط§طھ
            </motion.button>
          )}
        </div>
      </div>

      {/* Theme Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Sun className="h-5 w-5 text-indigo-400" />
            ط§ظ„ط³ظ…ط©
          </h3>
          <p className="text-xs text-slate-400 mt-1">ط§ط®طھط± ط³ظ…ط© ط§ظ„ط¹ط±ط¶ ط§ظ„ظ…ظپط¶ظ„ط©</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: 'light', label: 'ظپط§طھط­', icon: Sun },
              { value: 'dark', label: 'ط¯ط§ظƒظ†', icon: Moon },
              { value: 'system', label: 'طھظ„ظ‚ط§ط¦ظٹ', icon: Monitor },
            ].map((theme) => {
              const Icon = theme.icon;
              const isSelected = settings.theme === theme.value;
              
              return (
                <motion.button
                  key={theme.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateSetting('theme', theme.value as AppearanceSettingsPreference['theme'])}
                  className={cn(
                    'relative flex flex-col items-center gap-3 p-6 rounded-xl border transition-all',
                    isSelected
                      ? 'bg-indigo-500/20 border-indigo-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="selectedTheme"
                      className="absolute inset-0 rounded-xl border-2 border-indigo-500"
                    />
                  )}
                  
                  <div className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-xl',
                    isSelected ? 'bg-indigo-500/30' : 'bg-white/10'
                  )}>
                    <Icon className={cn('h-8 w-8', isSelected ? 'text-indigo-400' : 'text-slate-400')} />
                  </div>
                  
                  <span className={cn('font-medium', isSelected ? 'text-white' : 'text-slate-300')}>
                    {theme.label}
                  </span>
                  
                  {isSelected && (
                    <div className="absolute top-2 left-2">
                      <Check className="h-5 w-5 text-indigo-400" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Color Presets */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            ط§ظ„ط£ظ„ظˆط§ظ†
          </h3>
          <p className="text-xs text-slate-400 mt-1">ط§ط®طھط± ظ„ظˆط­ط© ط§ظ„ط£ظ„ظˆط§ظ† ط§ظ„ظ…ظپط¶ظ„ط©</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {colorPresets.map((preset) => {
              const isSelected = settings.primaryColor === preset.primary;
              
              return (
                <motion.button
                  key={preset.primary}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    updateSetting('primaryColor', preset.primary);
                    updateSetting('accentColor', preset.accent);
                  }}
                  className={cn(
                    'relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all',
                    isSelected
                      ? 'border-white/50'
                      : 'border-transparent hover:border-white/20'
                  )}
                >
                  <div
                    className="h-12 w-12 rounded-full shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${preset.primary}, ${preset.accent})`,
                    }}
                  />
                  <span className="text-xs text-slate-300">{preset.name}</span>
                  
                  {isSelected && (
                    <div className="absolute top-1 left-1">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
          
          {/* Custom Color Picker */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="text-sm font-medium text-white mb-4">ظ„ظˆظ† ظ…ط®طµطµ</h4>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs text-slate-400">ط§ظ„ظ„ظˆظ† ط§ظ„ط±ط¦ظٹط³ظٹ</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => updateSetting('primaryColor', e.target.value)}
                    className="h-10 w-16 rounded-lg cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => updateSetting('primaryColor', e.target.value)}
                    className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-slate-400">ط§ظ„ظ„ظˆظ† ط§ظ„ط«ط§ظ†ظˆظٹ</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    className="h-10 w-16 rounded-lg cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={settings.accentColor}
                    onChange={(e) => updateSetting('accentColor', e.target.value)}
                    className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Typography */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Type className="h-5 w-5 text-indigo-400" />
            ط§ظ„ط®ط· ظˆط§ظ„ظ†طµ
          </h3>
          <p className="text-xs text-slate-400 mt-1">طھط®طµظٹطµ ط§ظ„ط®ط·ظˆط· ظˆط­ط¬ظ… ط§ظ„ظ†طµ</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Font Size */}
          <div>
            <label className="text-sm font-medium text-white mb-4 block">ط­ط¬ظ… ط§ظ„ط®ط·</label>
            <div className="grid grid-cols-4 gap-3">
              {fontSizes.map((size) => {
                const isSelected = settings.fontSize === size.value;
                
                return (
                  <motion.button
                    key={size.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateSetting('fontSize', size.value as AppearanceSettingsPreference['fontSize'])}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}
                  >
                    <span style={{ fontSize: size.size }} className="text-white font-bold">ط£</span>
                    <span className="text-xs text-slate-400">{size.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
          
          {/* Font Family */}
          <div>
            <label className="text-sm font-medium text-white mb-4 block">ظ†ظˆط¹ ط§ظ„ط®ط·</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {fontOptions.map((font) => {
                const isSelected = settings.fontFamily === font.value;
                
                return (
                  <motion.button
                    key={font.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateSetting('fontFamily', font.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}
                  >
                    <span className="text-2xl text-white">{font.sample}</span>
                    <span className="text-xs text-slate-400">{font.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Accessibility & Layout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Eye className="h-5 w-5 text-indigo-400" />
            ط¥ظ…ظƒط§ظ†ظٹط© ط§ظ„ظˆطµظˆظ„
          </h3>
          <p className="text-xs text-slate-400 mt-1">ط¥ط¹ط¯ط§ط¯ط§طھ طھط³ظ‡ظٹظ„ ط§ظ„ظˆطµظˆظ„</p>
        </div>
        
        <div className="p-6 space-y-4">
          <ToggleSetting
            icon={Zap}
            title="طھظ‚ظ„ظٹظ„ ط§ظ„ط­ط±ظƒط©"
            description="ط¥ظٹظ‚ط§ظپ ط§ظ„ط±ط³ظˆظ… ط§ظ„ظ…طھط­ط±ظƒط© ظ„ظ„ط£ط´ط®ط§طµ ط§ظ„ط­ط³ط§ط³ظٹظ† ظ„ظ„ط­ط±ظƒط©"
            enabled={settings.reducedMotion}
            onToggle={(v) => updateSetting('reducedMotion', v)}
          />
          
          <ToggleSetting
            icon={Eye}
            title="طھط¨ط§ظٹظ† ط¹ط§ظ„ظٹ"
            description="ط²ظٹط§ط¯ط© ط§ظ„طھط¨ط§ظٹظ† ظ„طھط­ط³ظٹظ† ظˆط¶ظˆط­ ط§ظ„ط¹ظ†ط§طµط±"
            enabled={settings.highContrast}
            onToggle={(v) => updateSetting('highContrast', v)}
          />
          
          <ToggleSetting
            icon={Layout}
            title="ط§ظ„ظˆط¶ط¹ ط§ظ„ظ…ط¶ط؛ظˆط·"
            description="طھظ‚ظ„ظٹظ„ ط§ظ„ظ…ط³ط§ظپط§طھ ط¨ظٹظ† ط§ظ„ط¹ظ†ط§طµط±"
            enabled={settings.compactMode}
            onToggle={(v) => updateSetting('compactMode', v)}
          />
        </div>
      </motion.div>

      {/* Border Radius */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Layout className="h-5 w-5 text-indigo-400" />
            ط´ظƒظ„ ط§ظ„ط²ظˆط§ظٹط§
          </h3>
          <p className="text-xs text-slate-400 mt-1">طھط®طµظٹطµ ط§ط³طھط¯ط§ط±ط© ط²ظˆط§ظٹط§ ط§ظ„ط¹ظ†ط§طµط±</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-4 gap-4">
            {[
              { value: 'none', label: 'ط­ط§ط¯ط©', radius: '0px' },
              { value: 'small', label: 'طµط؛ظٹط±ط©', radius: '4px' },
              { value: 'medium', label: 'ظ…طھظˆط³ط·ط©', radius: '8px' },
              { value: 'large', label: 'ظƒط¨ظٹط±ط©', radius: '16px' },
            ].map((option) => {
              const isSelected = settings.borderRadius === option.value;
              
              return (
                <motion.button
                  key={option.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateSetting('borderRadius', option.value as AppearanceSettingsPreference['borderRadius'])}
                  className={cn(
                    'flex flex-col items-center gap-3 p-4 border transition-all',
                    isSelected
                      ? 'bg-indigo-500/20 border-indigo-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                  style={{ borderRadius: option.radius }}
                >
                  <div
                    className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600"
                    style={{ borderRadius: option.radius }}
                  />
                  <span className="text-xs text-slate-400">{option.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl border border-indigo-500/30 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${settings.primaryColor}20, ${settings.accentColor}20)`,
        }}
      >
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Eye className="h-5 w-5 text-indigo-400" />
            ظ…ط¹ط§ظٹظ†ط©
          </h3>
        </div>
        
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div
              className="p-4 text-white font-medium"
              style={{
                background: settings.primaryColor,
                borderRadius: settings.borderRadius === 'none' ? '0' : 
                              settings.borderRadius === 'small' ? '4px' :
                              settings.borderRadius === 'medium' ? '8px' : '16px',
              }}
            >
              ط²ط± ط±ط¦ظٹط³ظٹ
            </div>
            <div
              className="p-4 text-white font-medium"
              style={{
                background: settings.accentColor,
                borderRadius: settings.borderRadius === 'none' ? '0' : 
                              settings.borderRadius === 'small' ? '4px' :
                              settings.borderRadius === 'medium' ? '8px' : '16px',
              }}
            >
              ط²ط± ط«ط§ظ†ظˆظٹ
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Toggle Setting Component
function ToggleSetting({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
}: {
  icon: typeof Eye;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          enabled ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-slate-400'
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-medium text-white">{title}</h4>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200',
          enabled ? 'bg-indigo-500' : 'bg-slate-600'
        )}
      >
        <motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
          style={{ left: enabled ? 'calc(100% - 20px)' : '4px' }}
        />
      </button>
    </div>
  );
}
