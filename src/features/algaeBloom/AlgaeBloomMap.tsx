import React, { useEffect, useMemo, useState } from 'react';
import { divIcon } from 'leaflet';
import { CircleMarker, MapContainer, Marker, Popup, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useBloomData, DateFilterOption } from './useBloomData';
import { BloomMarker } from './BloomMarker';
import MapLayers from './MapLayers';
import { PulseLoader } from 'react-spinners';
import { BloomData, LocalMonitoringStation } from '../../api/bloomService';
import { getAdvisoryStatus } from '../../utils/markerUtils';
import './AlgaeBloomMap.css';

const OFFICIAL_MAP_URL = 'https://www.mywaterquality.ca.gov/habs/resources/reports-map/';
const SAVED_MAP_VIEW_KEY = 'california-water-watch:last-map-view';
const DEFAULT_MAP_VIEW = { latitude: 37.5, longitude: -119.5, zoom: 6 };
type MapView = typeof DEFAULT_MAP_VIEW;
type MapBounds = { north: number; south: number; east: number; west: number };
const recordId = (bloom: BloomData) => String(
  bloom.Bloom_Report_ID
  ?? [bloom.Water_Body_Name, bloom.Landmark, bloom.Bloom_Latitude, bloom.Bloom_Longitude, bloom.Bloom_Date_Created].join('-'),
);

const formatTimestamp = (value: string | null) => {
  if (!value) return 'Refreshing now';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently refreshed' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const loadSavedMapView = (): MapView => {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SAVED_MAP_VIEW_KEY) ?? 'null');
    if ([saved?.latitude, saved?.longitude, saved?.zoom].every(Number.isFinite)) return saved;
  } catch {
    // The map remains useful when browser storage is blocked or has stale data.
  }
  return DEFAULT_MAP_VIEW;
};

const liveMonitorIcon = (station: LocalMonitoringStation) => {
  const reading = station.hasRecentSpike && station.recentPeak != null
    ? `BGA spike ${station.recentPeak.toFixed(2)}`
    : station.isCurrent && station.recentPeak != null
    ? `24h high ${station.recentPeak.toFixed(2)}`
    : station.isCurrent
      ? `Latest ${station.value.toFixed(2)}`
      : 'Stale reading';

  return divIcon({
    className: 'local-monitoring-marker-shell',
    html: `<span class="local-monitoring-marker${station.isCurrent ? '' : ' local-monitoring-marker--stale'}${station.hasRecentSpike ? ' local-monitoring-marker--spike' : ''}"><b>HOOPA</b><small>${reading} µg/L</small></span>`,
    iconSize: [82, 34],
    iconAnchor: [41, 17],
  });
};

const ViewportController: React.FC<{ selectedBloom: BloomData | null; userLocation: [number, number] | null }> = ({ selectedBloom, userLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (!selectedBloom) return;
    const latitude = Number(selectedBloom.Bloom_Latitude);
    const longitude = Number(selectedBloom.Bloom_Longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) map.flyTo([latitude, longitude], 12, { duration: 0.7 });
  }, [map, selectedBloom]);

  useEffect(() => {
    if (userLocation) map.flyTo(userLocation, 11, { duration: 0.7 });
  }, [map, userLocation]);

  return null;
};

const MapViewTracker: React.FC<{ onBoundsChange: (bounds: MapBounds) => void }> = ({ onBoundsChange }) => {
  const map = useMap();

  useEffect(() => {
    const updateMapView = () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      try {
        window.localStorage.setItem(SAVED_MAP_VIEW_KEY, JSON.stringify({ latitude: center.lat, longitude: center.lng, zoom: map.getZoom() }));
      } catch {
        // Saving a convenience preference must never block the map.
      }
      onBoundsChange({ north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest() });
    };

    updateMapView();
    map.on('moveend', updateMapView);
    return () => {
      map.off('moveend', updateMapView);
    };
  }, [map, onBoundsChange]);

  return null;
};

