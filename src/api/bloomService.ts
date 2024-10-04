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

export const fetchBloomData = async (): Promise<BloomData[]> => {
  const response = await axios.get(
    'https://data.ca.gov/dataset/ab672540-aecd-42f1-9b05-9aad326f97ec/resource/c6a36b91-ad38-4611-8750-87ee99e497dd/download/bloom-report.csv'
  );

  return new Promise<BloomData[]>((resolve, reject) => {
    Papa.parse<BloomData>(response.data, {
      header: true,
      complete: (results) => {
        const today = new Date();
        const filteredData = results.data.filter((row) => {
          const advisoryDate = new Date(row.Advisory_Date);
          return (today.getTime() - advisoryDate.getTime()) / (1000 * 3600 * 24) <= 90;
        });
        resolve(filteredData);
      },
      error: (error) => reject(error),
    });
  });
};