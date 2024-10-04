import { useState, useEffect } from 'react';
import { fetchBloomData, BloomData } from '../../api/bloomService';

export const useBloomData = () => {
  const [bloomData, setBloomData] = useState<BloomData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return { bloomData, isLoading, error };
};