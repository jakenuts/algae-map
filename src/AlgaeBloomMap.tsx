import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './AlgaeBloomMap.css';
import { fetchBloomData, BloomData } from './api/bloomService';
import { getMarkerClass } from './utils/markerUtils';

// Set default marker icon path to fix missing icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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

  // Customizing the default Leaflet icon with CSS styles for different advisory levels
  const createCustomIcon = (advisoryType: string) => {
    const iconClass = getMarkerClass(advisoryType);
    return L.divIcon({
      html: `<div class="leaflet-marker-icon ${iconClass}">⚠️</div>`, // Adding a symbol for easy visibility
      className: 'custom-leaflet-div-icon', // Adding a new class to simplify CSS styling
      iconSize: [30, 30], // Adjust the size to make it visible
      iconAnchor: [15, 30], // Adjust anchor to make it appear at the correct position
    });
  };

  return (
    <MapContainer center={[37.5, -119.5]} zoom={6} style={{ height: '100vh', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
      />
      {bloomData.map((bloom, index) => (
        bloom.Bloom_Latitude && bloom.Bloom_Longitude && (
          <Marker
            key={index}
            position={[parseFloat(bloom.Bloom_Latitude), parseFloat(bloom.Bloom_Longitude)]}
            icon={createCustomIcon(bloom.Reported_Advisory_Types)}
          >
            <Popup>
              <b>Water Body:</b> {bloom.Water_Body_Name}<br />
              <b>Landmark:</b> {bloom.Landmark}<br />
              <b>County:</b> {bloom.County}<br />
              <b>Advisory Date:</b> {bloom.Advisory_Date}<br />
              <b>Observation Date:</b> {bloom.Observation_Date}<br />
              <b>Reported Advisory Types:</b> {bloom.Reported_Advisory_Types}
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
};

export default AlgaeBloomMap;

// In your main App.tsx file, you would import and use this component like so:
// import React from 'react';
// import AlgaeBloomMap from './AlgaeBloomMap';
// function App() {
//   return (
//     <div className="App">
//       <AlgaeBloomMap />
//     </div>
//   );
// }
// export default App;
