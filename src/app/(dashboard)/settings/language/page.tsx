'use client';

/**
 * ًںŒچ طµظپط­ط© ط§ظ„ظ„ط؛ط© ظˆط§ظ„ظ…ظ†ط·ظ‚ط© - Language & Region Settings
 * 
 * ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ظ„ط؛ط© ظˆط§ظ„ظ…ظ†ط·ظ‚ط© ظ…ط¹:
 * - ط§ط®طھظٹط§ط± ط§ظ„ظ„ط؛ط©
 * - ط§ظ„ظ…ظ†ط·ظ‚ط© ط§ظ„ط²ظ…ظ†ظٹط©
 * - طھظ†ط³ظٹظ‚ ط§ظ„طھط§ط±ظٹط® ظˆط§ظ„ظˆظ‚طھ
 * - طھظ†ط³ظٹظ‚ ط§ظ„ط£ط±ظ‚ط§ظ…
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Clock,
  Calendar,
  Languages,
  Hash,
  Loader2,
  Check,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DEFAULT_LANGUAGE_SETTINGS,
  type LanguageSettingsPreference,
} from '@/types/settings-preferences';
import {
  fetchSettingsPreferences,
  saveSettingsPreferences,
} from '@/app/(dashboard)/settings/preferences-client';

const languages = [
  { code: 'ar', name: 'ط§ظ„ط¹ط±ط¨ظٹط©', flag: 'ًں‡¸ًں‡¦', direction: 'rtl' },
  { code: 'en', name: 'English', flag: 'ًں‡؛ًں‡¸', direction: 'ltr' },
  { code: 'fr', name: 'Franأ§ais', flag: 'ًں‡«ًں‡·', direction: 'ltr' },
  { code: 'ur', name: 'ط§ط±ط¯ظˆ', flag: 'ًں‡µًں‡°', direction: 'rtl' },
];

const timezones = [
  { value: 'Asia/Riyadh', label: 'طھظˆظ‚ظٹطھ ط§ظ„ط±ظٹط§ط¶ (GMT+3)', region: 'ط§ظ„ط³ط¹ظˆط¯ظٹط©' },
  { value: 'Africa/Cairo', label: 'طھظˆظ‚ظٹطھ ط§ظ„ظ‚ط§ظ‡ط±ط© (GMT+2)', region: 'ظ…طµط±' },
  { value: 'Asia/Dubai', label: 'طھظˆظ‚ظٹطھ ط¯ط¨ظٹ (GMT+4)', region: 'ط§ظ„ط¥ظ…ط§ط±ط§طھ' },
  { value: 'Asia/Kuwait', label: 'طھظˆظ‚ظٹطھ ط§ظ„ظƒظˆظٹطھ (GMT+3)', region: 'ط§ظ„ظƒظˆظٹطھ' },
  { value: 'Asia/Amman', label: 'طھظˆظ‚ظٹطھ ط¹ظ…ط§ظ† (GMT+3)', region: 'ط§ظ„ط£ط±ط¯ظ†' },
  { value: 'Europe/London', label: 'طھظˆظ‚ظٹطھ ظ„ظ†ط¯ظ† (GMT+0)', region: 'ط¨ط±ظٹط·ط§ظ†ظٹط§' },
  { value: 'America/New_York', label: 'طھظˆظ‚ظٹطھ ظ†ظٹظˆظٹظˆط±ظƒ (GMT-5)', region: 'ط£ظ…ط±ظٹظƒط§' },
];

const dateFormats = [
  { value: 'DD/MM/YYYY', example: '25/12/2025' },
  { value: 'MM/DD/YYYY', example: '12/25/2025' },
  { value: 'YYYY-MM-DD', example: '2025-12-25' },
  { value: 'DD-MM-YYYY', example: '25-12-2025' },
];

const currencies = [
  { code: 'SAR', name: 'ط±ظٹط§ظ„ ط³ط¹ظˆط¯ظٹ', symbol: 'ï·¼' },
  { code: 'EGP', name: 'ط¬ظ†ظٹظ‡ ظ…طµط±ظٹ', symbol: 'ط¬.ظ…' },
  { code: 'AED', name: 'ط¯ط±ظ‡ظ… ط¥ظ…ط§ط±ط§طھظٹ', symbol: 'ط¯.ط¥' },
  { code: 'KWD', name: 'ط¯ظٹظ†ط§ط± ظƒظˆظٹطھظٹ', symbol: 'ط¯.ظƒ' },
  { code: 'USD', name: 'ط¯ظˆظ„ط§ط± ط£ظ…ط±ظٹظƒظٹ', symbol: '$' },
  { code: 'EUR', name: 'ظٹظˆط±ظˆ', symbol: 'â‚¬' },
];

export default function LanguageSettingsPage() {
  const [settings, setSettings] = useState<LanguageSettingsPreference>({ ...DEFAULT_LANGUAGE_SETTINGS });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const preferences = await fetchSettingsPreferences();
        if (!mounted) return;
        setSettings(preferences.language);
      } catch {
        if (!mounted) return;
        setSettings({ ...DEFAULT_LANGUAGE_SETTINGS });
        toast.error('ظپط´ظ„ طھط­ظ…ظٹظ„ ط¥ط¹ط¯ط§ط¯ط§طھ ط§ظ„ظ„ط؛ط©');
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

  // Update current time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateSetting = <K extends keyof LanguageSettingsPreference>(
    key: K,
    value: LanguageSettingsPreference[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedPreferences = await saveSettingsPreferences({
        language: settings,
      });
      setSettings(updatedPreferences.language);
      toast.success('تم حفظ إعدادات اللغة والمنطقة');
      setHasChanges(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ الإعدادات';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: settings.timeFormat === '12h',
      timeZone: settings.timezone,
    };
    return new Intl.DateTimeFormat(settings.language, options).format(date);
  };

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: settings.timezone,
    };
    if (settings.calendar === 'hijri') {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', options).format(date);
    }
    return new Intl.DateTimeFormat(settings.language, options).format(date);
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
            <Globe className="h-7 w-7 text-indigo-400" />
            ط§ظ„ظ„ط؛ط© ظˆط§ظ„ظ…ظ†ط·ظ‚ط©
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            طھط®طµظٹطµ ط§ظ„ظ„ط؛ط© ظˆط§ظ„طھظˆظ‚ظٹطھ ظˆطھظ†ط³ظٹظ‚ ط§ظ„طھط§ط±ظٹط®
          </p>
        </div>
        
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

      {/* Current Time Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 p-6"
      >
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="text-center sm:text-right">
            <p className="text-sm text-slate-400 mb-2">ط§ظ„ظˆظ‚طھ ط§ظ„ط­ط§ظ„ظٹ</p>
            <p className="text-4xl font-bold text-white font-mono">
              {formatTime(currentTime)}
            </p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-sm text-slate-400 mb-2">ط§ظ„طھط§ط±ظٹط®</p>
            <p className="text-xl font-medium text-white">
              {formatDate(currentTime)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Language Selection */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Languages className="h-5 w-5 text-indigo-400" />
            ط§ظ„ظ„ط؛ط©
          </h3>
          <p className="text-xs text-slate-400 mt-1">ظ„ط؛ط© ط¹ط±ط¶ ط§ظ„طھط·ط¨ظٹظ‚</p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {languages.map((lang) => {
              const isSelected = settings.language === lang.code;
              
              return (
                <motion.button
                  key={lang.code}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateSetting('language', lang.code)}
                  className={cn(
                    'relative flex flex-col items-center gap-3 p-4 rounded-xl border transition-all',
                    isSelected
                      ? 'bg-indigo-500/20 border-indigo-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                >
                  <span className="text-4xl">{lang.flag}</span>
                  <span className={cn('font-medium', isSelected ? 'text-white' : 'text-slate-300')}>
                    {lang.name}
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

      {/* Timezone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-400" />
            ط§ظ„ظ…ظ†ط·ظ‚ط© ط§ظ„ط²ظ…ظ†ظٹط©
          </h3>
          <p className="text-xs text-slate-400 mt-1">ط§ط®طھط± ظ…ظ†ط·ظ‚طھظƒ ط§ظ„ط²ظ…ظ†ظٹط©</p>
        </div>
        
        <div className="p-6">
          <div className="grid gap-3">
            {timezones.map((tz) => {
              const isSelected = settings.timezone === tz.value;
              
              return (
                <motion.button
                  key={tz.value}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => updateSetting('timezone', tz.value)}
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl border transition-all text-right',
                    isSelected
                      ? 'bg-indigo-500/20 border-indigo-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      isSelected ? 'bg-indigo-500/30' : 'bg-white/10'
                    )}>
                      <MapPin className={cn('h-5 w-5', isSelected ? 'text-indigo-400' : 'text-slate-400')} />
                    </div>
                    <div>
                      <p className={cn('font-medium', isSelected ? 'text-white' : 'text-slate-300')}>
                        {tz.label}
                      </p>
                      <p className="text-xs text-slate-500">{tz.region}</p>
                    </div>
                  </div>
                  
                  {isSelected && <Check className="h-5 w-5 text-indigo-400" />}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Date & Time Format */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-400" />
            طھظ†ط³ظٹظ‚ ط§ظ„طھط§ط±ظٹط® ظˆط§ظ„ظˆظ‚طھ
          </h3>
          <p className="text-xs text-slate-400 mt-1">طھط®طµظٹطµ ط·ط±ظٹظ‚ط© ط¹ط±ط¶ ط§ظ„طھط§ط±ظٹط® ظˆط§ظ„ظˆظ‚طھ</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Calendar Type */}
          <div>
            <label className="text-sm font-medium text-white mb-4 block">ظ†ظˆط¹ ط§ظ„طھظ‚ظˆظٹظ…</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'gregorian', label: 'ظ…ظٹظ„ط§ط¯ظٹ', example: '2025' },
                { value: 'hijri', label: 'ظ‡ط¬ط±ظٹ', example: '1446' },
                { value: 'both', label: 'ظƒظ„ط§ظ‡ظ…ط§', example: '2025 / 1446' },
              ].map((cal) => {
                const isSelected = settings.calendar === cal.value;
                
                return (
                  <motion.button
                    key={cal.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateSetting('calendar', cal.value as LanguageSettingsPreference['calendar'])}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}
                  >
                    <Calendar className={cn('h-6 w-6', isSelected ? 'text-indigo-400' : 'text-slate-400')} />
                    <span className={cn('font-medium', isSelected ? 'text-white' : 'text-slate-300')}>
                      {cal.label}
                    </span>
                    <span className="text-xs text-slate-500">{cal.example}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
          
          {/* Date Format */}
          <div>
            <label className="text-sm font-medium text-white mb-4 block">طھظ†ط³ظٹظ‚ ط§ظ„طھط§ط±ظٹط®</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {dateFormats.map((format) => {
                const isSelected = settings.dateFormat === format.value;
                
                return (
                  <motion.button
                    key={format.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateSetting('dateFormat', format.value)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}
                  >
                    <span className="text-xs text-slate-400 font-mono">{format.value}</span>
                    <span className={cn('font-medium', isSelected ? 'text-white' : 'text-slate-300')}>
                      {format.example}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
          
          {/* Time Format */}
          <div>
            <label className="text-sm font-medium text-white mb-4 block">طھظ†ط³ظٹظ‚ ط§ظ„ظˆظ‚طھ</label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '12h', label: '12 ط³ط§ط¹ط©', example: '2:30 ظ…' },
                { value: '24h', label: '24 ط³ط§ط¹ط©', example: '14:30' },
              ].map((format) => {
                const isSelected = settings.timeFormat === format.value;
                
                return (
                  <motion.button
                    key={format.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateSetting('timeFormat', format.value as '12h' | '24h')}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl border transition-all',
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}
                  >
                    <span className={cn('font-medium', isSelected ? 'text-white' : 'text-slate-300')}>
                      {format.label}
                    </span>
                    <span className="text-slate-400 font-mono">{format.example}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
          
          {/* First Day of Week */}
          <div>
            <label className="text-sm font-medium text-white mb-4 block">ط¨ط¯ط§ظٹط© ط§ظ„ط£ط³ط¨ظˆط¹</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'saturday', label: 'ط§ظ„ط³ط¨طھ' },
                { value: 'sunday', label: 'ط§ظ„ط£ط­ط¯' },
                { value: 'monday', label: 'ط§ظ„ط¥ط«ظ†ظٹظ†' },
              ].map((day) => {
                const isSelected = settings.firstDayOfWeek === day.value;
                
                return (
                  <motion.button
                    key={day.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateSetting('firstDayOfWeek', day.value as LanguageSettingsPreference['firstDayOfWeek'])}
                    className={cn(
                      'p-4 rounded-xl border transition-all text-center',
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                    )}
                  >
                    {day.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Number Format & Currency */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Hash className="h-5 w-5 text-indigo-400" />
            ط§ظ„ط£ط±ظ‚ط§ظ… ظˆط§ظ„ط¹ظ…ظ„ط©
          </h3>
          <p className="text-xs text-slate-400 mt-1">طھظ†ط³ظٹظ‚ ط§ظ„ط£ط±ظ‚ط§ظ… ظˆط§ظ„ط¹ظ…ظ„ط© ط§ظ„ط§ظپطھط±ط§ط¶ظٹط©</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Number Format */}
          <div>
            <label className="text-sm font-medium text-white mb-4 block">طھظ†ط³ظٹظ‚ ط§ظ„ط£ط±ظ‚ط§ظ…</label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'arabic', label: 'ط£ط±ظ‚ط§ظ… ط¹ط±ط¨ظٹط©', example: 'ظ،ظ¢ظ£ظ¤ظ¥' },
                { value: 'english', label: 'ط£ط±ظ‚ط§ظ… ط¥ظ†ط¬ظ„ظٹط²ظٹط©', example: '12345' },
              ].map((format) => {
                const isSelected = settings.numberFormat === format.value;
                
                return (
                  <motion.button
                    key={format.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateSetting('numberFormat', format.value as 'arabic' | 'english')}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-xl border transition-all',
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}
                  >
                    <span className={cn('font-medium', isSelected ? 'text-white' : 'text-slate-300')}>
                      {format.label}
                    </span>
                    <span className="text-lg font-mono text-slate-400">{format.example}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
          
          {/* Currency */}
          <div>
            <label className="text-sm font-medium text-white mb-4 block">ط§ظ„ط¹ظ…ظ„ط© ط§ظ„ط§ظپطھط±ط§ط¶ظٹط©</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {currencies.map((currency) => {
                const isSelected = settings.currency === currency.code;
                
                return (
                  <motion.button
                    key={currency.code}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateSetting('currency', currency.code)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all',
                      isSelected
                        ? 'bg-indigo-500/20 border-indigo-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    )}
                  >
                    <span className="text-lg font-bold text-indigo-400">{currency.symbol}</span>
                    <div className="text-right">
                      <p className={cn('font-medium text-sm', isSelected ? 'text-white' : 'text-slate-300')}>
                        {currency.name}
                      </p>
                      <p className="text-xs text-slate-500">{currency.code}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
