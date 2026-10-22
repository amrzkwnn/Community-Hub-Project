// ============================================================================
// Bandar Elmina & Denai Alam Official Township Boundary Utility
// Accurately validates incident coordinates to prevent out-of-boundary pins
// ============================================================================

export type Coordinate = [number, number]; // [latitude, longitude]

/**
 * Approximate geographic polygon boundary enclosing Bandar Elmina & Denai Alam
 * (Shah Alam / Sungai Buloh, Selangor, Malaysia)
 * Coordinates in [latitude, longitude]
 */
export const ELMINA_BOUNDARY_POLYGON: Coordinate[] = [
  [3.2185, 101.4880], // NW - Elmina West / Kuang border
  [3.2220, 101.5120], // N - Elmina Green 3 / Saujana Utama border
  [3.2160, 101.5320], // NE - Elmina Green 1 / Subang Bestari
  [3.1950, 101.5420], // E - Persiaran Elmina / RRIM border
  [3.1750, 101.5380], // SE - Denai Alam / Bukit Jelutong connection
  [3.1580, 101.5240], // S - Denai Impian / Bukit Subang border
  [3.1550, 101.4980], // SW - Guthrie Corridor interchange
  [3.1850, 101.4780], // W - Ladang Elmina / Puncak Alam border
  [3.2185, 101.4880], // Closing coordinate
];

/**
 * Key landmarks and precincts within Elmina for auto-snapping or suggestion
 */
export const ELMINA_PRECENT_CENTROIDS = [
  { name: 'Elmina Central Park & Lake', lat: 3.180200, lng: 101.518800 },
  { name: 'Persiaran Elmina (Rainbow Bridge)', lat: 3.179321, lng: 101.516512 },
  { name: 'Elmina Green 3', lat: 3.181800, lng: 101.512500 },
  { name: 'Elmina Green 1', lat: 3.181200, lng: 101.514200 },
  { name: 'Elmina West Wetland Retention Basin', lat: 3.183400, lng: 101.509800 },
  { name: 'Elmina Valley', lat: 3.178500, lng: 101.519000 },
  { name: 'Denai Alam (Jalan Denai Impian)', lat: 3.174120, lng: 101.521840 },
  { name: 'Elmina Lakeside Mall', lat: 3.182000, lng: 101.520500 },
];

/**
 * Ray-casting algorithm to determine if a point (lat, lng) is inside a polygon
 */
export function isPointInsideElmina(lat: number, lng: number): boolean {
  if (isNaN(lat) || isNaN(lng)) return false;

  const polygon = ELMINA_BOUNDARY_POLYGON;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Validates coordinates and returns validation result with clear user error message
 */
export function validateElminaCoordinates(lat: number, lng: number): {
  isValid: boolean;
  message?: string;
  nearestPrecinct?: string;
} {
  const inside = isPointInsideElmina(lat, lng);

  if (!inside) {
    return {
      isValid: false,
      message: `Coordinates (${lat.toFixed(4)}, ${lng.toFixed(4)}) are outside the Elmina township boundary. Please choose a location within the Elmina zone (Elmina East, West, Green, Valley, or Denai Alam).`,
    };
  }

  // Find nearest landmark/precinct
  let nearest = ELMINA_PRECENT_CENTROIDS[0].name;
  let minDistance = Infinity;

  for (const loc of ELMINA_PRECENT_CENTROIDS) {
    const d = Math.hypot(loc.lat - lat, loc.lng - lng);
    if (d < minDistance) {
      minDistance = d;
      nearest = loc.name;
    }
  }

  return {
    isValid: true,
    nearestPrecinct: nearest,
  };
}