const LoadingScreen: React.FC = () => (
  <div className="loading-container">
    <PulseLoader color="#0e5a63" size={12} margin={3} />
    <div className="loading-text">Loading current California HAB reports…</div>
  </div>
);

const AlgaeBloomMap: React.FC = () => {
  const { bloomData, isLoading, error, updatedDays, setUpdatedDays, fetchedAt, sourceUrl, localMonitoring } = useBloomData();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [advisoriesOnly, setAdvisoriesOnly] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [showTools, setShowTools] = useState(false);
  const [showAssessmentDetails, setShowAssessmentDetails] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [visibleBounds, setVisibleBounds] = useState<MapBounds | null>(null);
  const [initialMapView] = useState<MapView>(loadSavedMapView);

  const matchingBloomData = useMemo(() => {
    const search = query.trim().toLowerCase();
    return bloomData.filter((bloom) => {
      const matchesSearch = !search || [bloom.Water_Body_Name, bloom.Landmark, bloom.County]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(search));
      return matchesSearch && (!advisoriesOnly || getAdvisoryStatus(bloom).isAdvisory);
    });
  }, [advisoriesOnly, bloomData, query]);

  const searchResults = useMemo(() => matchingBloomData.slice(0, 6), [matchingBloomData]);
  const selectedBloom = useMemo(
    () => matchingBloomData.find((bloom) => recordId(bloom) === selectedId) ?? null,
    [matchingBloomData, selectedId],
  );
  const advisoryCount = matchingBloomData.filter((bloom) => getAdvisoryStatus(bloom).isAdvisory).length;
  const visibleBloomData = useMemo(() => matchingBloomData
    .filter((bloom) => {
      if (!visibleBounds) return true;
      const latitude = Number(bloom.Bloom_Latitude);
      const longitude = Number(bloom.Bloom_Longitude);
      return Number.isFinite(latitude) && Number.isFinite(longitude)
        && latitude >= visibleBounds.south && latitude <= visibleBounds.north
        && longitude >= visibleBounds.west && longitude <= visibleBounds.east;
    })
    .sort((left, right) => Number(getAdvisoryStatus(right).isAdvisory) - Number(getAdvisoryStatus(left).isAdvisory)), [matchingBloomData, visibleBounds]);
  const assessmentDetail = selectedBloom?.Reported_Management_Organizations
    || selectedBloom?.AdvisoryDetail
    || selectedBloom?.Advisory_Detail_Description;

  const selectBloom = (bloom: BloomData) => {
    setSelectedId(recordId(bloom));
    setShowAssessmentDetails(false);
    setShowTools(false);
    setIsListOpen(false);
  };

  const chooseBloom = (bloom: BloomData) => {
    selectBloom(bloom);
    setQuery(bloom.Water_Body_Name);
    setIsSearchOpen(false);
  };

  const dismissAssessment = () => {
    setSelectedId(null);
    setShowAssessmentDetails(false);
  };

  const toggleMobileSearch = () => {
    setIsSearchOpen((isOpen) => !isOpen);
    setShowTools(false);
    setIsListOpen(false);
  };

  const toggleMobileReports = () => {
    setIsListOpen((isOpen) => !isOpen);
    setShowTools(false);
    setIsSearchOpen(false);
  };

  const toggleMobileTools = () => {
    setShowTools((isOpen) => !isOpen);
    setIsSearchOpen(false);
    setIsListOpen(false);
  };

  const clearSavedMapView = () => {
    try {
      window.localStorage.removeItem(SAVED_MAP_VIEW_KEY);
      setLocationMessage('Saved map position cleared. The next visit starts statewide.');
    } catch {
      setLocationMessage('This browser could not clear the saved map position.');
    }
  };

  const locateUser = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Location is not available in this browser. Search by waterway or county instead.');
      return;
    }

    setLocationMessage('Finding your location…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLocationMessage('Map centered on your location.');
      },
      () => setLocationMessage('Location permission was not granted. Search by waterway or county instead.'),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  if (isLoading) return <LoadingScreen />;
  if (error) {
    return (
      <main className="error-screen">
        <h1>Current HAB reports are unavailable</h1>
        <p>{error}. Please try again shortly or use the official California map.</p>
        <a href={OFFICIAL_MAP_URL} target="_blank" rel="noopener noreferrer">Open the official HAB Reports Map</a>
      </main>
    );
  }

  return (
    <div className="algae-bloom-map">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <h1>California Water Watch</h1>
            <p>Recent harmful algae bloom reports</p>
          </div>
        </div>
        <div className="map-controls" aria-label="Map controls">
          <div className="search-control">
            <label className="sr-only" htmlFor="waterway-search">Search waterways, landmarks, or counties</label>
            <input
              id="waterway-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedId(null);
                setShowAssessmentDetails(false);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              placeholder="Search river, lake, beach, or county"
              autoComplete="off"
              aria-controls="waterway-results"
              aria-expanded={Boolean(query.trim() && searchResults.length)}
            />
            {isSearchOpen && query.trim() && searchResults.length > 0 && (
              <div id="waterway-results" className="search-results" role="listbox">
                {searchResults.map((bloom) => (
                  <button key={recordId(bloom)} type="button" role="option" onClick={() => chooseBloom(bloom)}>
                    <span>{bloom.Water_Body_Name}</span>
                    <small>{bloom.County || 'County not reported'} · {getAdvisoryStatus(bloom).label}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="secondary-controls">
            <label className="compact-control" htmlFor="date-filter">
              <span>Window</span>
              <select id="date-filter" value={updatedDays} onChange={(event) => setUpdatedDays(Number(event.target.value) as DateFilterOption)}>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>
            <label className="toggle-control">
              <input type="checkbox" checked={advisoriesOnly} onChange={(event) => setAdvisoriesOnly(event.target.checked)} />
              <span>Advisories only</span>
            </label>
            <button type="button" className="locate-button" onClick={locateUser}>Locate me</button>
            <button type="button" className="clear-view-button" onClick={clearSavedMapView}>Clear saved map view</button>
            <div className="tools-legend" aria-label="Advisory marker legend">
              <span><i className="legend-dot legend-dot--danger" />Danger</span>
              <span><i className="legend-dot legend-dot--warning" />Warning</span>
              <span><i className="legend-dot legend-dot--alert" />Alert</span>
              <span><i className="legend-dot legend-dot--reported" />Report</span>
            </div>
          </div>
        </div>
      </header>
      <div className="map-summary" aria-live="polite">
        <strong>{matchingBloomData.length}</strong> recent reports
        <span aria-hidden="true">·</span>
        <strong>{advisoryCount}</strong> with an advisory or alert
        <span className="summary-source">Updated {formatTimestamp(fetchedAt)}</span>
      </div>
      <details className="mobile-safety-strip">
        <summary><strong>Dog safety</strong><span>Map reports are not a clearance.</span><em>More</em></summary>
        <div>
          <p>Check posted signs and the water itself. Keep dogs out around scum, mats, foam, paint-like color, or a reported spike.</p>
          <a href={OFFICIAL_MAP_URL} target="_blank" rel="noopener noreferrer">California official HAB map</a>
          <a href="https://wxvisual.com/HoopaValley/index.php" target="_blank" rel="noopener noreferrer">Hoopa live monitoring</a>
        </div>
      </details>
      <div className="map-wrapper">
        <MapContainer center={[initialMapView.latitude, initialMapView.longitude]} zoom={initialMapView.zoom} className="map-container" zoomControl={false}>
          <MapLayers />
          <ZoomControl position="bottomright" />
          <ViewportController selectedBloom={selectedBloom} userLocation={userLocation} />
          <MapViewTracker onBoundsChange={setVisibleBounds} />
          {userLocation && <CircleMarker center={userLocation} radius={8} pathOptions={{ color: '#083e50', fillColor: '#38bdf8', fillOpacity: 1, weight: 3 }} />}
          {matchingBloomData.map((bloom) => <BloomMarker key={recordId(bloom)} bloom={bloom} onSelect={selectBloom} />)}
          {localMonitoring.map((station) => (
            <Marker
              key={station.id}
              position={[station.latitude, station.longitude]}
              icon={liveMonitorIcon(station)}
            >
              <Tooltip direction="top" offset={[0, -18]} opacity={1}>Hoopa live monitor — {station.name}</Tooltip>
              <Popup>
                <article className="popup-container">
                  <p className="live-monitoring-status">Live local monitoring — not an advisory</p>
                  <h2>{station.name}</h2>
                  <dl>
                    <dt>Latest reading</dt><dd>{station.value.toFixed(2)} {station.unit}</dd>
                    <dt>Station reading</dt><dd>{station.observedAt || 'Timestamp unavailable'}</dd>
                    {station.isCurrent && station.recentPeak != null && <><dt>Observed 24h high</dt><dd>{station.recentPeak.toFixed(2)} {station.unit}</dd></>}
                    {station.isCurrent && station.recentPeakAt && <><dt>High recorded</dt><dd>{station.recentPeakAt}</dd></>}
                  </dl>
                  {station.hasRecentSpike && <p className="monitoring-spike-note"><strong>Recent BGA spike.</strong> This station's high in the last 24 hours was more than double the latest reading. Treat that as a reason to use extra caution and inspect the water—not as a toxin result.</p>}
                  <p className="popup-safety-note"><strong>Visible local signal, not a toxicity finding.</strong> This is a raw local instrument reading, not a toxin result or public-health advisory. Do not use it alone to decide whether it is safe for your dog.</p>
                  <a href={station.sourceUrl} target="_blank" rel="noopener noreferrer">View Hoopa live trend</a>
                </article>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <button type="button" className="in-view-toggle" onClick={toggleMobileReports} aria-expanded={isListOpen} aria-controls="reports-in-view">
          <span>Reports in this view</span><strong>{visibleBloomData.length}</strong>
        </button>
        {isSearchOpen && (
          <div className="mobile-search-panel">
            <label className="sr-only" htmlFor="mobile-waterway-search">Search waterways, landmarks, or counties</label>
            <input
              id="mobile-waterway-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedId(null);
                setShowAssessmentDetails(false);
              }}
              placeholder="Search river, lake, beach, or county"
              autoComplete="off"
              autoFocus
            />
            {query.trim() && searchResults.length > 0 && (
              <div className="search-results" role="listbox">
                {searchResults.map((bloom) => (
                  <button key={recordId(bloom)} type="button" role="option" onClick={() => chooseBloom(bloom)}>
                    <span>{bloom.Water_Body_Name}</span>
                    <small>{bloom.County || 'County not reported'} · {getAdvisoryStatus(bloom).label}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {showTools && (
          <section className="mobile-tools-panel" aria-label="Map tools">
            <label className="compact-control" htmlFor="mobile-date-filter">
              <span>Window</span>
              <select id="mobile-date-filter" value={updatedDays} onChange={(event) => setUpdatedDays(Number(event.target.value) as DateFilterOption)}>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </label>
            <label className="toggle-control">
              <input type="checkbox" checked={advisoriesOnly} onChange={(event) => setAdvisoriesOnly(event.target.checked)} />
              <span>Advisories only</span>
            </label>
            <button type="button" className="locate-button" onClick={locateUser}>Locate me</button>
            <button type="button" className="clear-view-button" onClick={clearSavedMapView}>Clear saved map view</button>
          </section>
        )}
        {isListOpen && (
          <section id="reports-in-view" className="reports-drawer" aria-label="Reports in the visible map area">
            <header>
              <div><strong>Reports in this view</strong><span>{visibleBloomData.length} recent {visibleBloomData.length === 1 ? 'report' : 'reports'}</span></div>
              <button type="button" onClick={() => setIsListOpen(false)} aria-label="Close reports list">×</button>
            </header>
            <div className="reports-drawer-list">
              {visibleBloomData.slice(0, 20).map((bloom) => {
                const advisory = getAdvisoryStatus(bloom);
                return (
                  <details key={recordId(bloom)} className="view-report-card">
                    <summary>
                      <span className={`selected-status selected-status--${advisory.kind}`}>{advisory.label}</span>
                      <strong>{bloom.Water_Body_Name}</strong>
                      <small>{bloom.Landmark || bloom.County || 'Location details not reported'}</small>
                    </summary>
                    <div>
                      <p>Latest report: {formatTimestamp(bloom.Bloom_Date_Created || bloom.Observation_Date || bloom.Advisory_Date || null)}</p>
                      <button type="button" onClick={() => selectBloom(bloom)}>View on map</button>
                    </div>
                  </details>
                );
              })}
              {visibleBloomData.length > 20 && <p className="drawer-note">Showing the first 20 reports. Zoom in or filter to narrow the list.</p>}
              {!visibleBloomData.length && <p className="drawer-note">No recent reports are in this map area. This is not a safety clearance.</p>}
            </div>
          </section>
        )}
        {locationMessage && <p className="map-toast" role="status">{locationMessage}</p>}
        {selectedBloom && (
          <section className="assessment-sheet" aria-live="polite">
            <button type="button" className="sheet-close" onClick={dismissAssessment} aria-label="Close assessment">×</button>
            <div className="assessment-heading">
              <span className={`selected-status selected-status--${getAdvisoryStatus(selectedBloom).kind}`}>{getAdvisoryStatus(selectedBloom).label}</span>
              <div>
                <strong>{selectedBloom.Water_Body_Name}</strong>
                <span>{selectedBloom.Landmark || selectedBloom.County || 'Location details not reported'}</span>
              </div>
            </div>
            <p className="dog-safety-note"><strong>Check before entering.</strong> This report is not a safety clearance. Do not rely on this map alone to decide whether it is safe for your dog.</p>
            {assessmentDetail && (
              <>
                <button type="button" className="details-toggle" onClick={() => setShowAssessmentDetails((isOpen) => !isOpen)}>
                  {showAssessmentDetails ? 'Hide report details' : 'Read report details'}
                </button>
                {showAssessmentDetails && <p className="assessment-detail"><strong>Monitoring note:</strong> {assessmentDetail}</p>}
              </>
            )}
            <a href={OFFICIAL_MAP_URL} target="_blank" rel="noopener noreferrer">Open official HAB map</a>
          </section>
        )}
        <nav className="mobile-bottom-toolbar" aria-label="Map actions">
          <button type="button" onClick={toggleMobileSearch} aria-expanded={isSearchOpen} aria-controls="mobile-waterway-search">
            <span aria-hidden="true">⌕</span><small>Search</small>
          </button>
          <button type="button" onClick={toggleMobileReports} aria-expanded={isListOpen} aria-controls="reports-in-view">
            <span aria-hidden="true">☷</span><small>Reports</small>
          </button>
          <button type="button" onClick={toggleMobileTools} aria-expanded={showTools}>
            <span aria-hidden="true">⚙</span><small>Tools</small>
          </button>
        </nav>
      </div>
      <aside className="safety-panel">
        <div className="legend" aria-label="Advisory marker legend">
          <span><i className="legend-dot legend-dot--danger" />Danger</span>
          <span><i className="legend-dot legend-dot--warning" />Warning / caution</span>
          <span><i className="legend-dot legend-dot--alert" />Alert / awareness</span>
          <span><i className="legend-dot legend-dot--reported" />Report, no advisory recorded</span>
        </div>
        <p><strong>Before your dog goes in:</strong> no advisory recorded does not mean the water is safe. Check for posted signs, scum, mats, or discolored water and keep pets out if you see them.</p>
        <a href={sourceUrl || OFFICIAL_MAP_URL} target="_blank" rel="noopener noreferrer">California Water Boards data</a>
        <a href={OFFICIAL_MAP_URL} target="_blank" rel="noopener noreferrer">Official HAB map</a>
      </aside>
    </div>
  );
};

export default AlgaeBloomMap;
