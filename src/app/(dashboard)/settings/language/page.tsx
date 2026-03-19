'use client';

/**
 * 🌍 صفحة اللغة والمنطقة - Language & Region Settings
 * 
 * إعدادات اللغة والمنطقة مع:
 * - اختيار اللغة
 * - المنطقة الزمنية
 * - تنسيق التاريخ والوقت
 * - تنسيق الأرقام
 */

import { useState, useEffect, useCallback } from 'react';
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
import { useSettingsSync } from '@/hooks/useSettingsSync';
import {
  DEFAULT_LANGUAGE_SETTINGS,
  type LanguageSettingsPreference,
} from '@/types/settings-preferences';
import {
  fetchSettingsPreferences,
  saveSettingsPreferences,
} from '@/app/(dashboard)/settings/preferences-client';

const languages = [
  { code: 'ar', name: 'العربية', flag: '🇸🇦', direction: 'rtl' },
  { code: 'en', name: 'English', flag: '🇺🇸', direction: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', direction: 'ltr' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰', direction: 'rtl' },
];

const timezones = [
  { value: 'Asia/Riyadh', label: 'توقيت الرياض (GMT+3)', region: 'السعودية' },
  { value: 'Africa/Cairo', label: 'توقيت القاهرة (GMT+2)', region: 'مصر' },
  { value: 'Asia/Dubai', label: 'توقيت دبي (GMT+4)', region: 'الإمارات' },
  { value: 'Asia/Kuwait', label: 'توقيت الكويت (GMT+3)', region: 'الكويت' },
  { value: 'Asia/Amman', label: 'توقيت عمان (GMT+3)', region: 'الأردن' },
  { value: 'Europe/London', label: 'توقيت لندن (GMT+0)', region: 'بريطانيا' },
  { value: 'America/New_York', label: 'توقيت نيويورك (GMT-5)', region: 'أمريكا' },
];

const dateFormats = [
  { value: 'DD/MM/YYYY', example: '25/12/2025' },
  { value: 'MM/DD/YYYY', example: '12/25/2025' },
  { value: 'YYYY-MM-DD', example: '2025-12-25' },
  { value: 'DD-MM-YYYY', example: '25-12-2025' },
];

const currencies = [
  { code: 'SAR', name: 'ريال سعودي', symbol: '﷼' },
  { code: 'EGP', name: 'جنيه مصري', symbol: 'ج.م' },
  { code: 'AED', name: 'درهم إماراتي', symbol: 'د.إ' },
  { code: 'KWD', name: 'دينار كويتي', symbol: 'د.ك' },
  { code: 'USD', name: 'دولار أمريكي', symbol: '$' },
  { code: 'EUR', name: 'يورو', symbol: '€' },
];

export default function LanguageSettingsPage() {
  const { syncFromLocalStorage, applySettingsFromPreferences } = useSettingsSync();
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
        // First sync from localStorage to get any local changes
        const syncedPreferences = await syncFromLocalStorage();
        if (!mounted) return;
        
        if (syncedPreferences) {
          setSettings(syncedPreferences.language);
          // Apply all settings for immediate visual feedback
          applySettingsFromPreferences(syncedPreferences);
        } else {
          // Fallback to regular fetch
          const preferences = await fetchSettingsPreferences();
          if (!mounted) return;
          setSettings(preferences.language);
          applySettingsFromPreferences(preferences);
        }
      } catch {
        if (!mounted) return;
        setSettings({ ...DEFAULT_LANGUAGE_SETTINGS });
        toast.error('فشل تحميل إعدادات اللغة');
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
  }, [syncFromLocalStorage, applySettingsFromPreferences]);

  // Apply language direction (RTL/LTR)
  const applyLanguageDirection = useCallback((language: string) => {
    const selectedLang = languages.find(l => l.code === language);
    if (selectedLang) {
      document.documentElement.dir = selectedLang.direction;
      document.documentElement.lang = language;
      // Store in localStorage for persistence
      localStorage.setItem('language', language);
      localStorage.setItem('direction', selectedLang.direction);
    }
  }, []);

  // Apply number format
  const applyNumberFormat = useCallback((numberFormat: 'arabic' | 'english') => {
    document.documentElement.classList.toggle('arabic-numbers', numberFormat === 'arabic');
    localStorage.setItem('numberFormat', numberFormat);
  }, []);

  // Apply timezone
  const applyTimezone = useCallback((timezone: string) => {
    localStorage.setItem('timezone', timezone);
  }, []);

  // Apply all language settings on initial load
  useEffect(() => {
    if (!isLoading && settings) {
      applyLanguageDirection(settings.language);
      applyNumberFormat(settings.numberFormat);
      applyTimezone(settings.timezone);
    }
  }, [isLoading, settings, applyLanguageDirection, applyNumberFormat, applyTimezone]);

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

    // Apply changes immediately for visual feedback
    if (key === 'language') {
      applyLanguageDirection(value as string);
    } else if (key === 'numberFormat') {
      applyNumberFormat(value as 'arabic' | 'english');
    } else if (key === 'timezone') {
      applyTimezone(value as string);
    }
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
            اللغة والمنطقة
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            تخصيص اللغة والتوقيت وتنسيق التاريخ
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
            حفظ التغييرات
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
            <p className="text-sm text-slate-400 mb-2">الوقت الحالي</p>
            <p className="text-4xl font-bold text-white font-mono">
              {formatTime(currentTime)}
            </p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-sm text-slate-400 mb-2">التاريخ</p>
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
            اللغة
          </h3>
          <p className="text-xs text-slate-400 mt-1">لغة عرض التطبيق</p>
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
            المنطقة الزمنية
          </h3>
          <p className="text-xs text-slate-400 mt-1">اختر منطقتك الزمنية</p>
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
            تنسيق التاريخ والوقت
          </h3>
          <p className="text-xs text-slate-400 mt-1">تخصيص طريقة عرض التاريخ والوقت</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Calendar Type */}
          <div>
            <label className="text-sm font-medium text-white mb-4 block">نوع التقويم</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'gregorian', label: 'ميلادي', example: '2025' },
                { value: 'hijri', label: 'هجري', example: '1446' },
                { value: 'both', label: 'كلاهما', example: '2025 / 1446' },
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
            <label className="text-sm font-medium text-white mb-4 block">تنسيق التاريخ</label>
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
            <label className="text-sm font-medium text-white mb-4 block">تنسيق الوقت</label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: '12h', label: '12 ساعة', example: '2:30 م' },
                { value: '24h', label: '24 ساعة', example: '14:30' },
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
            <label className="text-sm font-medium text-white mb-4 block">بداية الأسبوع</label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'saturday', label: 'السبت' },
                { value: 'sunday', label: 'الأحد' },
                { value: 'monday', label: 'الإثنين' },
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
            الأرقام والعملة
          </h3>
          <p className="text-xs text-slate-400 mt-1">تنسيق الأرقام والعملة الافتراضية</p>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Number Format */}
          <div>
            <label className="text-sm font-medium text-white mb-4 block">تنسيق الأرقام</label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'arabic', label: 'أرقام عربية', example: '١٢٣٤٥' },
                { value: 'english', label: 'أرقام إنجليزية', example: '12345' },
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
            <label className="text-sm font-medium text-white mb-4 block">العملة الافتراضية</label>
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
