/**
 * Calculate the great circle distance between two points on the Earth (Haversine formula).
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Distance in kilometers
 */
export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // 1 decimal place (e.g. 2.4 km)
};

const toRad = (deg: number): number => {
  return (deg * Math.PI) / 180;
};

/**
 * Estimate travel time in minutes based on distance and average urban vehicle speed.
 * @param distanceKm Distance in kilometers
 * @param avgSpeedKmH Average urban scrap loader speed (default 20 km/h)
 * @returns ETA in minutes
 */
export const estimateEtaMinutes = (
  distanceKm: number,
  avgSpeedKmH: number = 20
): number => {
  if (distanceKm <= 0.1) return 1;
  const hours = distanceKm / avgSpeedKmH;
  const minutes = Math.ceil(hours * 60) + 3; // +3 mins buffer for traffic/parking
  return minutes;
};
