import L from 'leaflet';

import { BloomData } from '../api/bloomService';

export type AdvisoryKind = 'danger' | 'warning' | 'caution' | 'alert' | 'awareness' | 'reported';

export interface AdvisoryStatus {
  kind: AdvisoryKind;
  label: string;
  isAdvisory: boolean;
}

export const getAdvisoryStatus = (bloom: BloomData): AdvisoryStatus => {
  const detail = [bloom.Advisory_Recommended, bloom.Reported_Advisory_Types]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (detail.includes('danger')) return { kind: 'danger', label: 'Danger advisory', isAdvisory: true };
  if (detail.includes('warning')) return { kind: 'warning', label: 'Warning advisory', isAdvisory: true };
  if (detail.includes('caution')) return { kind: 'caution', label: 'Caution advisory', isAdvisory: true };
  if (detail.includes('alert')) return { kind: 'alert', label: 'Algal mat alert', isAdvisory: true };
  if (detail.includes('general awareness')) return { kind: 'awareness', label: 'General awareness', isAdvisory: true };

  return { kind: 'reported', label: 'No advisory recorded', isAdvisory: false };
};

export const getCustomIcon = (kind: AdvisoryKind): L.DivIcon => L.divIcon({
  className: 'advisory-marker-shell',
  html: `<span class="advisory-marker advisory-marker--${kind}" aria-hidden="true"></span>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
});
