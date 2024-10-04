import React from 'react';
import { MapContainer, TileLayer, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useBloomData } from './useBloomData';
import { BloomMarker } from './BloomMarker';
import './AlgaeBloomMap.css';

const { BaseLayer } = LayersControl;

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
      <MapContainer center={[37.5, -119.5]} zoom={6} className="map-container">
        <LayersControl position="topright">
          <BaseLayer checked name="Street View">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
            />
          </BaseLayer>
          <BaseLayer name="Satellite View">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
            />
          </BaseLayer>
        </LayersControl>

        {bloomData.map((bloom, index) => (
          <BloomMarker key={index} bloom={bloom} />
        ))}
      </MapContainer>
      <LegalDisclaimer />
    </div>
  );
};

export default AlgaeBloomMap;