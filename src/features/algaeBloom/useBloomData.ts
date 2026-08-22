import { useState, useEffect } from 'react';
import { BloomData, fetchBloomData, fetchHoopaMonitoring, LocalMonitoringStation } from '../../api/bloomService';

export type DateFilterOption = 14 | 30 | 60 | 90;

const isValidDate = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
};

export const getMostRecentDate = (item: BloomData): Date | null => {
  const dates = [item.Bloom_Date_Created, item.Advisory_Date, item.Observation_Date]
    .filter((date): date is string => Boolean(date && isValidDate(date)))
    .map((date) => new Date(date));

  return dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
};

const filterDataByDays = (data: BloomData[], days: DateFilterOption): BloomData[] => {
  const today = new Date();
  
  return data.filter(item => {
    const mostRecentDate = getMostRecentDate(item);
    if (!mostRecentDate) return false;

    const daysSince = (today.getTime() - mostRecentDate.getTime()) / (1000 * 3600 * 24);
    return daysSince >= -1 && daysSince <= days;
  });
};

export const useBloomData = () => {
  const [bloomData, setBloomData] = useState<BloomData[]>([]);
  const [filteredData, setFilteredData] = useState<BloomData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedDays, setUpdatedDays] = useState<DateFilterOption>(30);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [localMonitoring, setLocalMonitoring] = useState<LocalMonitoringStation[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [data, monitoring] = await Promise.all([
          fetchBloomData(),
          fetchHoopaMonitoring().catch(() => null),
        ]);
        setBloomData(data.records);
        setFetchedAt(data.fetchedAt);
        setSourceUrl(data.sourceUrl || null);
        setLocalMonitoring(monitoring?.stations ?? []);
        setIsLoading(false);
      } catch (err) {
        setError('Error fetching bloom data');
        setIsLoading(false);
        console.error('Error fetching bloom data:', err);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (bloomData.length > 0) {
      const filtered = filterDataByDays(bloomData, updatedDays);
      setFilteredData(filtered);
    }
  }, [bloomData, updatedDays]);

  return {
    bloomData: filteredData,
    isLoading,
    error,
    updatedDays,
    setUpdatedDays,
    fetchedAt,
    sourceUrl,
    localMonitoring,
  };
};
