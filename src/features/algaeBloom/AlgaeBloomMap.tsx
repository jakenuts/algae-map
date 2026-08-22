import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useBloomData, DateFilterOption } from './useBloomData';
import { BloomMarker } from './BloomMarker';
import MapLayers from './MapLayers';
import { PulseLoader } from 'react-spinners';
import { BloomData } from '../../api/bloomService';
import { getAdvisoryStatus } from '../../utils/markerUtils';
import './AlgaeBloomMap.css';

const OFFICIAL_MAP_URL = 'https://www.mywaterquality.ca.gov/habs/resources/reports-map/';
const recordId = (bloom: BloomData) => String(
  bloom.Bloom_Report_ID
  ?? [bloom.Water_Body_Name, bloom.Landmark, bloom.Bloom_Latitude, bloom.Bloom_Longitude, bloom.Bloom_Date_Created].join('-'),
);

const formatTimestamp = (value: string | null) => {
  if (!value) return 'Refreshing now';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Recently refreshed' : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
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
  const assessmentDetail = selectedBloom?.Reported_Management_Organizations
    || selectedBloom?.AdvisoryDetail
    || selectedBloom?.Advisory_Detail_Description;

  const selectBloom = (bloom: BloomData) => {
    setSelectedId(recordId(bloom));
    setShowAssessmentDetails(false);
    setShowTools(false);
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
        <button
          type="button"
          className="tools-toggle"
          aria-expanded={showTools}
          aria-controls="map-tools"
          onClick={() => setShowTools((isOpen) => !isOpen)}
        >
          Map tools
        </button>
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
          <div id="map-tools" className={`secondary-controls${showTools ? ' is-open' : ''}`}>
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
      <div className="map-wrapper">
        <MapContainer center={[37.5, -119.5]} zoom={6} className="map-container" zoomControl={false}>
          <MapLayers />
          <ZoomControl position="bottomright" />
          <ViewportController selectedBloom={selectedBloom} userLocation={userLocation} />
          {userLocation && <CircleMarker center={userLocation} radius={8} pathOptions={{ color: '#083e50', fillColor: '#38bdf8', fillOpacity: 1, weight: 3 }} />}
          {matchingBloomData.map((bloom) => <BloomMarker key={recordId(bloom)} bloom={bloom} onSelect={selectBloom} />)}
          {localMonitoring.map((station) => (
            <CircleMarker
              key={station.id}
              center={[station.latitude, station.longitude]}
              radius={9}
              pathOptions={{ color: '#ffffff', fillColor: '#036f82', fillOpacity: 1, weight: 3 }}
            >
              <Tooltip direction="top" offset={[0, -11]} opacity={1}>Live Hoopa monitoring — {station.name}</Tooltip>
              <Popup>
                <article className="popup-container">
                  <p className="live-monitoring-status">Live local monitoring — not an advisory</p>
                  <h2>{station.name}</h2>
                  <dl>
                    <dt>Blue-green algae</dt><dd>{station.value.toFixed(2)} {station.unit}</dd>
                    <dt>Station reading</dt><dd>{station.observedAt || 'Timestamp unavailable'}</dd>
                  </dl>
                  <p className="popup-safety-note"><strong>Use this as a signal, not a clearance.</strong> This is a raw local instrument reading, not a toxin result or public-health advisory. Do not use it alone to decide whether it is safe for your dog.</p>
                  <a href={station.sourceUrl} target="_blank" rel="noopener noreferrer">View Hoopa live trend</a>
                </article>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
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
