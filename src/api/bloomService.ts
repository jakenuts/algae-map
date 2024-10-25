import axios from 'axios';
import Papa from 'papaparse';

export interface BloomData {
  Water_Body_Name: string;
  Landmark: string;
  County: string;
  Advisory_Date: string;
  Bloom_Latitude: string;
  Bloom_Longitude: string;
  Observation_Date: string;
  Reported_Advisory_Types: string;
  Case_Assignment: string;
  Case_Status: string;
  AdvisoryDetail: string;
  Advisory_Detail_Description: string;
}

// Function to calculate the date difference in days
const daysDifference = (date1: Date, date2: Date) => {
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

const processBloomData = (csvData: string): Promise<BloomData[]> => {
  return new Promise<BloomData[]>((resolve, reject) => {
    Papa.parse<BloomData>(csvData, {
      header: true,
      complete: (results) => {
        const today = new Date();
        const filteredData = results.data.filter((row) => {
          const advisoryDate = new Date(row.Advisory_Date);
          const observationDate = new Date(row.Observation_Date);
        
          // Check if advisoryDate is valid and within 90 days
          if (isValidDate(advisoryDate) && daysDifference(today, advisoryDate) > 90) return false;

          // Check if observationDate is valid and within 90 days
          if (isValidDate(observationDate) && daysDifference(today, observationDate) > 90) return false;        
    
          return true;
        });
        resolve(filteredData);
      },
      error: (error: Error) => reject(error),
    });
  });
};

export const fetchBloomData = async (): Promise<BloomData[]> => {
  // Check if we should use local data
  const useLocalData = import.meta.env.DEV && import.meta.env.VITE_USE_LOCAL_BLOOM_DATA === 'true';
  
  let response;
  if (useLocalData) {
    response = await axios.get('/docs/bloom-report.csv');
  } else {
    response = await axios.get(
      'https://data.ca.gov/dataset/ab672540-aecd-42f2-9b05-9aad326f97ec/resource/c6a36b91-ad38-4611-8750-87ee99e497dd/download/bloom-report.csv'
    );
  }

  return processBloomData(response.data);
};
