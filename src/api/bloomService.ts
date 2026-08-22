import Papa from 'papaparse';

export interface BloomData {
  Bloom_Report_ID?: number | string;
  Water_Body_Name: string;
  Landmark?: string | null;
  County?: string | null;
  Advisory_Date?: string | null;
  Bloom_Date_Created?: string | null;
  Bloom_Latitude?: string | number | null;
  Bloom_Longitude?: string | number | null;
  Observation_Date?: string | null;
  Reported_Advisory_Types?: string | null;
  Reported_Management_Organizations?: string | null;
  Case_Assignment?: string | null;
  Case_Status?: string | null;
  AdvisoryDetail?: string | null;
  Advisory_Detail_Description?: string | null;
  Advisory_Recommended?: string | null;
}

export interface BloomDataResponse {
  records: BloomData[];
  fetchedAt: string;
  source: string;
  sourceUrl: string;
}

export interface LocalMonitoringStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  value: number;
  unit: string;
  observedAt: string | null;
  isCurrent?: boolean;
  recentPeak?: number | null;
  recentPeakAt?: string | null;
  hasRecentSpike?: boolean;
  sourceUrl: string;
}

export interface LocalMonitoringResponse {
  stations: LocalMonitoringStation[];
  fetchedAt: string;
  source: string;
  sourceUrl: string;
}

const processBloomData = (csvData: string): Promise<BloomData[]> => {
  return new Promise<BloomData[]>((resolve, reject) => {
    Papa.parse<BloomData>(csvData, {
      header: true,
      complete: (results) => resolve(results.data),
      error: (error: Error) => reject(error),
    });
  });
};

export const fetchBloomData = async (): Promise<BloomDataResponse> => {
  const useLocalData = import.meta.env.DEV && import.meta.env.VITE_USE_LOCAL_BLOOM_DATA === 'true';

  if (useLocalData) {
    const localResponse = await fetch('/docs/bloom-report.csv');
    if (!localResponse.ok) throw new Error('Unable to load local bloom data');

    return {
      records: await processBloomData(await localResponse.text()),
      fetchedAt: new Date().toISOString(),
      source: 'Local development fixture',
      sourceUrl: '',
    };
  }

  const response = await fetch('/api/blooms', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Unable to load current California HAB reports');

  return response.json() as Promise<BloomDataResponse>;
};

export const fetchHoopaMonitoring = async (): Promise<LocalMonitoringResponse> => {
  const response = await fetch('/api/hoopa-monitoring', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Unable to load Hoopa live monitoring');

  return response.json() as Promise<LocalMonitoringResponse>;
};
