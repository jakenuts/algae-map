export const getMarkerClass = (advisoryType: string): string => {
  if (advisoryType.toLowerCase().includes('danger')) return 'marker-danger';
  if (advisoryType.toLowerCase().includes('caution')) return 'marker-caution';
  if (advisoryType.toLowerCase().includes('warning')) return 'marker-warning';
  if (advisoryType.toLowerCase().includes('none')) return 'marker-none';
  return 'marker-other';
};