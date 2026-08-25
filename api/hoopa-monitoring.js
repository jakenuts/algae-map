const HOOPA_MONITORING_URL = 'https://wxvisual.com/HoopaValley/controller/MapData/GetData.php';
const HOOPA_PORTAL_URL = 'https://wxvisual.com/HoopaValley/index.php';
const HOOPA_GRAPH_URL = 'https://wxvisual.com/HoopaValley/includes/gotograph.php';
const RECENT_WINDOW_HOURS = 48;

const stationName = (html) => html.match(/<label>([^<]+)<\/label>/i)?.[1]?.trim() ?? 'Hoopa Tribal EPA monitoring station';
const observedAt = (html) => html.match(/<tr><td>([^<]+)<\/td>/i)?.[1]?.trim() ?? null;
const parseObservedAt = (value) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
  if (!match) return null;
  const [, year, month, day, rawHour, minute, meridiem] = match;
  let hour = Number(rawHour) % 12;
  if (meridiem.toUpperCase() === 'PM') hour += 12;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), hour, Number(minute)));
};

const getRecentRange = (graph) => {
  const readings = String(graph)
    .split('\n')
    .slice(1, RECENT_WINDOW_HOURS * 2 + 1)
    .map((line) => line.replace(/^"+/, '').split(','))
    .map(([timestamp, , , , , value]) => ({ timestamp: timestamp?.trim(), value: Number(value) }))
    .filter((reading) => reading.timestamp && Number.isFinite(reading.value));

  if (!readings.length) return null;
  return {
    low: readings.reduce((lowest, reading) => (reading.value < lowest.value ? reading : lowest)),
    peak: readings.reduce((highest, reading) => (reading.value > highest.value ? reading : highest)),
  };
};

const enrichStation = async (station) => {
  const timestamp = parseObservedAt(station.observedAt);
  const isCurrent = Boolean(timestamp && Date.now() - timestamp.getTime() < 36 * 60 * 60 * 1000);
  if (!isCurrent) return { ...station, isCurrent };

  try {
    const graphUrl = new URL(HOOPA_GRAPH_URL);
    graphUrl.searchParams.set('lat', String(station.latitude));
    graphUrl.searchParams.set('lon', String(station.longitude));
    graphUrl.searchParams.set('sensor', 'Blue Green Algae');
    const graphResponse = await fetch(graphUrl, { headers: { Accept: 'application/json' } });
    if (!graphResponse.ok) return { ...station, isCurrent };

    const range = getRecentRange(await graphResponse.json());
    const increaseFactor = range?.low.value && range.low.value > 0
      ? range.peak.value / range.low.value
      : null;
    // Deliberately conservative app policy, not a public-health threshold:
    // a two-fold 48-hour rise is a warning and a four-fold rise is red.
    const signalLevel = increaseFactor && range && range.peak.value - range.low.value >= 0.1
      ? increaseFactor >= 4 ? 'danger' : increaseFactor >= 2 ? 'warning' : null
      : null;
    return {
      ...station,
      isCurrent,
      recentPeak: range?.peak.value ?? null,
      recentPeakAt: range?.peak.timestamp ?? null,
      recentLow: range?.low.value ?? null,
      recentLowAt: range?.low.timestamp ?? null,
      recentIncreaseFactor: increaseFactor,
      signalLevel,
      hasRecentSpike: Boolean(signalLevel),
    };
  } catch {
    return { ...station, isCurrent };
  }
};

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

    const stations = await Promise.all(payload.data
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
      .filter((station) => Number.isFinite(station.latitude) && Number.isFinite(station.longitude) && Number.isFinite(station.value))
      .map(enrichStation));

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
