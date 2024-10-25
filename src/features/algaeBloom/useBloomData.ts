import { useState, useEffect } from 'react';
import { fetchBloomData, BloomData } from '../../api/bloomService';

export type DateFilterOption = 14 | 30 | 60 | 90;

const isValidDate = (dateStr: string): boolean => {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
};

const getMostRecentDate = (item: BloomData): Date | null => {
  const advisoryDate = new Date(item.Advisory_Date);
  const observationDate = new Date(item.Observation_Date);
  
  const validAdvisory = isValidDate(item.Advisory_Date);
  const validObservation = isValidDate(item.Observation_Date);

  if (!validAdvisory && !validObservation) return null;
  if (!validAdvisory) return observationDate;
  if (!validObservation) return advisoryDate;
  
  return advisoryDate > observationDate ? advisoryDate : observationDate;
};

const filterDataByDays = (data: BloomData[], days: DateFilterOption): BloomData[] => {
  const today = new Date();
  
  return data.filter(item => {
    const mostRecentDate = getMostRecentDate(item);
    if (!mostRecentDate) return true; // Include items with no valid dates
    
    const timeDiff = Math.abs(today.getTime() - mostRecentDate.getTime());
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff <= days;
  });
};

export const useBloomData = () => {
  const [bloomData, setBloomData] = useState<BloomData[]>([]);
  const [filteredData, setFilteredData] = useState<BloomData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedDays, setUpdatedDays] = useState<DateFilterOption>(30);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchBloomData();
        setBloomData(data);
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
    setUpdatedDays
  };
};
