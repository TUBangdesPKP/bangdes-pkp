import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Exercise the actual controller with a Leaflet test double. These are controller
// tests, not a substitute for browser rendering/visual verification.
function harness() {
  const state = { maps: [], groups: [], tiles: [], observers: [], controls: [] };
  const bounds = coordinates => ({ coordinates, pad() { return this; }, getCenter() { return [0, 0]; } });
  const api = {
    map(element, options) {
      const m = { options, active: new Set(), fits: [], panes: {},
        attributionControl: { addAttribution() {} },
        createPane(name) { this.panes[name] = {style:{}}; }, getPane(name) { return this.panes[name]; },
        removeLayer(layer) { this.active.delete(layer); },
        fitBounds(b, o) { this.fits.push({bounds:b,options:o}); },
        invalidateSize() {}, getBoundsZoom() { return 4; }, setMinZoom(z) { this.minZoom = z; },
        remove() { this.removed = true; this.active.clear(); },
      };
      state.maps.push(m);
      return m;
    },
    control: {
      zoom: options => ({ addTo() { state.controls.push(options); } }),
      scale: options => ({ addTo() { state.controls.push(options); } }),
    },
    canvas: options => options,
    point: (x,y) => [x,y],
    latLngBounds: bounds,
    tileLayer(url, options) {
      const tile = {url,options,events:{},addTo(map) {map.active.add(this);return this;},on(name,fn) {this.events[name]=fn;return this;}};
      state.tiles.push(tile);
      return tile;
    },
    geoJSON(data, options) {
      const group = {data,options,layers:[],addTo(map) {map.active.add(this);return this;},
        eachLayer(callback) {this.layers.forEach(callback);},
        setStyle(style) {this.layers.forEach(layer => layer.setStyle(typeof style === 'function' ? style(layer.feature) : style));},
      };
      for (const feature of data.features || [data]) {
        const layer = {feature,events:{},setStyle(style) {this.style=style;},
          bindTooltip(label, opts) {this.label=label;this.tooltipOptions=opts;},
          on(events) {this.events=events;},getBounds() {return bounds(feature.geometry.coordinates);},
          openTooltip() {this.open=true;},closeTooltip() {this.open=false;},
        };
        options.onEachFeature?.(feature, layer);
        group.layers.push(layer);
      }
      group.setStyle(options.style);
      state.groups.push(group);
      return group;
    },
  };
  return { state, api, ResizeObserver: class {
    constructor(callback) {this.callback=callback;state.observers.push(this);}
    observe() {} disconnect() {this.disconnected=true;}
  }};
}

test('controller drills down, preserves focus when switching mode, resets, recovers from tile errors, and cleans up', async () => {
  const {state,api,ResizeObserver} = harness();
  const doc = {createElement() {return {textContent:''};}};
  // Replace only external environment dependencies, not the code under test.
  let source = fs.readFileSync(new URL('../src/indonesia-map-controller.js', import.meta.url), 'utf8');
  source = source.replace("import L from 'leaflet';", 'const { L, document, ResizeObserver } = globalThis.__bangdesMapHarness;')
    .replace("import 'leaflet/dist/leaflet.css';", '')
    .replace("'./indonesia-map-model.js'", JSON.stringify(new URL('../src/indonesia-map-model.js', import.meta.url).href));
  globalThis.__bangdesMapHarness = {L:api,document:doc,ResizeObserver};
  try {
    const {createIndonesiaMap} = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
    const read = path => JSON.parse(fs.readFileSync(new URL(`../public/maps/indonesia/${path}`,import.meta.url),'utf8'));
    const provinces = read('provinces.geojson');
    const jabar = read('regencies/32.geojson');
    let provinceSelection = '', districtSelection = '', imageryErrors = 0;
    const controller = createIndonesiaMap({},provinces,{
      onProvinceSelect: code => provinceSelection=code,
      onDistrictSelect: code => districtSelection=code,
      onImageryError: () => imageryErrors++,
    });
    const map = state.maps[0];
    const oceanMask = state.groups.find(g => g.options.pane === 'countryMask');
    assert.equal(oceanMask.options.style.fillColor, '#287d92');
    assert.equal(oceanMask.options.style.fillOpacity, 1, 'neighbouring countries stay hidden');
    const provinceGroup = state.groups.find(g => g.data === provinces);
    const java = provinceGroup.layers.find(l => l.feature.properties.code === '32');
    assert.equal(map.active.has(state.tiles[0]),false,'palette must not request imagery');
    const normal = java.style;
    java.events.mouseover();
    assert.notDeepEqual(java.style,normal);
    assert.equal(java.label.textContent,'Jawa Barat');
    java.events.mouseout();
    assert.deepEqual(java.style,normal);
    java.events.click();
    assert.equal(provinceSelection,'32');
    controller.setProvince('32');
    const fits = map.fits.length;
    controller.setProvince('32',jabar);
    assert.equal(map.fits.length,fits,'district fetch must not reset user zoom');
    const regencyGroup = state.groups.find(g => g.data === jabar);
    assert.equal(regencyGroup.layers.length,27);
    const district = regencyGroup.layers[0];
    district.events.click();
    assert.equal(districtSelection,district.feature.properties.code);
    controller.selectDistrict(districtSelection);
    assert.equal(district.open,true);
    const focusedFits = map.fits.length;
    for (const mode of ['realistic','monochrome','palette']) {
      controller.setMode(mode);
      assert.equal(map.active.has(state.tiles[0]),mode==='realistic');
      assert.equal(map.active.has(oceanMask),mode==='realistic','ocean styling stays scoped to satellite mode');
      assert.equal(map.active.has(regencyGroup),true);
      assert.equal(map.fits.length,focusedFits,'mode switch must preserve focus');
      assert.equal(district.style.weight,2.5,'selected district remains highlighted');
    }
    controller.selectDistrict('');
    assert.equal(map.fits.length,focusedFits+1,'all districts restores province bounds');
    controller.setMode('realistic');
    state.tiles[0].events.tileerror();
    assert.equal(imageryErrors,1);
    assert.equal(map.active.has(state.tiles[0]),false);
    assert.equal(map.active.has(regencyGroup),true);
    state.tiles[0].events.tileerror();
    assert.equal(imageryErrors,1);
    controller.setProvince('');
    assert.equal(map.active.has(regencyGroup),false);
    assert.equal(map.active.has(provinceGroup),true);
    controller.destroy();
    assert.equal(map.removed,true);
    assert.equal(state.observers[0].disconnected,true);
  } finally { delete globalThis.__bangdesMapHarness; }
});
