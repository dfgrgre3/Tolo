/**
 * Function to simulate data fetching based on the selected path filter.
 * في التطبيق الحقيقي، استبدله بـ `fetch('/api/analytics?path=' + path)`
 */
export const fetchAnalyticsData = async (path) => {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const generateDailyProgress = (base) => {
    return Array.from({ length: 7 }, (_, i) => ({
      day: `س${i + 1}`,
      progress: Math.min(100, Math.max(50, base + Math.floor(Math.random() * 15) - 7)),
    }));
  };

  const kpiConfig = {
    'البرمجة': { baseProgress: 85, skillMod: 5, hourMod: 20 },
    'التصميم': { baseProgress: 70, skillMod: 10, hourMod: 5 },
    'الكل': { baseProgress: 75, skillMod: 0, hourMod: 10 }
  }[path] || { baseProgress: 75, skillMod: 0, hourMod: 10 };

  const dailyProgressData = generateDailyProgress(kpiConfig.baseProgress);
  const currentProgressRate = dailyProgressData[dailyProgressData.length - 1].progress;

  const serverData = {
    progressRate: currentProgressRate,
    skillsAcquired: Math.floor(Math.random() * 10) + 20 + kpiConfig.skillMod,
    studyHours: Math.floor(Math.random() * 50) + 120 + kpiConfig.hourMod,
    dailyProgress: dailyProgressData,
    timestamp: new Date().toISOString(),
  };

  return {
    progressRate: serverData.progressRate,
    skillsAcquired: serverData.skilledAcquired,
    studyHours: serverData.studyHours,
    dailyProgress: serverData.dailyProgress,
    lastUpdate: new Date(serverData.timestamp).toLocaleTimeString('ar-EG', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    }),
  };
};