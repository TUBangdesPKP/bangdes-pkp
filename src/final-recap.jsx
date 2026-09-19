import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, CheckCircle2, ArrowLeft } from 'lucide-react';
import { sendClaimRequest } from './archive-claims.js';

export function FinalRecap({ endpoint, context, onBack, onSaved }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState(false);
  const [resolutions, setResolutions] = useState({});
  const [reload, setReload] = useState(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setPreview(null); setChecked(false); setResolutions({});
    sendClaimRequest(endpoint, { ...context, action: 'preview_rekap_final' }).then(result => {
      if (!Array.isArray(result.rows) || !result.revision || !result.spreadsheetId) throw new Error('Perbarui backend Code.gs untuk mengaktifkan preview tab 4.');
      if (!cancelled) setPreview(result);
    }).catch(err => { if (!cancelled) setError(err.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [endpoint, JSON.stringify(context), reload]);
  const rows = preview?.rows || [];
  const conflicts = rows.filter(row => row.konflik);
  const unresolved = conflicts.filter(row => !row.libur && !resolutions[row.tanggal]);
  const moduleLabel = context.modul === 'tukin' ? 'Tunjangan Kinerja' : 'Uang Makan';
  const save = async () => {
    if (!checked || !preview || unresolved.length || saving || loading) return;
    setSaving(true); setError('');
    try {
      const result = await sendClaimRequest(endpoint, { ...context, action: 'simpan_rekap_final',
        revision: preview.revision, confirmed: true, resolutions });
      if (result.spreadsheetId !== preview.spreadsheetId || !Array.isArray(result.rows)) throw new Error('Server belum mengonfirmasi spreadsheet rekap yang diperbarui.');
      if (alive.current) onSaved({ ...preview, ...result });
    } catch (err) { if (alive.current) { setError(err.message); setChecked(false); } }
    finally { if (alive.current) setSaving(false); }
  };
  return <section className="space-y-5" aria-label="Preview akhir presensi">
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
      <h2 className="text-lg font-extrabold text-[#084C61]">Preview Akhir Presensi</h2>
      <p className="text-sm text-gray-600">Keterangan dari tab 2 disesuaikan dengan SPT dan Cuti yang masih aktif. Jam datang/pulang tidak berubah. Sabtu, Minggu, dan keterangan Libur tetap Libur.</p>
      <p className="text-xs text-gray-500">Hanya keterangan dan warna baris pada spreadsheet rekap tab 2 yang akan diperbarui setelah konfirmasi. File Excel asli tetap tersimpan.</p>
      <button type="button" disabled={loading || saving} onClick={() => setReload(v => v + 1)} className="flex gap-2 items-center text-sm text-[#084C61] disabled:opacity-50"><RefreshCw size={16}/>Muat ulang preview</button>
    </div>
    {loading && <p role="status" className="p-5 text-sm">Memuat rekap tab 2 dan klaim aktif...</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-4 text-sm">{error}</p>}
    {!!conflicts.length && <div role="alert" className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 p-4 space-y-2">
      <p className="font-bold flex gap-2 items-center"><AlertCircle size={18}/>{conflicts.length} tanggal memiliki SPT dan Cuti bersamaan.</p>
      <p className="text-sm">Pilih Dinas atau Cuti pada tanggal kerja yang berbenturan. Tanggal libur tetap Libur. {unresolved.length} konflik belum diselesaikan.</p>
    </div>}
    {preview && <>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="p-5 border-b text-sm"><strong>{preview.nama}</strong><p className="text-xs text-gray-500">NIP {preview.nip} · {preview.periode}</p></div>
        <div className="overflow-auto max-h-[560px]">
          <table className="w-full min-w-[850px] text-xs text-left">
            <thead className="sticky top-0 bg-slate-100 text-gray-600"><tr>{['Tanggal', 'Hari', 'Datang', 'Pulang', 'Keterangan Tab 2', 'Keterangan Akhir', 'Dokumen Bukti'].map(label => <th className="px-4 py-3" key={label}>{label}</th>)}</tr></thead>
            <tbody>{rows.map(row => {
              const status = row.libur ? 'Libur' : resolutions[row.tanggal] || row.keterangan;
              const color = status === 'Libur' ? 'bg-[#f4cccc]' : !status ? 'bg-amber-50' : status === 'Dinas' ? 'bg-[#c9efbc]' : status === 'Cuti' ? 'bg-[#affdfd]' : 'bg-white';
              return <tr key={row.tanggal} className={`${color} border-b border-gray-200 text-gray-900`}>
                <td className="px-4 py-3 whitespace-nowrap">{row.tanggal}</td><td className="px-4 py-3">{row.hari}</td><td className="px-4 py-3">{row.datang}</td><td className="px-4 py-3">{row.pulang}</td><td className="px-4 py-3">{row.keteranganAwal}</td>
                <td className="px-4 py-3 font-bold">{row.konflik && !row.libur ? <select aria-label={'Penyelesaian konflik ' + row.tanggal} disabled={saving} value={resolutions[row.tanggal] || ''} onChange={e => { setResolutions(prev => ({ ...prev, [row.tanggal]: e.target.value })); setChecked(false); }} className="border border-amber-400 bg-white rounded-lg px-2 py-2"><option value="">Pilih keterangan</option><option>Dinas</option><option>Cuti</option></select> : status}</td>
                <td className="px-4 py-3 max-w-xs">{row.dokumen.map(doc => <div key={doc.fileId} className="truncate" title={doc.fileName}>{doc.jenisDokumen.toUpperCase()}: {doc.fileName}</div>)}{row.konflik && row.libur && <span className="font-bold">Konflik di hari libur — tetap Libur</span>}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700"><input type="checkbox" checked={checked} disabled={saving || unresolved.length > 0} onChange={e => setChecked(e.target.checked)} className="mt-1"/>Saya telah memeriksa preview dan menyetujui penggantian keterangan pada spreadsheet rekap tab 2.</label>
    </>}
    <div className="flex flex-wrap gap-3 justify-between">
      <button disabled={saving} onClick={onBack} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-sm"><ArrowLeft size={16}/>Kembali ke Dokumen</button>
      <button disabled={!preview || !checked || loading || saving || unresolved.length > 0} onClick={save} className="px-5 py-3 rounded-xl text-white bg-[#084C61] text-sm font-bold disabled:opacity-40">{saving ? 'Memperbarui rekap...' : 'Lanjutkan Perhitungan ' + moduleLabel}</button>
    </div>
  </section>;
}

export function FinalRecapSaved({ result, moduleLabel, onBack }) {
  if (!result) return <div className="bg-white rounded-2xl p-6 space-y-4"><p>Periksa dan konfirmasi preview tab 4 sebelum melanjutkan.</p><button onClick={onBack} className="text-[#084C61] underline">Kembali ke tab 4</button></div>;
  return <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
    <h2 className="text-lg font-bold text-[#084C61] flex items-center gap-2"><CheckCircle2/>Rekap Siap untuk Perhitungan {moduleLabel}</h2>
    <p className="text-sm">Keterangan akhir sudah disimpan pada spreadsheet rekap yang sama. Data awal tetap disimpan sebagai acuan apabila klaim berubah.</p>
    <div className="flex flex-wrap gap-3">{['Dinas','Cuti','Libur'].map(status => <span key={status} className="bg-slate-100 rounded-lg p-3 text-sm">{status}: {result.rows.filter(row => row.keterangan === status).length} hari</span>)}</div>
    <p className="text-xs text-gray-500">Jumlah di atas adalah rekap keterangan, bukan perhitungan nominal pembayaran.</p>
    <a href={result.spreadsheetUrl} target="_blank" rel="noreferrer" className="inline-block text-[#084C61] underline">Buka spreadsheet rekap final</a>
    <div><button onClick={onBack} className="rounded-xl bg-gray-100 px-5 py-3 text-sm">Periksa kembali tab 4</button></div>
  </div>;
}
