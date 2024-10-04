import React from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import { BloomData } from '../../api/bloomService';
import { getCustomIcon, determineSeverity } from '../../utils/markerUtils';

interface BloomMarkerProps {
  bloom: BloomData;
}

export const BloomMarker: React.FC<BloomMarkerProps> = ({ bloom }) => {
  if (!bloom.Bloom_Latitude || !bloom.Bloom_Longitude) return null;

  const position: [number, number] = [parseFloat(bloom.Bloom_Latitude), parseFloat(bloom.Bloom_Longitude)];
  const severity = determineSeverity(bloom);

  return (
    <Marker
      position={position}
      icon={getCustomIcon(bloom.Reported_Advisory_Types, severity)}
    >
      <Tooltip direction="top" offset={[0, -20]} opacity={1}>
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
  );
};