import React, { useState, useEffect } from 'react';
import { useMap, LayersControl, TileLayer } from 'react-leaflet';

const MapLayers = () => {
  const [activeBaseLayer, setActiveBaseLayer] = useState('Street View');
  const map = useMap();

  useEffect(() => {
    map.on('baselayerchange', (e) => {
      setActiveBaseLayer(e.name);
    });

    return () => {
      map.off('baselayerchange');
    };
  }, [map]);

  return (
    <>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Street View">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
          />
        </LayersControl.BaseLayer>

        <LayersControl.Overlay checked={activeBaseLayer === 'Satellite'} name="Place Names" >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Source: Esri, DeLorme, USGS, NPS"
          />
        </LayersControl.Overlay>
    
        <LayersControl.BaseLayer name="Topographic">
          <TileLayer 
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            attribution='Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      
    </>
  );
};

export default MapLayers;