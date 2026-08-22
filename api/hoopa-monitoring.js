const HOOPA_MONITORING_URL = 'https://wxvisual.com/HoopaValley/controller/MapData/GetData.php';
const HOOPA_PORTAL_URL = 'https://wxvisual.com/HoopaValley/index.php';

const stationName = (html) => html.match(/<label>([^<]+)<\/label>/i)?.[1]?.trim() ?? 'Hoopa Tribal EPA monitoring station';
const observedAt = (html) => html.match(/<tr><td>([^<]+)<\/td>/i)?.[1]?.trim() ?? null;

export default async function handler(_request, response) {
  try {
    const upstream = await fetch(HOOPA_MONITORING_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sensor: 'Blue Green Algae', company: 'HoopaValley' }),
    });

    if (!upstream.ok) throw new Error(`Hoopa monitoring portal returned ${upstream.status}`);

    const payload = await upstream.json();
    if (payload.success !== 'true' || !Array.isArray(payload.data)) {
      throw new Error('Hoopa monitoring portal returned an unexpected response');
    }

    const stations = payload.data
      .map((station) => ({
        id: `${station.lat}-${station.lon}`,
        name: stationName(station.table ?? ''),
        latitude: Number(station.lat),
        longitude: Number(station.lon),
        value: Number(station.currentvalue),
        unit: 'µg/L',
        observedAt: observedAt(station.table ?? ''),
        sourceUrl: HOOPA_PORTAL_URL,
      }))
      .filter((station) => Number.isFinite(station.latitude) && Number.isFinite(station.longitude) && Number.isFinite(station.value));

    response.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    response.status(200).json({
      stations,
      fetchedAt: new Date().toISOString(),
      source: 'Hoopa Tribal EPA live water-quality portal',
      sourceUrl: HOOPA_PORTAL_URL,
    });
  } catch (error) {
    response.status(502).json({
      error: 'The Hoopa Tribal EPA monitoring service could not be reached.',
      detail: error instanceof Error ? error.message : undefined,
    });
  }
}
