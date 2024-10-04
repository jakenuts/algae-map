import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useBloomData } from './useBloomData';
import { getCustomIcon, determineSeverity } from '../../utils/markerUtils';
import { BloomMarker } from './BloomMarker';
import './AlgaeBloomMap.css';

const { BaseLayer } = LayersControl;

const AlgaeBloomMap: React.FC = () => {
  const { bloomData, isLoading, error } = useBloomData();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <MapContainer center={[37.5, -119.5]} zoom={6} style={{ height: '100vh', width: '100%' }}>
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
  );
};

export default AlgaeBloomMap;