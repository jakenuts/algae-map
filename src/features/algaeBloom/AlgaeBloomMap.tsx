import React, { useEffect, useMemo, useState } from 'react';
import { divIcon } from 'leaflet';
import { CircleMarker, MapContainer, Marker, Popup, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useBloomData, DateFilterOption } from './useBloomData';
import { BloomMarker } from './BloomMarker';
import MapLayers from './MapLayers';
import { PulseLoader } from 'react-spinners';
import { BloomData, LocalMonitoringStation } from '../../api/bloomService';
import { getAdvisoryStatus, getGroupedIcon, getMarkerZIndexOffset } from '../../utils/markerUtils';
import './AlgaeBloomMap.css';

const OFFICIAL_MAP_URL = 'https://www.mywaterquality.ca.gov/habs/resources/reports-map/';
const SAVED_MAP_VIEW_KEY = 'california-water-watch:last-map-view';
const DEFAULT_MAP_VIEW = { latitude: 37.5, longitude: -119.5, zoom: 6 };
type MapView = typeof DEFAULT_MAP_VIEW;
type MapBounds = { north: number; south: number; east: number; west: number };
type BloomCluster = { representative: BloomData; blooms: BloomData[] };
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
  const signalKind = station.signalLevel ?? (station.hasRecentSpike ? 'warning' : 'reported');
  const isPotentialIncrease = signalKind !== 'reported';
  return divIcon({
    className: 'local-monitoring-marker-shell',
    html: `<span class="advisory-marker advisory-marker--${signalKind} local-monitoring-dot${isPotentialIncrease ? ' local-monitoring-dot--signal' : ''}" aria-label="${isPotentialIncrease ? 'Potential blue-green algae increase — not official advisory' : 'Current Hoopa monitoring signal'}">${isPotentialIncrease ? '<b>!</b>' : ''}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const bloomPosition = (bloom: BloomData): [number, number] | null => {
  const latitude = Number(bloom.Bloom_Latitude);
  const longitude = Number(bloom.Bloom_Longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null;
};

const ClusteredBloomMarkers: React.FC<{ blooms: BloomData[]; onSelect: (bloom: BloomData) => void }> = ({ blooms, onSelect }) => {
  const map = useMap();
  const [clusters, setClusters] = useState<BloomCluster[]>([]);

  useEffect(() => {
    const buildClusters = () => {
      const eligible = blooms
        .map((bloom) => ({ bloom, position: bloomPosition(bloom) }))
        .filter((item): item is { bloom: BloomData; position: [number, number] } => item.position !== null)
        .sort((left, right) => getMarkerZIndexOffset(getAdvisoryStatus(right.bloom).kind) - getMarkerZIndexOffset(getAdvisoryStatus(left.bloom).kind));
      const remaining = new Set(eligible.map((item) => item.bloom));
      const nextClusters: BloomCluster[] = [];

      while (remaining.size) {
        const first = remaining.values().next().value as BloomData;
        remaining.delete(first);
        const group = [first];
        const pending = [first];

        while (pending.length) {
          const source = pending.pop()!;
          const sourcePosition = bloomPosition(source)!;
          const sourcePoint = map.project(sourcePosition, map.getZoom());
          for (const candidate of Array.from(remaining)) {
            const candidatePosition = bloomPosition(candidate)!;
            if (sourcePoint.distanceTo(map.project(candidatePosition, map.getZoom())) <= 24) {
              remaining.delete(candidate);
              group.push(candidate);
              pending.push(candidate);
            }
          }
        }

        const sorted = group.sort((left, right) => getMarkerZIndexOffset(getAdvisoryStatus(right).kind) - getMarkerZIndexOffset(getAdvisoryStatus(left).kind));
        nextClusters.push({ representative: sorted[0], blooms: sorted });
      }

      setClusters(nextClusters);
    };

    buildClusters();
    map.on('zoomend', buildClusters);
    return () => {
      map.off('zoomend', buildClusters);
    };
  }, [blooms, map]);

  return (
    <>
      {clusters.map(({ representative, blooms: groupedBlooms }) => {
        const advisory = getAdvisoryStatus(representative);
        const position = bloomPosition(representative)!;
        if (groupedBlooms.length === 1) {
          return <BloomMarker key={recordId(representative)} bloom={representative} onSelect={onSelect} zIndexOffset={getMarkerZIndexOffset(advisory.kind)} />;
        }

        return (
          <Marker key={groupedBlooms.map(recordId).join('|')} position={position} icon={getGroupedIcon(advisory.kind, groupedBlooms.length)} zIndexOffset={getMarkerZIndexOffset(advisory.kind)}>
            <Tooltip direction="top" offset={[0, -16]} opacity={1}>{groupedBlooms.length} overlapping reports — highest: {advisory.label}</Tooltip>
            <Popup>
              <article className="popup-container overlapping-reports-popup">
                <p className={`popup-status popup-status--${advisory.kind}`}>{advisory.label} is the highest severity here</p>
                <h2>{groupedBlooms.length} overlapping reports</h2>
                <p>Choose a report to inspect it and zoom in.</p>
                <div className="overlapping-reports-list">
                  {groupedBlooms.map((bloom) => {
                    const itemAdvisory = getAdvisoryStatus(bloom);
                    return <button key={recordId(bloom)} type="button" onClick={() => onSelect(bloom)}><span className={`selected-status selected-status--${itemAdvisory.kind}`}>{itemAdvisory.label}</span><strong>{bloom.Water_Body_Name}</strong></button>;
                  })}
                </div>
              </article>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

const ViewportController: React.FC<{ selectedBloom: BloomData | null; userLocation: [number, number] | null; focusedLocation: [number, number] | null }> = ({ selectedBloom, userLocation, focusedLocation }) => {
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

  useEffect(() => {
    if (focusedLocation) map.flyTo(focusedLocation, 13, { duration: 0.7 });
  }, [focusedLocation, map]);

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
  const [focusedLocation, setFocusedLocation] = useState<[number, number] | null>(null);
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
  const currentMonitoringSignals = useMemo(() => localMonitoring.filter((station) => station.isCurrent), [localMonitoring]);
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
  const visibleMonitoringSignals = useMemo(() => currentMonitoringSignals.filter((station) => {
    if (!visibleBounds) return true;
    return station.latitude >= visibleBounds.south && station.latitude <= visibleBounds.north
      && station.longitude >= visibleBounds.west && station.longitude <= visibleBounds.east;
  }), [currentMonitoringSignals, visibleBounds]);
  const visibleSignalCount = visibleBloomData.length + visibleMonitoringSignals.length;
  const assessmentDetail = selectedBloom?.Reported_Management_Organizations
    || selectedBloom?.AdvisoryDetail
    || selectedBloom?.Advisory_Detail_Description;

  const selectBloom = (bloom: BloomData) => {
    setSelectedId(recordId(bloom));
    setFocusedLocation(null);
    setShowAssessmentDetails(false);
    setShowTools(false);
    setIsListOpen(false);
  };

  const focusMonitoringSignal = (station: LocalMonitoringStation) => {
    setFocusedLocation([station.latitude, station.longitude]);
    setSelectedId(null);
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
        <summary><strong>Before your dog goes in:</strong><span>no advisory doesn’t mean safe water.</span><em>More</em></summary>
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
          <ViewportController selectedBloom={selectedBloom} userLocation={userLocation} focusedLocation={focusedLocation} />
          <MapViewTracker onBoundsChange={setVisibleBounds} />
          {userLocation && <CircleMarker center={userLocation} radius={8} pathOptions={{ color: '#083e50', fillColor: '#38bdf8', fillOpacity: 1, weight: 3 }} />}
          <ClusteredBloomMarkers blooms={matchingBloomData} onSelect={selectBloom} />
          {localMonitoring.filter((station) => station.isCurrent).map((station) => (
            <Marker
              key={station.id}
              position={[station.latitude, station.longitude]}
              icon={liveMonitorIcon(station)}
              zIndexOffset={station.signalLevel ? getMarkerZIndexOffset('danger') + 10000 : getMarkerZIndexOffset('reported')}
            >
              <Tooltip direction="top" offset={[0, -18]} opacity={1}>Hoopa live monitor — {station.name}</Tooltip>
              <Popup>
                <article className="popup-container">
                  <p className={station.signalLevel ? `potential-signal-status potential-signal-status--${station.signalLevel}` : 'live-monitoring-status'}>{station.signalLevel ? 'Potential BGA increase — not official advisory' : 'Live local monitoring — not an advisory'}</p>
                  <h2>{station.name}</h2>
                  <dl>
                    <dt>Latest reading</dt><dd>{station.value.toFixed(2)} {station.unit}</dd>
                    <dt>Station reading</dt><dd>{station.observedAt || 'Timestamp unavailable'}</dd>
                    {station.isCurrent && station.recentPeak != null && <><dt>Observed 24h high</dt><dd>{station.recentPeak.toFixed(2)} {station.unit}</dd></>}
                    {station.isCurrent && station.recentPeakAt && <><dt>High recorded</dt><dd>{station.recentPeakAt}</dd></>}
                    {station.isCurrent && station.recentLow != null && <><dt>Observed 24h low</dt><dd>{station.recentLow.toFixed(2)} {station.unit}</dd></>}
                    {station.isCurrent && station.recentIncreaseFactor != null && <><dt>24h increase</dt><dd>{station.recentIncreaseFactor.toFixed(1)}× from low to high</dd></>}
                  </dl>
                  {station.signalLevel && <p className="monitoring-spike-note"><strong>Potential BGA increase.</strong> This map treats a ≥2× rise across the last 24 hours as a precautionary warning, and ≥4× as red. It is not a toxin result or official advisory, but should not be ignored when deciding whether a dog goes in.</p>}
                  <p className="popup-safety-note"><strong>Visible local signal, not a toxicity finding.</strong> This is a raw local instrument reading, not a toxin result or public-health advisory. Do not use it alone to decide whether it is safe for your dog.</p>
                  <a href={station.sourceUrl} target="_blank" rel="noopener noreferrer">View Hoopa live trend</a>
                </article>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        <button type="button" className="in-view-toggle" onClick={toggleMobileReports} aria-expanded={isListOpen} aria-controls="reports-in-view">
          <span>Signals in this view</span><strong>{visibleSignalCount}</strong>
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
              <div><strong>Signals in this view</strong><span>{visibleSignalCount} report{visibleSignalCount === 1 ? '' : 's'} or monitoring signals</span></div>
              <button type="button" onClick={() => setIsListOpen(false)} aria-label="Close reports list">×</button>
            </header>
            <div className="reports-drawer-list">
              {visibleMonitoringSignals.map((station) => (
                <details key={station.id} className="view-report-card view-report-card--monitoring">
                  <summary>
                    <span className={`selected-status selected-status--${station.signalLevel ?? (station.hasRecentSpike ? 'warning' : 'reported')}`}>{station.hasRecentSpike ? 'Potential BGA increase' : 'Live monitoring signal'}</span>
                    <strong>{station.name}</strong>
                    <small>Latest {station.value.toFixed(2)} {station.unit}{station.recentIncreaseFactor != null ? ` · ${station.recentIncreaseFactor.toFixed(1)}× 24h rise` : station.recentPeak != null ? ` · 24h high ${station.recentPeak.toFixed(2)}` : ''}</small>
                  </summary>
                  <div>
                    <p>Raw Hoopa Tribal EPA instrument signal, not a toxin result or official advisory.</p>
                    <button type="button" onClick={() => focusMonitoringSignal(station)}>View station</button>
                    <a href={station.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>
                  </div>
                </details>
              ))}
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
              {!visibleSignalCount && <p className="drawer-note">No recent reports or live monitoring signals are in this map area. This is not a safety clearance.</p>}
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
            <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4.5 4.5" /></svg><small>Search</small>
          </button>
          <button type="button" onClick={toggleMobileReports} aria-expanded={isListOpen} aria-controls="reports-in-view">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 6h11M7 12h11M7 18h11" /><circle cx="4" cy="6" r=".8" /><circle cx="4" cy="12" r=".8" /><circle cx="4" cy="18" r=".8" /></svg><small>Signals <b>{visibleSignalCount}</b></small>
          </button>
          <button type="button" onClick={toggleMobileTools} aria-expanded={showTools}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle cx="12" cy="12" r="3.2" /></svg><small>Tools</small>
          </button>
        </nav>
      </div>
      <aside className="safety-panel">
        <div className="legend" aria-label="Advisory marker legend">
          <span><i className="legend-dot legend-dot--potential" />Potential BGA rise, not official</span>
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
