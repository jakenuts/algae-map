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
  Advisory_Recommended: string;
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
          const hasRecentUpdate = 
                (isValidDate(advisoryDate) && daysDifference(today, advisoryDate) <= 90)              
             || (isValidDate(observationDate) && daysDifference(today, observationDate) < 90);
      
          return hasRecentUpdate;
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
    // Try to fetch with the current date first, then fallback to previous dates
    const baseUrl = 'https://data.ca.gov/dataset/ab672540-aecd-42f1-9b05-9aad326f97ec/resource/c6a36b91-ad38-4611-8750-87ee99e497dd/download/bloom-report';
    const today = new Date();
    
    // Try current date and up to 14 days back
    for (let daysBack = 0; daysBack <= 14; daysBack++) {
      const date = new Date(today);
      date.setDate(date.getDate() - daysBack);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      const url = `${baseUrl}_${dateStr}.csv`;
      
      try {
        response = await axios.get(url);
        console.log(`Successfully fetched bloom data from: ${url}`);
        break;
      } catch (error) {
        if (daysBack === 14) {
          // If we've tried all dates, try without date suffix as last resort
          try {
            response = await axios.get(`${baseUrl}.csv`);
            console.log('Fetched bloom data without date suffix');
          } catch (fallbackError) {
            throw new Error('Unable to fetch bloom data from any known URL pattern');
          }
        }
        // Continue to next date
      }
    }
  }

  return processBloomData(response!.data);
};
