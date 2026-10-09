export const MAP_MODES = [
  { id: 'realistic', label: 'Realistis' },
  { id: 'palette', label: 'Palet Aplikasi' },
  { id: 'monochrome', label: 'Monokrom' },
];
export const DEFAULT_MAP_MODE = 'palette';
export const MAP_DATA_VERSION = '169e53b2';
export const IMAGERY_URL = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg';
export const MAP_COLORS = ['#6b9da5', '#9cb9b6', '#d7c78b', '#b9cacc', '#7e9f90', '#e4dab2'];

export function regionStyle(mode, code, { highlighted = false, muted = false, district = false } = {}) {
  const index = [...String(code)].reduce((sum, c) => sum + c.charCodeAt(0), 0) % MAP_COLORS.length;
  const monochrome = mode === 'monochrome';
  return {
    color: highlighted ? (monochrome ? '#15191c' : '#084c61') : mode === 'realistic' ? '#fff0b8' : monochrome ? '#5d656b' : '#245665',
    weight: highlighted ? 2.5 : district ? 1.2 : 1.5,
    opacity: muted ? 0.4 : 1,
    fillColor: highlighted ? (monochrome ? '#6e777e' : '#d7c78b') : monochrome ? '#dce0e3' : MAP_COLORS[index],
    fillOpacity: muted ? 0.15 : mode === 'realistic' ? (highlighted ? 0.35 : 0.06) : highlighted ? 0.95 : 0.9,
  };
}

export function regionBounds(featureOrCollection) {
  const bounds = [[90, 180], [-90, -180]];
  const visit = coordinates => {
    if (typeof coordinates[0] === 'number') {
      const [lng, lat] = coordinates;
      bounds[0][0] = Math.min(bounds[0][0], lat);
      bounds[0][1] = Math.min(bounds[0][1], lng);
      bounds[1][0] = Math.max(bounds[1][0], lat);
      bounds[1][1] = Math.max(bounds[1][1], lng);
    } else coordinates.forEach(visit);
  };
  for (const f of featureOrCollection.features || [featureOrCollection]) visit(f.geometry.coordinates);
  return bounds;
}

// Inverse land mask: imagery is visible in Indonesia only, never in neighbouring countries.
export function outsideIndonesiaMask(provinces) {
  const rings = [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]]];
  for (const feature of provinces.features) {
    const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    for (const polygon of polygons) rings.push(...polygon);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: rings } };
}

export function boundaryPath(provinceCode = '') {
  if (provinceCode && !/^\d{2}$/.test(provinceCode)) throw new Error('Kode provinsi tidak valid.');
  return `maps/indonesia/${provinceCode ? `regencies/${provinceCode}` : 'provinces'}.geojson?v=${MAP_DATA_VERSION}`;
}

export function validateBoundaries(data, provinceCode = '') {
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features) || !data.features.length) throw new Error('Data batas wilayah tidak valid.');
  const codes = new Set();
  for (const feature of data.features) {
    const { code, name } = feature.properties || {};
    if (typeof name !== 'string' || !name.trim() || typeof code !== 'string' || codes.has(code)
      || !(provinceCode ? new RegExp(`^${provinceCode}\\.\\d{2}$`) : /^\d{2}$/).test(code)
      || !['Polygon', 'MultiPolygon'].includes(feature.geometry?.type) || !feature.geometry.coordinates?.length) {
      throw new Error('Data batas wilayah tidak sesuai.');
    }
    codes.add(code);
  }
  return data;
}

// Cache only successful responses; aborted requests and failures must remain retryable.
export function createBoundaryLoader(fetcher = fetch, baseUrl = '/') {
  const cache = new Map();
  return async (provinceCode = '', signal) => {
    const path = boundaryPath(provinceCode);
    signal?.throwIfAborted();
    if (cache.has(path)) return cache.get(path);
    const response = await fetcher(`${baseUrl}${path}`, { signal, credentials: 'omit' });
    if (!response.ok) throw new Error('Batas wilayah belum berhasil dimuat. Silakan coba lagi.');
    const data = validateBoundaries(await response.json(), provinceCode);
    signal?.throwIfAborted();
    cache.set(path, data);
    return data;
  };
}
