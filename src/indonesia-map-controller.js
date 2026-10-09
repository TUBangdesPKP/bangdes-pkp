// Imported only when Progres Fisik is opened. Leaflet never runs during SSR.
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_MAP_MODE, IMAGERY_URL, SATELLITE_OCEAN_COLOR, outsideIndonesiaMask, regionBounds, regionStyle } from './indonesia-map-model.js';

export function createIndonesiaMap(element, provinces, { onProvinceSelect, onDistrictSelect, onImageryError }) {
  let mode = DEFAULT_MAP_MODE;
  let provinceCode = '';
  let districtCode = '';
  let districts = null;
  let districtLayer = null;
  let imageryFailed = false;
  let disposed = false;
  const allBounds = L.latLngBounds(regionBounds(provinces));
  const map = L.map(element, {
    preferCanvas: true, zoomControl: false, zoomSnap: 0.25, zoomDelta: 0.5,
    minZoom: 1, maxZoom: 13, maxBounds: allBounds.pad(0.15), maxBoundsViscosity: 1,
    scrollWheelZoom: false, // Scrolling the page does not accidentally zoom the map.
    attributionControl: true,
  });
  L.control.zoom({ position: 'bottomright', zoomInTitle: 'Perbesar peta', zoomOutTitle: 'Perkecil peta' }).addTo(map);
  L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);
  map.attributionControl.addAttribution('Batas: <a href="https://github.com/AlfianAliM/Indonesia-GeoJSON" target="_blank" rel="noopener noreferrer">© Creasi.co / Peta Nusa</a>');
  map.createPane('countryMask');
  map.getPane('countryMask').style.zIndex = '250';
  map.getPane('countryMask').style.pointerEvents = 'none';
  const mask = L.geoJSON(outsideIndonesiaMask(provinces), {
    pane: 'countryMask', interactive: false, renderer: L.canvas({ pane: 'countryMask', padding: 0.5 }),
    style: { stroke: false, fillColor: SATELLITE_OCEAN_COLOR, fillOpacity: 1, fillRule: 'evenodd' },
  });
  const imagery = L.tileLayer(IMAGERY_URL, {
    attribution: '<a href="https://nasa-gibs.github.io/gibs-api-docs/" target="_blank" rel="noopener noreferrer">NASA GIBS / Blue Marble</a>',
    maxNativeZoom: 8, maxZoom: 13, noWrap: true, bounds: allBounds, keepBuffer: 1,
  });
  const fit = (bounds, maxZoom = 10) => map.fitBounds(bounds, { padding: [24, 24], maxZoom, animate: false });
  const findProvince = code => provinces.features.find(f => f.properties.code === code);
  const label = name => {
    const span = document.createElement('span');
    span.textContent = name;
    return span;
  };
  const style = (feature, district = false, highlighted = false) => regionStyle(mode, feature.properties.code, {
    district, highlighted: highlighted || (district && feature.properties.code === districtCode),
    muted: !district && !!provinceCode && provinceCode !== feature.properties.code,
  });
  const bindRegion = (feature, layer, district = false) => {
    layer.bindTooltip(label(feature.properties.name), { sticky: true, direction: 'top', className: 'indonesia-map-tooltip' });
    layer.on({
      mouseover: () => { layer.setStyle(style(feature, district, true)); },
      mouseout: () => { layer.setStyle(style(feature, district)); },
      click: () => {
        if (district) onDistrictSelect(feature.properties.code);
        else if (provinceCode !== feature.properties.code) onProvinceSelect(feature.properties.code);
      },
    });
  };
  const provinceLayer = L.geoJSON(provinces, {
    style: feature => style(feature), onEachFeature: (feature, layer) => bindRegion(feature, layer),
    bubblingMouseEvents: false,
  }).addTo(map);

  function refreshStyles() {
    provinceLayer.setStyle(feature => style(feature));
    districtLayer?.setStyle(feature => style(feature, true));
  }
  // If imagery fails, keep the vector map usable instead of leaving empty tiles.
  imagery.on('tileerror', () => {
    if (disposed || mode !== 'realistic' || imageryFailed) return;
    imageryFailed = true;
    map.removeLayer(imagery);
    map.removeLayer(mask);
    mode = 'palette';
    refreshStyles();
    onImageryError();
  });
  function reset() {
    const feature = findProvince(provinceCode);
    fit(feature ? L.latLngBounds(regionBounds(feature)) : allBounds, feature ? 10 : 6);
  }
  function resize() {
    if (disposed) return;
    map.invalidateSize({ pan: false });
    map.setMinZoom(Math.max(1, Math.min(6, map.getBoundsZoom(allBounds, false, L.point(48, 48)))));
  }
  reset();
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(element);
  return {
    setMode(nextMode) {
      mode = nextMode;
      if (mode === 'realistic') {
        imageryFailed = false;
        imagery.addTo(map);
        mask.addTo(map);
      } else {
        map.removeLayer(imagery);
        map.removeLayer(mask);
      }
      refreshStyles();
    },
    setProvince(nextCode, data = null) {
      const changed = nextCode !== provinceCode;
      if (changed || data !== districts) {
        if (districtLayer) map.removeLayer(districtLayer);
        districtLayer = null;
        districtCode = '';
        provinceCode = nextCode;
        districts = data;
        if (nextCode && data) districtLayer = L.geoJSON(data, {
          style: feature => style(feature, true),
          onEachFeature: (feature, layer) => bindRegion(feature, layer, true), bubblingMouseEvents: false,
        }).addTo(map);
        refreshStyles();
      }
      if (changed) reset();
    },
    selectDistrict(code) {
      const previousCode = districtCode;
      districtCode = code;
      refreshStyles();
      if (!code && previousCode) reset();
      districtLayer?.eachLayer(layer => {
        if (layer.feature.properties.code === code) {
          fit(layer.getBounds(), 12);
          layer.openTooltip(layer.getBounds().getCenter());
        } else layer.closeTooltip();
      });
    },
    reset,
    destroy() { disposed = true; observer.disconnect(); map.remove(); },
  };
}
