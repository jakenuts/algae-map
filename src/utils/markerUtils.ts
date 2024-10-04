import L from 'leaflet';

import dangerMarker from '../assets/danger-marker.svg';
import noneMarker from '../assets/none-marker.svg';
import otherMarker from '../assets/other-marker.svg';
import warningMarker from '../assets/warning-marker.svg';
import { BloomData } from './api/bloomService';

export const getCustomIcon = (advisoryType: string, severity: string): L.Icon => {
  let iconUrl = otherMarker;

  if (advisoryType) {
    if (advisoryType.toLowerCase().includes('danger')) {
      iconUrl = dangerMarker;
    } else if (advisoryType.toLowerCase().includes('caution')) {
      iconUrl = warningMarker;
    } else if (advisoryType.toLowerCase().includes('warning')) {
      iconUrl = warningMarker;
    } else if (advisoryType.toLowerCase().includes('none')) {
      iconUrl = noneMarker;
    }
  } else {
    // Use severity to determine icon if advisory type is not reported
    if (severity === 'high') {
      iconUrl = dangerMarker;
    } else if (severity === 'medium') {
      iconUrl = warningMarker;
    } else if (severity === 'low') {
      iconUrl = noneMarker;
    }
  }

  return L.icon({
    iconUrl,
    iconSize: [40, 40],
    iconAnchor: [20, 40]
  });
};

export const determineSeverity = (bloom: BloomData): string => {
  const lowerAdvisoryDetail = (bloom.AdvisoryDetail || '').toLowerCase();
  const lowerAdvisoryDescription = (bloom.Advisory_Detail_Description || '').toLowerCase();

  if (bloom.Case_Status && bloom.Case_Status.toLowerCase() === 'open') {
    if (lowerAdvisoryDetail.includes('illness') ||
        lowerAdvisoryDetail.includes('detected cyanotoxins') ||
        lowerAdvisoryDetail.includes('toxic') ||
        lowerAdvisoryDescription.includes('illness') ||
        lowerAdvisoryDescription.includes('detected cyanotoxins') ||
        lowerAdvisoryDescription.includes('toxic')) {
      return 'high';
    } else if (lowerAdvisoryDetail.includes('no harmful') ||
               lowerAdvisoryDetail.includes('no cyano') ||
               lowerAdvisoryDescription.includes('no harmful') ||
               lowerAdvisoryDescription.includes('no cyano')) {
      return 'low';
    }
    return 'medium';
  }
  return 'low';
};