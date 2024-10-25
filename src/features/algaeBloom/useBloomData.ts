import { useState, useEffect } from 'react';
import { fetchBloomData, BloomData } from '../../api/bloomService';

export type DateFilterOption = 14 | 30 | 60 | 90;

const filterDataByDays = (data: BloomData[], days: DateFilterOption, dateField: 'Advisory_Date' | 'Observation_Date'): BloomData[] => {
  const today = new Date();
  return data.filter(item => {
    
    // If the field is empty, don't filter it out
    if (!item[dateField]) return true;

    const date = new Date(item[dateField]);
    const timeDiff = Math.abs(today.getTime() - date.getTime());
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff <= days;
  });
};

export const useBloomData = () => {
  const [bloomData, setBloomData] = useState<BloomData[]>([]);
  const [filteredData, setFilteredData] = useState<BloomData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advisoryDays, setAdvisoryDays] = useState<DateFilterOption>(30);
  const [observationDays, setObservationDays] = useState<DateFilterOption>(30);

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
      let filtered = filterDataByDays(bloomData, advisoryDays, 'Advisory_Date');
      filtered = filterDataByDays(filtered, observationDays, 'Observation_Date');
      setFilteredData(filtered);
    }
  }, [bloomData, advisoryDays, observationDays]);

  return {
    bloomData: filteredData,
    isLoading,
    error,
    advisoryDays,
    setAdvisoryDays,
    observationDays,
    setObservationDays
  };
};
