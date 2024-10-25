import React, { useState } from 'react';
import { MapContainer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useBloomData, DateFilterOption } from './useBloomData';
import { BloomMarker } from './BloomMarker';
import MapLayers from './MapLayers';
import { PulseLoader } from 'react-spinners';
import { FormControl, Select, MenuItem, IconButton, Tooltip } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import warningIcon from '../../assets/warning-marker.svg';
import './AlgaeBloomMap.css';

const LegalDisclaimer: React.FC = () => (
  <div className="legal-disclaimer">
    This map is for informational purposes only. For the most up-to-date and official information, please visit the{' '}
    <a href="https://www.mywaterquality.ca.gov/habs/where/freshwater_events.html" target="_blank" rel="noopener noreferrer">
      California Harmful Algal Blooms Portal
    </a>
    .
  </div>
);

const DateFilter: React.FC<{
  value: DateFilterOption;
  onChange: (value: DateFilterOption) => void;
  label: string;
}> = ({ value, onChange, label }) => (
  <FormControl size="small" className="date-filter">
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as DateFilterOption)}
      displayEmpty
      className="date-select"
    >
      <MenuItem value={14}>14d {label}</MenuItem>
      <MenuItem value={30}>30d {label}</MenuItem>
      <MenuItem value={60}>60d {label}</MenuItem>
      <MenuItem value={90}>90d {label}</MenuItem>
    </Select>
  </FormControl>
);

const LoadingScreen: React.FC = () => (
  <div className="loading-container">
    <PulseLoader color="#2c3e50" size={15} margin={2} />
    <div className="loading-text">Loading Algae Bloom Data...</div>
  </div>
);

const Header: React.FC<{
  observationDays: DateFilterOption;
  setObservationDays: (days: DateFilterOption) => void;
  advisoryDays: DateFilterOption;
  setAdvisoryDays: (days: DateFilterOption) => void;
}> = ({ observationDays, setObservationDays, advisoryDays, setAdvisoryDays }) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <header className="app-header">
      <div className="header-left">
        <img src={warningIcon} alt="" className="app-logo" />
        <h1>Algae Bloom Map</h1>
      </div>
      <div className={`filters-container ${showFilters ? 'show' : ''}`}>
        <DateFilter
          value={observationDays}
          onChange={setObservationDays}
          label="Observation"
        />
        <DateFilter
          value={advisoryDays}
          onChange={setAdvisoryDays}
          label="Advisory"
        />
      </div>
      <Tooltip title="Toggle Filters" placement="left">
        <IconButton 
          className="filter-toggle"
          onClick={() => setShowFilters(!showFilters)}
          aria-label="toggle filters"
        >
          <FilterListIcon />
        </IconButton>
      </Tooltip>
    </header>
  );
};

const AlgaeBloomMap: React.FC = () => {
  const {
    bloomData,
    isLoading,
    error,
    advisoryDays,
    setAdvisoryDays,
    observationDays,
    setObservationDays
  } = useBloomData();

  if (isLoading) return <LoadingScreen />;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="algae-bloom-map">
      <Header
        observationDays={observationDays}
        setObservationDays={setObservationDays}
        advisoryDays={advisoryDays}
        setAdvisoryDays={setAdvisoryDays}
      />
      <div className="map-wrapper">
        <MapContainer center={[37.5, -119.5]} zoom={6} className="map-container">
          <MapLayers />
          {bloomData.map((bloom, index) => (
            <BloomMarker key={index} bloom={bloom} />
          ))}
        </MapContainer>
      </div>
      <LegalDisclaimer />
    </div>
  );
};

export default AlgaeBloomMap;
