import React, { useState, useEffect } from 'react';
import { Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { BloomData } from '../../api/bloomService';
import { getCustomIcon, determineSeverity } from '../../utils/markerUtils';

interface BloomMarkerProps {
  bloom: BloomData;
}

const ZoomHandler: React.FC<{ onZoomChange: (zoom: number) => void }> = ({ onZoomChange }) => {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });
  return null;
};

export const BloomMarker: React.FC<BloomMarkerProps> = ({ bloom }) => {
  const [zoom, setZoom] = useState(6); // Default zoom level
  const map = useMap();

  useEffect(() => {
    setZoom(map.getZoom());
  }, [map]);

  if (!bloom.Bloom_Latitude || !bloom.Bloom_Longitude) return null;

  const position: [number, number] = [parseFloat(bloom.Bloom_Latitude), parseFloat(bloom.Bloom_Longitude)];
  const severity = determineSeverity(bloom);

  // Calculate icon size based on zoom level
  const baseSize = 40;
  const minZoom = 5;
  const maxZoom = 18;
  const sizeMultiplier = (zoom - minZoom) / (maxZoom - minZoom);
  const iconSize = Math.max(baseSize * (0.5 + sizeMultiplier * 0.5), 20); // Minimum size of 20px

  const icon = getCustomIcon(bloom.Reported_Advisory_Types, severity, iconSize);

  return (
    <>
      <ZoomHandler onZoomChange={setZoom} />
      <Marker
        key={`${position[0]}-${position[1]}-${zoom}`}
        position={position}
        icon={icon}
      >
        <Tooltip direction="top" offset={[0, -iconSize / 2]} opacity={1}>
          <span>{bloom.Water_Body_Name} - {severity.toUpperCase()} Severity</span>
        </Tooltip>
        <Popup>
          <div className="popup-container">
            <h3>{bloom.Water_Body_Name}</h3>
            <p><b>Landmark:</b> {bloom.Landmark}</p>
            <p><b>County:</b> {bloom.County}</p>
            <p><b>Advisory Date:</b> {bloom.Advisory_Date}</p>
            <p><b>Observation Date:</b> {bloom.Observation_Date}</p>
            <p><b>Reported Advisory Types:</b> {bloom.Reported_Advisory_Types || 'Not Reported'}</p>
            <p><b>Case Assignment:</b> {bloom.Case_Assignment}</p>
            <p><b>Case Status:</b> {bloom.Case_Status}</p>
            <p><b>Advisory Detail:</b> {bloom.AdvisoryDetail}</p>
            <p><b>Advisory Description:</b> {bloom.Advisory_Detail_Description}</p>
          </div>
        </Popup>
      </Marker>
    </>
  );
};