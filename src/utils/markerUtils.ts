import L from 'leaflet';

import { BloomData } from '../api/bloomService';

export type AdvisoryKind = 'danger' | 'warning' | 'caution' | 'alert' | 'awareness' | 'reported';

export interface AdvisoryStatus {
  kind: AdvisoryKind;
  label: string;
  isAdvisory: boolean;
}

const severityRank: Record<AdvisoryKind, number> = {
  danger: 6,
  warning: 5,
  caution: 4,
  alert: 3,
  awareness: 2,
  reported: 1,
};

export const getMarkerZIndexOffset = (kind: AdvisoryKind): number => severityRank[kind] * 10000;

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

export const getGroupedIcon = (kind: AdvisoryKind, count: number): L.DivIcon => L.divIcon({
  className: 'advisory-marker-shell',
  html: `<span class="advisory-marker advisory-marker--${kind} advisory-marker--grouped" aria-hidden="true"><b>${count}</b></span>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});
