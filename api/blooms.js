const DATASTORE_URL = new URL('https://data.ca.gov/api/3/action/datastore_search');
DATASTORE_URL.searchParams.set('resource_id', 'c6a36b91-ad38-4611-8750-87ee99e497dd');
DATASTORE_URL.searchParams.set('limit', '5000');
DATASTORE_URL.searchParams.set('sort', 'Bloom_Date_Created desc');

const RECENT_DAYS = 180;

const dateFromRecord = (record) =>
  [record.Bloom_Date_Created, record.Advisory_Date, record.Observation_Date]
    .map((value) => value && new Date(value))
    .filter((value) => value && !Number.isNaN(value.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0];

export default async function handler(_request, response) {
  try {
    const upstream = await fetch(DATASTORE_URL, {
      headers: { Accept: 'application/json' },
    });

    if (!upstream.ok) {
      throw new Error(`California data portal returned ${upstream.status}`);
    }

    const payload = await upstream.json();
    if (!payload.success || !Array.isArray(payload.result?.records)) {
      throw new Error('California data portal returned an unexpected response');
    }

    const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000;
    const records = payload.result.records.filter((record) => {
      const recordDate = dateFromRecord(record);
      return recordDate && recordDate.getTime() >= cutoff;
    });

    response.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=86400');
    response.status(200).json({
      records,
      fetchedAt: new Date().toISOString(),
      source: 'California State Water Resources Control Board FHABS datastore',
      sourceUrl: 'https://data.ca.gov/dataset/surface-water-freshwater-harmful-algal-blooms',
    });
  } catch (error) {
    response.status(502).json({
      error: 'The California HAB data service could not be reached. Please try again shortly.',
      detail: error instanceof Error ? error.message : undefined,
    });
  }
}
