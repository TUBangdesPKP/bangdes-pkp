import { useEffect, useRef, useState } from 'react';
import { Earth, LocateFixed, Map, MapPinned, RotateCcw, Satellite, Scan } from 'lucide-react';
import { createBoundaryLoader, DEFAULT_MAP_MODE, MAP_MODES, SATELLITE_OCEAN_COLOR } from './indonesia-map-model.js';
import './physical-progress-map.css';

const loadBoundaries = createBoundaryLoader(undefined, import.meta.env.BASE_URL);
const modeIcons = { realistic: Satellite, palette: Map, monochrome: Scan };

function useBoundaries(provinceCode, retry, enabled = true) {
  const [result, setResult] = useState({ key: null, data: null, error: '' });
  const key = `${provinceCode}:${retry}`;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 25000);
    loadBoundaries(provinceCode, controller.signal)
      .then(data => { if (active) setResult({ key, data, error: '' }); })
      .catch(() => { if (active) setResult({ key, data: null, error: 'Batas wilayah gagal dimuat. Periksa koneksi lalu coba lagi.' }); })
      .finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [provinceCode, key, enabled]);
  return enabled && result.key === key ? result : { data: null, error: '' };
}

export function PhysicalProgressMap() {
  const [mode, setMode] = useState(DEFAULT_MAP_MODE);
  const [provinceCode, setProvinceCode] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [retry, setRetry] = useState(0);
  const [controller, setController] = useState(null);
  const [mapError, setMapError] = useState('');
  const [imageryError, setImageryError] = useState(false);
  const container = useRef(null);
  const provinces = useBoundaries('', retry);
  const districts = useBoundaries(provinceCode, retry, !!provinceCode);
  const province = provinces.data?.features.find(f => f.properties.code === provinceCode);
  const district = districts.data?.features.find(f => f.properties.code === districtCode);
  const provinceOptions = provinces.data?.features || [];
  const districtOptions = districts.data?.features || [];

  useEffect(() => {
    if (!provinces.data) return;
    let active = true;
    let instance;
    import('./indonesia-map-controller.js').then(({ createIndonesiaMap }) => {
      if (!active) return;
      instance = createIndonesiaMap(container.current, provinces.data, {
        onProvinceSelect: code => { setProvinceCode(code); setDistrictCode(''); },
        onDistrictSelect: setDistrictCode,
        onImageryError: () => { setImageryError(true); setMode('palette'); },
      });
      setController(instance);
    }).catch(() => { if (active) setMapError('Peta belum berhasil dibuka. Silakan muat ulang peta.'); });
    return () => { active = false; instance?.destroy(); };
  }, [provinces.data, retry]);

  useEffect(() => { controller?.setMode(mode); }, [controller, mode]);
  useEffect(() => { controller?.setProvince(provinceCode, districts.data); }, [controller, provinceCode, districts.data]);
  useEffect(() => { controller?.selectDistrict(districtCode); }, [controller, districtCode]);

  const chooseProvince = code => { setProvinceCode(code); setDistrictCode(''); };
  const retryLoading = () => { setMapError(''); setController(null); setRetry(value => value + 1); };
  const error = mapError || provinces.error || districts.error;
  const loading = !error && (!controller || (!!provinceCode && !districts.data));
  return <section className={`physical-map-page physical-map-${mode}`} style={{ '--satellite-ocean': SATELLITE_OCEAN_COLOR }} aria-labelledby="physical-map-title">
    <div className="physical-map-header">
      <div>
        <div className="physical-map-eyebrow"><MapPinned size={16} aria-hidden="true"/> PROGRES FISIK</div>
        <h2 id="physical-map-title">Peta Wilayah Indonesia</h2>
      </div>
      <div className="physical-map-modes" role="group" aria-label="Mode tampilan peta">
        {MAP_MODES.map(item => {
          const Icon = modeIcons[item.id];
          return <button key={item.id} type="button" aria-pressed={mode === item.id}
            onClick={() => { setImageryError(false); setMode(item.id); }}>
            <Icon size={17} aria-hidden="true"/>{item.label}
          </button>;
        })}
      </div>
    </div>
    <div className="physical-map-card">
      <div className="physical-map-toolbar">
        <label>Provinsi
          <select value={provinceCode} onChange={event => chooseProvince(event.target.value)} disabled={!provinces.data}>
            <option value="">Seluruh Indonesia</option>
            {provinceOptions.map(f => <option key={f.properties.code} value={f.properties.code}>{f.properties.name}</option>)}
          </select>
        </label>
        {provinceCode && <label>Kabupaten / Kota
          <select value={districtCode} onChange={event => setDistrictCode(event.target.value)} disabled={!districts.data}>
            <option value="">Semua kabupaten / kota</option>
            {districtOptions.map(f => <option key={f.properties.code} value={f.properties.code}>{f.properties.name}</option>)}
          </select>
        </label>}
        <div className="physical-map-actions">
          <button type="button" onClick={() => chooseProvince('')} disabled={!provinceCode}><Earth size={16}/> Seluruh Indonesia</button>
          <button type="button" title="Atur ulang tampilan peta" aria-label="Atur ulang tampilan peta" onClick={() => controller?.reset()} disabled={!controller}><LocateFixed size={18}/></button>
        </div>
      </div>
      <div className="physical-map-breadcrumb" aria-live="polite">
        <span>Indonesia{province ? ` / ${province.properties.name}` : ''}{district ? ` / ${district.properties.name}` : ''}</span>
        <span>{province ? (districts.data ? `${districtOptions.length} kabupaten / kota` : 'Kabupaten / kota') : '38 provinsi'}</span>
      </div>
      <div className="physical-map-stage">
        <div ref={container} className="physical-map-canvas" role="region" aria-label="Peta interaktif Indonesia. Pilih provinsi pada peta atau daftar provinsi di atas." aria-busy={loading}/>
        {(loading || error) && <div className="physical-map-status" role={error ? 'alert' : 'status'}>
          {error ? <><span>{error}</span><button type="button" onClick={retryLoading}><RotateCcw size={16}/> Coba lagi</button></> : <><span className="physical-map-spinner"/>{provinceCode ? 'Memuat batas kabupaten / kota…' : 'Memuat peta Indonesia…'}</>}
        </div>}
      </div>
      {imageryError && <div className="physical-map-warning" role="status">Citra satelit tidak tersedia. Peta tetap dapat digunakan dalam mode Peta.</div>}
      <div className="physical-map-footer">
        <span>Arahkan kursor untuk melihat nama wilayah. Klik provinsi untuk membuka kabupaten / kota.</span>
        <span className="physical-map-legend"><i aria-hidden="true"/> {provinceCode ? 'Batas kabupaten / kota' : 'Batas provinsi'}</span>
      </div>
    </div>
    <details className="physical-map-sources"><summary>Sumber peta</summary>
      <p>Batas indikatif: <a href="https://github.com/AlfianAliM/Indonesia-GeoJSON" target="_blank" rel="noreferrer">Peta Nusa / Laravel Nusa</a> (38 provinsi, 514 kabupaten/kota; snapshot Februari 2026). Pulau-pulau kecil yang tersedia pada sumber tetap dipertahankan; perbesar peta untuk melihatnya. Bukan rujukan penetapan batas resmi.</p>
      <p>Mode Satelit: <a href="https://nasa-gibs.github.io/gibs-api-docs/" target="_blank" rel="noreferrer">NASA GIBS / Blue Marble</a>, citra relief daratan dan dasar laut dengan penyesuaian warna. Wilayah sekitar hanya sebagai latar; pilihan wilayah tetap Indonesia. Citra statis dengan detail terbatas saat diperbesar, bukan citra langsung atau data progres pembangunan.</p>
    </details>
  </section>;
}
