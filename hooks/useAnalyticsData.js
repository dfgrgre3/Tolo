import { useState, useEffect, useCallback } from 'react';
import { fetchAnalyticsData } from '../utils/api';

export const useAnalyticsData = (initialPath = 'الكل') => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pathFilter, setPathFilter] = useState(initialPath);

  const loadData = useCallback(async (path) => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedData = await fetchAnalyticsData(path);
      setData(fetchedData);
    } catch (err) {
      console.error("Failed to fetch analytics data:", err);
      setError(err.message || "فشل تحميل البيانات. الرجاء التحقق من اتصالك وإعادة المحاولة.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(pathFilter);
  }, [loadData, pathFilter]);

  return {
    data,
    isLoading,
    error,
    pathFilter,
    setPathFilter,
    refreshData: () => loadData(pathFilter)
  };
};