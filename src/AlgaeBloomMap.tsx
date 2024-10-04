import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Papa from 'papaparse';
import axios from 'axios';

// Set default marker icon path to fix missing icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface BloomData {
  Water_Body_Name: string;
  Landmark: string;
  County: string;
  Advisory_Date: string;
  Bloom_Latitude: string;
  Bloom_Longitude: string;
  Observation_Date: string;
  Reported_Advisory_Types: string;
}

const AlgaeBloomMap: React.FC = () => {
  const [bloomData, setBloomData] = useState<BloomData[]>([]);

  useEffect(() => {
    // Function to calculate the date difference in days
    const daysDifference = (date1: Date, date2: Date) => {
      const timeDiff = Math.abs(date2.getTime() - date1.getTime());
      return Math.ceil(timeDiff / (1000 * 3600 * 24));
    };

    // Load and parse the CSV data
    const fetchData = async () => {
      try {
        const response = await axios.get(
          'https://data.ca.gov/dataset/ab672540-aecd-42f1-9b05-9aad326f97ec/resource/c6a36b91-ad38-4611-8750-87ee99e497dd/download/bloom-report.csv'
        );

        Papa.parse<BloomData>(response.data, {
          header: true,
          complete: (results) => {
            const today = new Date();
            const filteredData = results.data.filter((row) => {
              const advisoryDate = new Date(row.Advisory_Date);
              return daysDifference(advisoryDate, today) <= 90;
            });
            setBloomData(filteredData);
          },
        });
      } catch (error) {
        console.error('Error fetching the CSV data:', error);
      }
    };

    fetchData();
  }, []);

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