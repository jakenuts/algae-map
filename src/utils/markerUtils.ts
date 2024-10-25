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
      case 'critical':
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

const checkRecommendedSeverity = (recommendedText: string): string | null => {
  const lowerRecommended = recommendedText.toLowerCase();

  // Direct severity mappings that skip other checks
  if (lowerRecommended.includes('none') || lowerRecommended.includes('safe')) {
    return 'low';
  }
  if (lowerRecommended.includes('danger')) {
    return 'critical';
  }

  // Initial severity mappings that can be raised by other checks
  if (lowerRecommended.includes('na')) {
    return 'low';
  }
  if (lowerRecommended.includes('alert sign')) {
    return 'high';
  }
  if (lowerRecommended.includes('general awareness')) {
    return 'low';
  }
  if (lowerRecommended.includes('caution')) {
    return 'medium';
  }
  if (lowerRecommended.includes('visual')) {
    return 'medium';
  }
  if (lowerRecommended.includes('warning')) {
    return 'medium';
  }

  return null;
};

const checkAdditionalSeverity = (bloom: BloomData, baseSeverity: string): string => {
  const lowerAdvisoryDetail = (bloom.AdvisoryDetail || '').toLowerCase();
  const lowerAdvisoryDescription = (bloom.Advisory_Detail_Description || '').toLowerCase();

  // If base severity is already critical, don't lower it
  if (baseSeverity === 'critical') {
    return 'critical';
  }

  // Check for conditions that would raise severity
  if (bloom.Case_Status && bloom.Case_Status.toLowerCase() === 'open') {
    if (lowerAdvisoryDetail.includes('illness') ||
        lowerAdvisoryDetail.includes('detected cyanotoxins') ||
        lowerAdvisoryDetail.includes('toxic') ||
        lowerAdvisoryDescription.includes('illness') ||
        lowerAdvisoryDescription.includes('detected cyanotoxins') ||
        lowerAdvisoryDescription.includes('toxic')) {
      // Only raise to high if not already critical
      return baseSeverity === 'critical' ? 'critical' : 'high';
    }

    // For medium severity, keep it if base severity is higher
    if (baseSeverity === 'high' || baseSeverity === 'critical') {
      return baseSeverity;
    }
    
    if (lowerAdvisoryDetail.includes('no harmful') ||
        lowerAdvisoryDetail.includes('no cyano') ||
        lowerAdvisoryDetail.includes('below posting triggers') ||
        lowerAdvisoryDescription.includes('no harmful') ||
        lowerAdvisoryDescription.includes('no cyano')) {
      return 'low';
    }
    return 'medium';
  }
  return baseSeverity || 'low';
};

export const determineSeverity = (bloom: BloomData): string => {
  // First check Advisory_Recommended field
  const recommendedSeverity = bloom.Advisory_Recommended ? 
    checkRecommendedSeverity(bloom.Advisory_Recommended) : null;

  // If we got a direct severity match that skips other checks, return it
  if (recommendedSeverity === 'critical' || recommendedSeverity === 'low') {
    return recommendedSeverity;
  }

  // Otherwise, use the recommended severity as a base and potentially raise it
  return checkAdditionalSeverity(bloom, recommendedSeverity || 'low');
};
