import { useEffect, useState } from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { sendClaimRequest } from './archive-claims.js';
import { subunitBadge } from './subunit-badge.js';

export function SubmissionSummary({ endpoint, context, user, adminKey, onAdminKeyChange, onSelectEmployee }) {
  const [data, setData] = useState(null);
  const [unit, setUnit] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [files, setFiles] = useState([]);
  const [reload, setReload] = useState(0);
  const { modul, periode } = context;
  const token = user?.sessionToken;
  const adminToken = user?.adminSessionToken;
  useEffect(() => {
    let cancelled = false;
    const request = Promise.resolve().then(() => {
      if (cancelled) return;
      setData(null); setFiles([]); setError('');
      if (!token && !adminToken) { setLoading(false); setError('Silakan keluar dan login kembali agar sesi Admin dapat diverifikasi.'); return; }
      setLoading(true);
      return sendClaimRequest(endpoint, { action: 'list_submisi_terhitung', modul, periode, sessionToken: token, adminSessionToken: adminToken }, undefined, { timeoutMs: 90000 });
    });
    request
      .then(result => { if (!cancelled && result) setData(result.employees || []); })
      .catch(err => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [endpoint, modul, periode, token, adminToken, reload]);
  const groups = [...new Set((data || []).map(row => row.unit))];
  const visible = (data || []).filter(row => !unit || row.unit === unit);
  const generate = async () => {
    if (creating || !adminKey.trim()) return;
    setCreating(true); setError('');
    try {
      const result = await sendClaimRequest(endpoint, { action: 'buat_rekap_submisi', modul, periode, sessionToken: token, adminKey }, undefined, { timeoutMs: 300000 });
      setFiles(result.files || []);
    } catch (err) { setError(err.message + ' Jika koneksi terputus, periksa folder REKAP sebelum mencoba kembali.'); }
    finally { setCreating(false); }
  };
  return <section aria-label="Pegawai sudah terhitung" className="bg-white rounded-2xl border p-5 space-y-3">
    <div className="flex justify-between gap-3 items-center"><h3 className="font-bold text-[#084C61]">Pegawai sudah terhitung <span className="text-xs font-normal">({data?.length ?? '—'})</span></h3><button disabled={loading || creating || (!token && !adminToken)} onClick={() => setReload(v => v + 1)} className="text-xs flex gap-1 items-center disabled:opacity-40"><RefreshCw size={14}/>Muat ulang daftar</button></div>
    <p className="text-xs text-slate-500">Klik nama pegawai untuk melihat rekap tersimpan di tab 5 serta dokumen dan preview di tab 3–4. Tidak memerlukan kunci Buat Rekap.</p>
    {loading && <p role="status" className="text-xs">Memuat hasil perhitungan submisi...</p>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {data && <><div className="flex gap-2 flex-wrap"><button aria-pressed={!unit} onClick={() => setUnit('')} className={`text-xs rounded-full px-3 py-1 ${!unit ? 'bg-[#084C61] text-white' : 'bg-slate-100'}`}>Semua ({data.length})</button>{groups.map(name => { const badge = subunitBadge(name); return <button key={name} aria-pressed={unit === name} onClick={() => setUnit(unit === name ? '' : name)} className={`text-xs rounded-full px-3 py-1 ${unit === name ? 'ring-2 ring-offset-1 ring-slate-400' : ''}`} style={{ backgroundColor: badge.background, color: badge.color }}>{badge.label} ({data.filter(row => row.unit === name).length})</button>; })}</div>
      <div className="max-h-44 overflow-auto rounded-xl border"><table className="w-full text-xs text-left"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-2">Nama</th><th className="p-2">NIP</th><th className="p-2">ASN</th><th className="p-2">SubUnit</th></tr></thead><tbody>{visible.map(row => <tr key={row.nip} className="border-t"><td className="p-2"><button disabled={creating} onClick={() => onSelectEmployee?.(row)} className="text-[#084C61] font-bold underline hover:text-teal-700 disabled:opacity-40">{row.nama}</button></td><td className="p-2 whitespace-nowrap">{row.nip}</td><td className="p-2">{row.jenisAsn}</td><td className="p-2">{subunitBadge(row.unit).label}</td></tr>)}</tbody></table>{visible.length === 0 && <p className="p-3 text-xs text-slate-500">Belum ada hasil perhitungan lengkap.</p>}</div></>}
    <label className="block text-xs text-slate-600">Password / kunci Buat Rekap<input aria-label="Kunci admin rekap submisi" type="password" autoComplete="off" value={adminKey} onChange={e => onAdminKeyChange(e.target.value)} placeholder="Kunci publikasi rekap, bukan PIN login" className="block mt-1 border rounded-lg px-3 py-2 w-full max-w-sm" /></label>
    <div className="flex flex-wrap items-center gap-3"><button onClick={generate} disabled={!data?.length || creating || loading || !adminKey.trim()} className="bg-[#084C61] text-white rounded-xl px-4 py-2 text-xs font-bold flex gap-2 items-center disabled:opacity-40"><FileSpreadsheet size={16}/>{creating ? 'Membuat rekapan...' : 'Buat Rekapan PNS & PPPK'}</button><span className="text-xs text-slate-500">Kunci hanya untuk membuat rekapan. Seluruh SubUnit, hanya hasil lengkap. File bulan yang sama diperbarui di folder REKAP.</span></div>
    {!!files.length && <div role="status" className="text-xs text-teal-800 flex gap-4 flex-wrap"><span>Rekapan tersimpan.</span>{files.map(file => <a key={file.fileId} href={file.url} target="_blank" rel="noreferrer" className="underline">Buka rekap {file.jenisAsn}</a>)}</div>}
  </section>;
}
