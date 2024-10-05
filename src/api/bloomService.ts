import axios from 'axios';
import Papa from 'papaparse';

export interface BloomData {
  Water_Body_Name: string;
  Landmark: string;
  County: string;
  //Bloom_Date_Created:string;
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

export const fetchBloomData = async (): Promise<BloomData[]> => {
  const response = await axios.get(
    'https://data.ca.gov/dataset/ab672540-aecd-42f1-9b05-9aad326f97ec/resource/c6a36b91-ad38-4611-8750-87ee99e497dd/download/bloom-report.csv'
  );

// Function to calculate the date difference in days
const daysDifference = (date1: Date, date2: Date) => {
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
};

const isValidDate = (date: Date): boolean => {
  return date instanceof Date && !isNaN(date.getTime());
};

  return new Promise<BloomData[]>((resolve, reject) => {
    Papa.parse<BloomData>(response.data, {
      header: true,
      complete: (results) => {
        const today = new Date();
        const filteredData = results.data.filter((row) => {
      
          const advisoryDate = new Date(row.Advisory_Date);
          const observationDate = new Date(row.Observation_Date);
        
          // Check if advisoryDate is valid and within 90 days
          if (isValidDate(advisoryDate) && daysDifference(today, advisoryDate) > 90) return false;

          // Check if advisoryDate is valid and within 90 days
          if (isValidDate(observationDate) && daysDifference(today, observationDate) > 90) return false;        
    
          //const dates = [advisoryDate, observationDate];
          //if (dates.some((date) => daysDifference(today, date) > 90)) return false;
          //console.log(`${row.Water_Body_Name} ${advisoryDate} ${observationDate} - ${row.Case_Status}`);
    
          return true;
        });
        resolve(filteredData);
      },
      error: (error) => reject(error),
    });
  });
};