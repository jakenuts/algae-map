import L from 'leaflet';

import dangerMarker from '../assets/danger-marker.svg';
import noneMarker from '../assets/none-marker.svg';
import otherMarker from '../assets/other-marker.svg';
import warningMarker from '../assets/warning-marker.svg';
import { BloomData } from '../api/bloomService';

// Severity score ranges
const SEVERITY_RANGES = {
  CRITICAL: { min: 8, max: 10 },
  HIGH: { min: 6, max: 7 },
  MEDIUM: { min: 3, max: 5 },
  LOW: { min: 1, max: 2 },
  SAFE: { min: 0, max: 0 }
} as const;

// Convert numeric score to severity level
const scoreToSeverity = (score: number): string => {
  if (score >= SEVERITY_RANGES.CRITICAL.min) return 'critical';
  if (score >= SEVERITY_RANGES.HIGH.min) return 'high';
  if (score >= SEVERITY_RANGES.MEDIUM.min) return 'medium';
  if (score >= SEVERITY_RANGES.LOW.min) return 'low';
  return 'safe';
};

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
      case 'safe':
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

const getBaseScore = (recommendedText: string): number | null => {
  const lowerRecommended = recommendedText.toLowerCase();

  // Direct severity mappings that skip other checks
  if (lowerRecommended.includes('none') || lowerRecommended.includes('safe')) {
    return 0; // Safe
  }
  if (lowerRecommended.includes('danger')) {
    return 10; // Critical
  }

  // Initial severity mappings that can be modified
  if (lowerRecommended.includes('na')) {
    return 1; // Low
  }
  if (lowerRecommended.includes('general awareness')) {
    return 1; // Low
  }
  if (lowerRecommended.includes('alert sign')) {
    return 4; // Medium + 1
  }
  if (lowerRecommended.includes('warning')) {
    return 5; // Medium + 2
  }
  if (lowerRecommended.includes('caution')) {
    return 4; // Medium + 1
  }
  if (lowerRecommended.includes('visual')) {
    return 3; // Medium
  }

  return 1; // Default to low if no match
};

const calculateSeverityScore = (bloom: BloomData): number => {
  // Check for direct severity mappings first
  if (bloom.Advisory_Recommended) {
    const baseScore = getBaseScore(bloom.Advisory_Recommended);
    if (baseScore === 0 || baseScore === 10) {
      return baseScore; // Return immediately for safe or critical
    }
  }

  // Start with base score or default to low
  let score = bloom.Advisory_Recommended ? 
    getBaseScore(bloom.Advisory_Recommended) ?? 1 : 1;

  const lowerAdvisoryDetail = (bloom.AdvisoryDetail || '').toLowerCase();
  const lowerAdvisoryDescription = (bloom.Advisory_Detail_Description || '').toLowerCase();
  const combinedText = `${lowerAdvisoryDetail} ${lowerAdvisoryDescription}`;

  // Severity increasing factors
  if (combinedText.includes('illness')) score += 2;
  if (combinedText.includes('toxi')) score += 2;
  if (combinedText.includes('detected')) score += 3;
  if (combinedText.includes('harmful')) score += 2;
  // Severity decreasing factors
  if (combinedText.includes('no bloom')) score -= 2;
  if (combinedText.includes('no detected')) score -= 3;
  if (combinedText.includes('no harmful')) score -= 3;
  if (combinedText.includes('no cyano')) score -= 3;
  if (combinedText.includes('no toxi')) score -= 3;
  if (combinedText.includes('below posting triggers')) score -= 2;
  if (combinedText.includes('subsided')) score -= 3;

  // Ensure score stays within bounds
  return Math.min(Math.max(score, 0), 10);
};

export const determineSeverity = (bloom: BloomData): string => {
  const score = calculateSeverityScore(bloom);
  return scoreToSeverity(score);
};
