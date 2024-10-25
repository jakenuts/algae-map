import L from 'leaflet';

import dangerMarker from '../assets/danger-marker.svg';
import noneMarker from '../assets/none-marker.svg';
import otherMarker from '../assets/other-marker.svg';
import warningMarker from '../assets/warning-marker.svg';
import { BloomData } from '../api/bloomService';

export const getCustomIcon = (advisoryType: string, severity: string, iconSize: number): L.Icon => {
  let iconUrl = otherMarker;

  if (advisoryType) {
    const lowerAdvisoryType = advisoryType.toLowerCase();
    if (lowerAdvisoryType.includes('danger')) {
      iconUrl = dangerMarker;
    } else if (lowerAdvisoryType.includes('caution') || lowerAdvisoryType.includes('warning')) {
      iconUrl = warningMarker;
    } else if (lowerAdvisoryType.includes('none')) {
      iconUrl = noneMarker;
    }
  } else {
    // Use severity to determine icon if advisory type is not reported
    switch (severity) {
      case 'high':
        iconUrl = dangerMarker;
        break;
      case 'medium':
        iconUrl = warningMarker;
        break;
      case 'low':
        iconUrl = noneMarker;
        break;
    }
  }

  return L.icon({
    iconUrl,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize],
    popupAnchor: [0, -iconSize]
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
               lowerAdvisoryDetail.includes('below posting triggers') ||
               lowerAdvisoryDescription.includes('no harmful') ||
               lowerAdvisoryDescription.includes('no cyano')) {
      return 'low';
    }
    return 'medium';
  }
  return 'low';
};