import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './AlgaeBloomMap.css';
import { fetchBloomData, BloomData } from './api/bloomService.ts';
import { getCustomIcon, determineSeverity } from './utils/markerUtils.ts';

const { BaseLayer } = LayersControl;

const AlgaeBloomMap: React.FC = () => {
  const [bloomData, setBloomData] = useState<BloomData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchBloomData();
        setBloomData(data);
      } catch (error) {
        console.error('Error fetching the bloom data:', error);
      }
    };

    fetchData();
  }, []);

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
        bloom.Bloom_Latitude && bloom.Bloom_Longitude && (
          <Marker
            key={index}
            position={[parseFloat(bloom.Bloom_Latitude), parseFloat(bloom.Bloom_Longitude)]}
            icon={getCustomIcon(bloom.Reported_Advisory_Types, determineSeverity(bloom))}
          >
            <Tooltip direction="top" offset={[0, -20]} opacity={1}>
              <span>{bloom.Water_Body_Name} - {determineSeverity(bloom).toUpperCase()} Severity</span>
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
        )
      ))}
    </MapContainer>
  );
};

export default AlgaeBloomMap;
