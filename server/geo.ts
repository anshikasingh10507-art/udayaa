export interface CityCoordinates {
  city: string;
  lat: number;
  lon: number;
}

const CITY_COORDS: CityCoordinates[] = [
  { city: 'Pune', lat: 18.5204, lon: 73.8567 },
  { city: 'Pimpri-Chinchwad', lat: 18.6298, lon: 73.7997 },
  { city: 'Mumbai', lat: 19.076, lon: 72.8777 },
  { city: 'Navi Mumbai', lat: 19.033, lon: 73.0297 },
  { city: 'Thane', lat: 19.2183, lon: 72.9781 },
  { city: 'Nashik', lat: 19.9975, lon: 73.7898 },
  { city: 'Nagpur', lat: 21.1458, lon: 79.0882 },
  { city: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
  { city: 'Hyderabad', lat: 17.385, lon: 78.4867 },
  { city: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
  { city: 'Surat', lat: 21.1702, lon: 72.8311 },
  { city: 'Chennai', lat: 13.0827, lon: 80.2707 },
  { city: 'Delhi NCR', lat: 28.6139, lon: 77.209 },
  { city: 'Gurugram', lat: 28.4595, lon: 77.0266 },
  { city: 'Noida', lat: 28.5355, lon: 77.391 },
  { city: 'Jaipur', lat: 26.9124, lon: 75.7873 },
  { city: 'Indore', lat: 22.7196, lon: 75.8577 },
  { city: 'Satara', lat: 17.6805, lon: 74.0183 },
  { city: 'Kolhapur', lat: 16.705, lon: 74.2433 },
];

export const SUPPORTED_CITIES = CITY_COORDS.map((c) => c.city);

export function getCityCoordinates(cityName: string): { lat: number; lon: number } | null {
  const normalized = cityName.trim().toLowerCase();
  const match = CITY_COORDS.find(
    (c) => c.city.toLowerCase() === normalized || normalized.includes(c.city.toLowerCase())
  );
  return match ? { lat: match.lat, lon: match.lon } : null;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
