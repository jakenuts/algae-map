import React from 'react';
import { MapContainer} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useBloomData } from './useBloomData';
import { BloomMarker } from './BloomMarker';
import  MapLayers  from './MapLayers';

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

const AlgaeBloomMap: React.FC = () => {
  const { bloomData, isLoading, error } = useBloomData();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="algae-bloom-map">
      <MapContainer key="map-container" center={[37.5, -119.5]} zoom={6} className="map-container">
      <MapLayers />
        {bloomData.map((bloom, index) => (
          <BloomMarker key={index} bloom={bloom} />
        ))}
      </MapContainer>
      <LegalDisclaimer />
    </div>
  );
};

export default AlgaeBloomMap;