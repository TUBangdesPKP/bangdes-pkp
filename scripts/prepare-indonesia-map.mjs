// Reproducible asset preparation; no runtime calls to GitHub or Google services.
// Usage: node scripts/prepare-indonesia-map.mjs <directory containing source GeoJSON>
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const sourceDir = process.argv[2];
if (!sourceDir) throw new Error('Provide the directory containing provinsi.geojson and kab_kota.geojson.');
const output = fileURLToPath(new URL('../public/maps/indonesia/', import.meta.url));
const provinces = JSON.parse(await fs.readFile(path.join(sourceDir, 'provinsi.geojson'), 'utf8'));
const districts = JSON.parse(await fs.readFile(path.join(sourceDir, 'kab_kota.geojson'), 'utf8'));
if (provinces.features.length !== 38 || districts.features.length !== 514) throw new Error('Unexpected coverage. Review the source first.');
const codes = new Set(provinces.features.map(f => f.properties.code));
if (codes.size !== 38 || districts.features.some(f => !codes.has(f.properties.code.split('.')[0]))) throw new Error('Invalid province mapping.');

function clean(feature) {
  const { code, name, level } = feature.properties;
  if (!['Polygon', 'MultiPolygon'].includes(feature.geometry?.type)) throw new Error('Unsupported geometry');
  // Keep every coordinate, ring and polygon, including small and outer islands.
  return { type: 'Feature', properties: { code, name: name.trim(), level }, geometry: feature.geometry };
}
const collection = features => ({ type: 'FeatureCollection', features: features.map(clean).sort((a, b) => a.properties.code.localeCompare(b.properties.code)) });
await fs.mkdir(path.join(output, 'regencies'), { recursive: true });
const files = {};
async function write(name, data) {
  const text = JSON.stringify(data);
  await fs.writeFile(path.join(output, name), text + '\n');
  files[name] = { features: data.features.length, bytes: Buffer.byteLength(text + '\n'), sha256: createHash('sha256').update(text + '\n').digest('hex') };
}
await write('provinces.geojson', collection(provinces.features));
for (const code of [...codes].sort()) {
  await write(`regencies/${code}.geojson`, collection(districts.features.filter(f => f.properties.code.startsWith(`${code}.`))));
}
const manifest = {
  source: 'https://github.com/AlfianAliM/Indonesia-GeoJSON',
  revision: '169e53b256e99ee9d3f30c863c05e964a45f7008',
  metadata: provinces.metadata,
  modifications: 'JSON minified, properties reduced, names trimmed, features sorted by code; regencies partitioned by province. Geometry unchanged.',
  files,
};
await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${Object.keys(files).length} boundary files; ${Object.values(files).reduce((sum, f) => sum + f.bytes, 0)} bytes.`);
