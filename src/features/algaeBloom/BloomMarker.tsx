import React from 'react';
import { Marker, Popup, Tooltip } from 'react-leaflet';
import { BloomData } from '../../api/bloomService';
import { getAdvisoryStatus, getCustomIcon } from '../../utils/markerUtils';

interface BloomMarkerProps {
  bloom: BloomData;
}

const formatDate = (date?: string | null) => {
  if (!date) return 'Not reported';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export const BloomMarker: React.FC<BloomMarkerProps> = ({ bloom }) => {
  if (!bloom.Bloom_Latitude || !bloom.Bloom_Longitude) return null;

  const position: [number, number] = [Number(bloom.Bloom_Latitude), Number(bloom.Bloom_Longitude)];
  if (!Number.isFinite(position[0]) || !Number.isFinite(position[1])) return null;

  const advisory = getAdvisoryStatus(bloom);
  const icon = getCustomIcon(advisory.kind);

  return (
    <Marker position={position} icon={icon}>
      <Tooltip direction="top" offset={[0, -14]} opacity={1}>
        <span>{bloom.Water_Body_Name} — {advisory.label}</span>
      </Tooltip>
      <Popup>
        <article className="popup-container">
          <p className={`popup-status popup-status--${advisory.kind}`}>{advisory.label}</p>
          <h2>{bloom.Water_Body_Name}</h2>
          {bloom.Landmark && <p>{bloom.Landmark}</p>}
          <dl>
            {bloom.County && <><dt>County</dt><dd>{bloom.County}</dd></>}
            <dt>Report date</dt><dd>{formatDate(bloom.Bloom_Date_Created)}</dd>
            <dt>Observation</dt><dd>{formatDate(bloom.Observation_Date)}</dd>
            <dt>Advisory date</dt><dd>{formatDate(bloom.Advisory_Date)}</dd>
            <dt>Official advisory</dt><dd>{bloom.Advisory_Recommended || bloom.Reported_Advisory_Types || 'No advisory recorded'}</dd>
          </dl>
          {bloom.AdvisoryDetail && <p className="popup-detail">{bloom.AdvisoryDetail}</p>}
          {bloom.Advisory_Detail_Description && <p className="popup-detail">{bloom.Advisory_Detail_Description}</p>}
        </article>
      </Popup>
    </Marker>
  );
};
