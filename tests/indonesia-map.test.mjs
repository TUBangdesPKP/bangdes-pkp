import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { boundaryPath, createBoundaryLoader, DEFAULT_MAP_MODE, MAP_MODES, outsideIndonesiaMask, regionBounds, regionStyle, validateBoundaries } from '../src/indonesia-map-model.js';

const root = new URL('../public/maps/indonesia/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, root), 'utf8'));
const provinces = read('provinces.geojson');
const manifest = read('manifest.json');
const province = code => provinces.features.find(f => f.properties.code === code);
const districts = code => read(`regencies/${code}.geojson`);

test('local map has 38 provinces, 514 uniquely mapped districts, and intact pinned files', () => {
  validateBoundaries(provinces);
  assert.equal(provinces.features.length, 38);
  const allCodes = new Set();
  for (const f of provinces.features) {
    const data = validateBoundaries(districts(f.properties.code), f.properties.code);
    for (const d of data.features) {
      assert.equal(allCodes.has(d.properties.code), false);
      allCodes.add(d.properties.code);
    }
  }
  assert.equal(allCodes.size, 514);
  for (const [file, expected] of Object.entries(manifest.files)) {
    const bytes = fs.readFileSync(new URL(file, root));
    assert.equal(bytes.length, expected.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256);
    assert.equal(read(file).features.length, expected.features);
  }
});

test('all source polygon parts survive, valid closed rings and coordinates cover outer archipelagos', () => {
  const count = collection => collection.features.reduce((sum, f) => sum + (f.geometry.type === 'Polygon' ? 1 : f.geometry.coordinates.length), 0);
  assert.equal(count(provinces), 19282);
  let regencyParts = 0;
  for (const f of provinces.features) {
    const data = districts(f.properties.code);
    regencyParts += count(data);
    for (const feature of [f, ...data.features]) {
      const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
      for (const polygon of polygons) for (const ring of polygon) {
        assert.ok(ring.length >= 4);
        assert.deepEqual(ring[0], ring.at(-1));
        for (const [lng, lat] of ring) assert.ok(Number.isFinite(lng) && Number.isFinite(lat) && lng >= 94 && lng <= 142 && lat >= -12 && lat <= 7);
      }
    }
  }
  assert.equal(regencyParts, 19725);
  const [[south, west], [north, east]] = regionBounds(provinces);
  assert.ok(west < 95 && east > 141 && north > 6 && south < -11);
  for (const [code, name] of [['21','Natuna'],['21','Anambas'],['53','Rote Ndao'],['71','Talaud'],['81','Kepulauan Aru'],['96','Raja Ampat']]) {
    assert.ok(districts(code).features.some(f => f.properties.name.includes(name)), name);
  }
});

test('six Papua provinces have their own districts after the administrative split', () => {
  assert.deepEqual(['91','92','93','94','95','96'].map(code => districts(code).features.length), [9,7,4,8,8,6]);
  assert.equal(province('93').properties.name, 'Papua Selatan');
  assert.equal(districts('93').features.find(f => f.properties.code === '93.01').properties.name, 'Kabupaten Merauke');
  assert.equal(province('96').properties.name, 'Papua Barat Daya');
});

test('three modes share geometry, use distinct styles, and monochrome stays grayscale', () => {
  assert.deepEqual(MAP_MODES.map(m => m.label), ['Satelit','Peta','Monokrom']);
  assert.equal(DEFAULT_MAP_MODE, 'palette');
  const normal = regionStyle('palette', '32');
  assert.notEqual(normal.fillColor, regionStyle('palette', '32', { highlighted: true }).fillColor);
  assert.ok(regionStyle('realistic', '32').fillOpacity < 0.1);
  assert.equal(regionStyle('monochrome', '32').fillColor, regionStyle('monochrome', '11').fillColor);
  assert.notEqual(normal.fillColor, regionStyle('monochrome', '32').fillColor);
  assert.equal(regionStyle('monochrome', '32', { highlighted: true }).color, '#15191c');
});

test('realistic mask reverses every land ring, not a bounding box that hides remote islands', () => {
  const mask = outsideIndonesiaMask(provinces);
  assert.equal(mask.geometry.type, 'Polygon');
  assert.equal(mask.geometry.coordinates.length, 19285);
  assert.deepEqual(mask.geometry.coordinates[0][0], [-180,-85]);
  assert.deepEqual(mask.geometry.coordinates[1], provinces.features[0].geometry.coordinates[0][0]);
});

test('boundary loader uses same-origin files, caches success, and loads only requested province', async () => {
  const calls = [];
  const loader = createBoundaryLoader(async (url, options) => {
    calls.push({url,options});
    return { ok: true, json: async () => url.includes('regencies/32') ? districts('32') : provinces };
  }, '/app/');
  assert.equal(await loader(), provinces);
  assert.equal(await loader(), provinces);
  assert.equal((await loader('32')).features.length, 27);
  await loader('32');
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /^\/app\/maps\/indonesia\/provinces\.geojson\?v=/);
  assert.match(calls[1].url, /regencies\/32\.geojson/);
  assert.equal(calls[0].options.credentials, 'omit');
  assert.throws(() => boundaryPath('../secret'));
  assert.throws(() => validateBoundaries(districts('11'), '32'));
  assert.throws(() => validateBoundaries({type:'FeatureCollection',features:[]}));
});

test('failed or cancelled fetches are not cached, successful retry remains possible', async () => {
  let call = 0;
  const loader = createBoundaryLoader(async () => ({ ok: ++call > 1, json: async () => provinces }));
  await assert.rejects(loader());
  assert.equal(await loader(), provinces);
  assert.equal(call, 2);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loader('', controller.signal), {name:'AbortError'});
});

test('map shell renders without browser APIs and offers accessible mode and region controls', async () => {
  const bundle = await build({configFile:false,plugins:[react()],logLevel:'error',ssr:{noExternal:true},build:{ssr:'src/physical-progress-map.jsx',write:false,rollupOptions:{external:['react','react/jsx-runtime','lucide-react']}}});
  const code = bundle.output.find(x => x.type === 'chunk' && x.isEntry).code.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g, (_,q,s) => `from ${JSON.stringify(import.meta.resolve(s))}`);
  const { PhysicalProgressMap } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  const html = renderToStaticMarkup(React.createElement(PhysicalProgressMap));
  assert.match(html, /Peta Wilayah Indonesia/);
  assert.match(html, /aria-label="Mode tampilan peta"/);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  for (const mode of MAP_MODES) assert.ok(html.includes(mode.label));
  assert.match(html, /role="region" aria-label="Peta interaktif Indonesia/);
  assert.match(html, /Seluruh Indonesia/);
  assert.match(html, /role="status"/);
  assert.match(html, /38 provinsi/);
  assert.match(html, /--satellite-ocean:#287d92/);
  assert.doesNotMatch(html, /Realistis|Palet Aplikasi/);
  assert.doesNotMatch(html, /10\.493|100%|service_role|supabase/);
});
