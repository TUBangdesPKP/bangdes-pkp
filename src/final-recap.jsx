import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw, CheckCircle2, ArrowLeft, Wallet, Clock } from 'lucide-react';
import { sendClaimRequest } from './archive-claims.js';

export function FinalRecap({ endpoint, context, onBack, onSaved, cachedPreview, cachedReview, onPreviewLoaded, onReviewChange, onInvalidated }) {
  const initialCache = useRef({ key: JSON.stringify(context), preview: cachedPreview, review: cachedReview });
  const callbacks = useRef({ onPreviewLoaded, onReviewChange, onInvalidated });
  callbacks.current = { onPreviewLoaded, onReviewChange, onInvalidated };
  const [preview, setPreview] = useState(cachedPreview || null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!cachedPreview);
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState(cachedReview?.checked || false);
  const [resolutions, setResolutions] = useState(cachedReview?.resolutions || Object.fromEntries((cachedPreview?.rows || []).filter(row => row.penyelesaian).map(row => [row.tanggal, row.penyelesaian])));
  const [schedules, setSchedules] = useState(cachedReview?.schedules || Object.fromEntries((cachedPreview?.rows || []).map(row => [row.tanggal, row.jamKerja || 'biasa'])));
  const [adjustments, setAdjustments] = useState(cachedReview?.adjustments || cachedPreview?.adjustments || {});
  const [reload, setReload] = useState(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (reload === 0 && initialCache.current.key === JSON.stringify(context) && initialCache.current.preview) return;
    let cancelled = false;
    callbacks.current.onPreviewLoaded?.(null);
    setLoading(true); setError(''); setPreview(null); setChecked(false); setResolutions({}); setSchedules({}); setAdjustments({});
    sendClaimRequest(endpoint, { ...context, action: 'preview_rekap_final' }).then(result => {
      if (!Array.isArray(result.rows) || !result.revision || !result.spreadsheetId) throw new Error('Perbarui backend Code.gs untuk mengaktifkan preview tab 4.');
      if (!cancelled) {
        setPreview(result);
        callbacks.current.onPreviewLoaded?.(result);
        setResolutions(Object.fromEntries(result.rows.filter(row => row.penyelesaian).map(row => [row.tanggal, row.penyelesaian])));
        setSchedules(Object.fromEntries(result.rows.map(row => [row.tanggal, row.jamKerja || 'biasa'])));
        setAdjustments(result.adjustments || {});
      }
    }).catch(err => { if (!cancelled) { setError(err.message); if (/Lanjut Proses/.test(err.message)) callbacks.current.onInvalidated?.(); } }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [endpoint, JSON.stringify(context), reload]);
  useEffect(() => {
    if (preview && !loading) callbacks.current.onReviewChange?.({ checked, resolutions, schedules, adjustments });
  }, [preview, loading, checked, resolutions, schedules, adjustments]);
  const changeCorrection = (date, punch, value) => {
    setChecked(false);
    setAdjustments(previous => {
      const next = { ...previous, [date]: { ...previous[date] } };
      if (value === null) delete next[date][punch]; else next[date][punch] = value;
      if (!Object.keys(next[date]).length) delete next[date];
      return next;
    });
  };
  const correctionCell = (row, punch, status) => {
    const original = row[punch === 'datang' ? 'originalDatang' : 'originalPulang'] ?? row[punch];
    const other = punch === 'datang' ? 'pulang' : 'datang';
    const missing = !original || original === '-';
    const correction = adjustments[row.tanggal]?.[punch];
    if (!missing || row.libur || !['WFO','WFA','WFH'].includes(status.toUpperCase())) return original;
    return <div className="space-y-2 min-w-[170px]">
      <span className="text-gray-500">Asli: {original || '-'}</span>
      <label className="flex gap-2 items-center"><input type="checkbox" aria-label={`Koreksi ${punch} ${row.tanggal}`} checked={!!correction} disabled={saving || !preview?.adjustmentDocuments?.length || (!correction && !!adjustments[row.tanggal]?.[other])} onChange={e => changeCorrection(row.tanggal,punch,e.target.checked ? {time:'',fileId:preview.adjustmentDocuments[0].fileId} : null)}/>Koreksi {punch}</label>
      {correction && <><select aria-label={`Surat koreksi ${punch} ${row.tanggal}`} className="border rounded p-1 w-full max-w-[200px]" disabled={saving} value={correction.fileId} onChange={e => changeCorrection(row.tanggal,punch,{...correction,fileId:e.target.value})}>{preview.adjustmentDocuments.map(doc => <option key={doc.fileId} value={doc.fileId}>{doc.fileName}</option>)}</select><input type="time" aria-label={`Jam koreksi ${punch} ${row.tanggal}`} className="border rounded p-1 block" disabled={saving} value={correction.time} onChange={e => changeCorrection(row.tanggal,punch,{...correction,time:e.target.value})}/></>}
    </div>;
  };
  const rows = preview?.rows || [];
  const presentCount = rows.filter(row => !row.libur && ['WFO','WFA','WFH'].includes((resolutions[row.tanggal] || row.keterangan).toUpperCase()) && ['datang','pulang'].some(punch => {
    const original = row[punch === 'datang' ? 'originalDatang' : 'originalPulang'] ?? row[punch];
    const time = adjustments[row.tanggal]?.[punch]?.time || original;
    return time && time !== '-';
  })).length;
  const conflicts = rows.filter(row => row.konflik);
  const unresolved = conflicts.filter(row => !row.libur && !resolutions[row.tanggal]);
  const moduleLabel = context.modul === 'tukin' ? 'Tunjangan Kinerja' : 'Uang Makan';
  const save = async () => {
    if (!checked || !preview || unresolved.length || saving || loading) return;
    setSaving(true); setError('');
    try {
      const result = await sendClaimRequest(endpoint, { ...context, action: 'simpan_rekap_final',
        revision: preview.revision, confirmed: true, resolutions, schedules, adjustments });
      if (result.spreadsheetId !== preview.spreadsheetId || !Array.isArray(result.rows)) throw new Error('Server belum mengonfirmasi spreadsheet rekap yang diperbarui.');
      if (!result.calculation) throw new Error('Backend belum menyediakan perhitungan. Deploy versi terbaru Code.gs terlebih dahulu.');
      if (alive.current) onSaved({ ...preview, ...result, revision: result.revision || null,
        rows: result.rows.map(row => ({ ...row, penyelesaian: resolutions[row.tanggal] || '' })) });
    } catch (err) { if (alive.current) { setError(err.message); setChecked(false); if (/Lanjut Proses/.test(err.message)) callbacks.current.onInvalidated?.(); } }
    finally { if (alive.current) setSaving(false); }
  };
  return <section className="space-y-5" aria-label="Preview akhir presensi">
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
      <h2 className="text-lg font-extrabold text-[#084C61]">Preview Bukti {moduleLabel}</h2>
      <p className="text-sm text-gray-600">Keterangan mengikuti klaim SPT/Cuti. Jam asli dipertahankan kecuali presensi kosong yang Anda koreksi dengan surat lupa absen. Sabtu, Minggu, dan Libur tetap Libur.</p>
      <p className="text-xs text-teal-800">Adjustment maksimal 4 kejadian per bulan kalender, dihitung bersama Uang Makan dan Tukin. Jika datang dan pulang sama-sama kosong, hanya satu yang boleh dikoreksi. Jam koreksi digunakan untuk menghitung TL/PSW; absen yang masih kosong tetap dikenai potongan.</p>
      <p className="text-xs text-gray-500">Lanjut Proses telah memperbarui spreadsheet rekap tab 2. Periksa hasil di bawah; jika ada konflik, tentukan keterangan akhirnya sebelum melanjutkan. File referensi tidak diunggah.</p>
      <button type="button" disabled={loading || saving} onClick={() => setReload(v => v + 1)} className="flex gap-2 items-center text-sm text-[#084C61] disabled:opacity-50"><RefreshCw size={16}/>Muat ulang preview</button>
    </div>
    {loading && <p role="status" className="p-5 text-sm">memproses data terbaru</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-4 text-sm">{error}</p>}
    {!!conflicts.length && <div role="alert" className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 p-4 space-y-2">
      <p className="font-bold flex gap-2 items-center"><AlertCircle size={18}/>{conflicts.length} tanggal memiliki SPT dan Cuti bersamaan.</p>
      <p className="text-sm">Pilih Dinas atau Cuti pada tanggal kerja yang berbenturan. Tanggal libur tetap Libur. {unresolved.length} konflik belum diselesaikan.</p>
    </div>}
    {preview && <>
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="p-5 border-b text-sm flex flex-wrap items-center justify-between gap-4"><div><strong>Preview Data Presensi</strong><p className="text-xs text-gray-500 mt-1">Hasil penyesuaian sesuai dokumen yang diklaim.</p></div><div className="bg-slate-50 border rounded-2xl p-4 text-right"><strong>{preview.nama}</strong><p className="text-xs text-gray-500">NIP: {preview.nip}</p><p className="text-xs text-teal-700 font-bold mt-1">Periode: {preview.periode}</p></div></div>
        <div className="overflow-auto max-h-[560px]">
          <table className="w-full min-w-[800px] text-xs text-left">
            <thead className="sticky top-0 bg-slate-100 text-gray-600"><tr>{['Tanggal', 'Hari', 'Datang', 'Pulang', 'Ket', 'Jam Kerja'].map(label => <th className="px-4 py-3 uppercase" key={label}>{label}</th>)}</tr></thead>
            <tbody>{rows.map(row => {
              const status = row.libur ? 'Libur' : resolutions[row.tanggal] || row.keterangan;
              const color = status === 'Libur' ? 'bg-[#f4cccc]' : row.konflik && !resolutions[row.tanggal] ? 'bg-amber-50' : status === 'Dinas' ? 'bg-[#c9efbc]' : status === 'Cuti' ? 'bg-[#affdfd]' : 'bg-white';
              return <tr key={row.tanggal} className={`${color} border-b border-gray-200 text-gray-900`}>
                <td className="px-4 py-4 whitespace-nowrap font-bold">{new Date(row.tanggal + 'T12:00:00Z').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</td><td className="px-4 py-4">{row.hari}</td><td className="px-4 py-4">{correctionCell(row,'datang',status)}</td><td className="px-4 py-4">{correctionCell(row,'pulang',status)}</td>
                <td className="px-4 py-4 font-bold" title={'Awal: ' + row.keteranganAwal + '\n' + row.dokumen.map(doc => doc.jenisDokumen.toUpperCase() + ': ' + doc.fileName).join('\n')}>{row.konflik && !row.libur ? <select aria-label={'Penyelesaian konflik ' + row.tanggal} disabled={saving} value={resolutions[row.tanggal] || ''} onChange={e => { setResolutions(prev => ({ ...prev, [row.tanggal]: e.target.value })); setChecked(false); }} className="border border-amber-400 bg-white rounded-lg px-2 py-2"><option value="">Pilih keterangan</option><option>Dinas</option><option>Cuti</option></select> : <span className="inline-block border border-black/10 rounded-md px-3 py-1">{status.toUpperCase()}</span>}</td>
                <td className="px-4 py-4"><select aria-label={'Jam kerja ' + row.tanggal} disabled={saving} value={schedules[row.tanggal] || 'biasa'} onChange={e => { setSchedules(prev => ({ ...prev, [row.tanggal]: e.target.value })); setChecked(false); }} className="border border-gray-300 bg-white rounded-lg px-2 py-2"><option value="biasa">Jam Kerja Biasa</option><option value="ramadan">Jam Kerja Ramadan</option></select></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div className="p-5 border-t text-xs text-gray-500 flex flex-wrap gap-5"><span>Total Hari: <strong className="text-gray-900">{rows.length} Hari</strong></span><span>Hari Masuk (WFO/WFA/WFH): <strong className="text-teal-700">{presentCount} Hari</strong></span><a href={preview.spreadsheetUrl} target="_blank" rel="noreferrer" className="ml-auto underline text-[#084C61]">Lihat spreadsheet rekap</a></div>
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700"><input type="checkbox" checked={checked} disabled={saving || unresolved.length > 0} onChange={e => setChecked(e.target.checked)} className="mt-1"/>Saya telah memeriksa preview dan menyetujui hasil akhir pada spreadsheet rekap.</label>
    </>}
    <div className="flex flex-wrap gap-3 justify-between">
      <button disabled={saving} onClick={onBack} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-100 text-sm"><ArrowLeft size={16}/>Kembali ke Dokumen</button>
      <button disabled={!preview || !checked || loading || saving || unresolved.length > 0} onClick={save} className="px-5 py-3 rounded-xl text-white bg-[#084C61] text-sm font-bold disabled:opacity-40">{saving ? 'Memperbarui rekap...' : 'Lanjutkan Perhitungan ' + moduleLabel}</button>
    </div>
  </section>;
}

const rupiah = value => value === null || value === undefined ? 'Belum dapat dihitung' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
const percent = value => value === null || value === undefined ? 'Belum tersedia' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3, minimumFractionDigits: 2 }).format(value) + '%';
function SummaryStat({ value, label, danger = false }) {
  return <div className="bg-white rounded-2xl border border-slate-300 px-3 py-4 text-center"><div className={`text-xl font-extrabold ${danger ? 'text-red-600' : 'text-slate-900'}`}>{value}</div><div className="text-xs text-slate-600 mt-2">{label}</div></div>;
}
export function FinalRecapSaved({ result, moduleLabel, onBack, onDone }) {
  const [done, setDone] = useState(false);
  const top = useRef(null);
  useEffect(() => { top.current?.scrollIntoView({ block: 'start' }); }, [result]);
  if (!result) return <div className="bg-white rounded-2xl p-6 space-y-4"><p>Periksa dan konfirmasi preview tab 4 sebelum melanjutkan.</p><button onClick={onBack} className="text-[#084C61] underline">Kembali ke tab 4</button></div>;
  const calc = result.calculation;
  if (!calc) return <div role="alert" className="p-6 bg-amber-50 rounded-2xl">Perbarui backend lalu lakukan perhitungan kembali di tab 4.<button onClick={onBack} className="block mt-3 underline">Kembali ke tab 4</button></div>;
  const { totals: t, amount: a } = calc, tukin = calc.modul === 'tukin';
  const reportedAdjustments = t.adjustmentReported ?? t.adjusted ?? 0;
  return <section ref={top} aria-label={'Hasil perhitungan ' + moduleLabel} className="space-y-4 max-w-6xl mx-auto">
    <header className="bg-[#0E5B73] text-white rounded-2xl px-5 py-4"><h2 className="font-extrabold text-lg">{result.nama}</h2><p className="text-sm mt-1">NIP {result.nip}</p><p className="text-sm">{calc.jabatan || 'Jabatan belum tersedia'}</p><p className="text-xs mt-2 text-cyan-100">{result.periode} · {moduleLabel}</p></header>
    {!!calc.warnings?.length && <div role="alert" className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-sm text-amber-900"><strong>Perlu penyesuaian sebelum nominal ditetapkan</strong><ul className="list-disc pl-5 mt-2 space-y-1">{calc.warnings.map(w => <li key={w}>{w}</li>)}</ul></div>}
    <div className="bg-slate-50 rounded-xl border border-slate-300 grid grid-cols-2 md:grid-cols-4 gap-4 p-3"><SummaryStat value={t.masuk} label="Masuk Kerja"/><SummaryStat value={t.dinas} label="Dinas Luar"/><SummaryStat value={t.cuti} label="Cuti"/><SummaryStat value={`${t.masuk}/${t.hariKerja}`} label="Masuk Kerja / Hari Kerja"/></div>
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4 flex flex-col gap-4">
        <h3 className="font-bold flex items-center gap-2"><Wallet size={18}/>{moduleLabel}</h3>
        {tukin && <div className="flex justify-between gap-3 text-sm"><span>Besaran Tunjangan</span><strong>{rupiah(a.tarif)}</strong></div>}
        <div className="rounded-xl bg-white border border-slate-300 p-4 space-y-3 text-sm flex-1">
          <h4 className="font-bold">Rincian {moduleLabel}</h4>
          {tukin ? <><div className="flex justify-between gap-3"><span>Persentase SKP</span><strong>{percent(a.skp)}</strong></div><div className="flex justify-between gap-3"><span>Potongan SKP (100% − SKP)</span><span>{percent(a.potonganSkp)}</span></div><div className="flex justify-between gap-3"><span>Potongan Absensi</span><span>{percent(t.potonganAbsensi)}</span></div><div className="border-t border-dashed pt-3 text-xs text-slate-600 space-y-2"><p>Bobot SKP 70% + Kehadiran 30%</p><p>(70% × {percent(a.potonganSkp)}) + (30% × {percent(t.potonganAbsensi)})</p><p className="bg-slate-100 p-2 rounded">Total potongan: {percent(a.persenPotongan)}</p></div></> : <><div className="flex justify-between gap-3"><span>Jumlah Hari Masuk Kerja</span><strong>{t.masuk} Hari</strong></div><div className="flex justify-between gap-3"><span>Besaran Uang Makan</span><strong>{rupiah(a.tarif)}</strong></div><div className="border-t border-dashed pt-3 text-xs text-slate-600"><p>Hari Masuk Kerja × Besaran Uang Makan</p><p className="mt-2">{t.masuk} × {rupiah(a.tarif)} = <strong>{rupiah(a.bruto)}</strong></p></div></>}
        </div>
        <div className="flex justify-between gap-3 text-sm border-b pb-3"><span>Potongan ({percent(a.persenPotongan)}){!tukin && ' sesuai Data_Pegawai'}</span><strong className="text-red-600">{a.potongan === null ? 'Belum dapat dihitung' : '− ' + rupiah(a.potongan)}</strong></div>
        <div className="flex justify-between gap-3 items-center py-2"><strong className="text-sm">{tukin ? 'Tunjangan' : 'Uang Makan'} diterima</strong><strong className="text-xl text-[#0E5B73]">{rupiah(a.netto)}</strong></div>
      </div>
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4"><h3 className="font-bold flex items-center gap-2 mb-3"><AlertCircle size={18}/>Catatan Perbaikan Diri</h3><div className="grid grid-cols-2 gap-3"><SummaryStat value={t.flexi} label="Datang Flexi (hari)"/><SummaryStat value={t.terlambat} label="Terlambat (hari)"/><SummaryStat value={t.psw} label="Pulang Sebelum Waktunya (hari)"/><div className="rounded-2xl border border-slate-300 bg-white p-3 text-center text-xs space-y-2">
          <strong className="text-xl">{reportedAdjustments}</strong><p>Lupa Absen dengan Adjustment</p>
          <p className="font-semibold text-red-700">{t.unadjusted ?? 0} Tidak Absen (kejadian)</p>
          {t.adjustmentDocuments !== undefined && <p className="text-slate-600">{t.adjustmentDocuments} surat diunggah · {t.adjusted ?? 0} koreksi jam<br/>{t.adjustmentDocumentsUnclaimed ?? 0} surat tanpa koreksi jam</p>}
          {tukin && Object.entries(t.adjustmentMonths || {}).map(([month,count]) => <p key={month} className="text-teal-700">{month}: {count} koreksi jam</p>)}
        </div></div><p className="text-xs text-slate-500 mt-3">Surat tanpa koreksi jam tetap dihitung sebagai adjustment. Jam yang masih “-” tetap dikenai potongan; unggah surat tidak otomatis mengubah jam atau nominal.</p></div>
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4"><h3 className="font-bold flex items-center gap-2 mb-3"><Clock size={18}/>Kekurangan Jam Kerja</h3><div className="grid grid-cols-2 gap-3"><SummaryStat value={t.menitTelat} label="Terlambat (menit)"/><SummaryStat value={t.menitPsw} label="Pulang Awal (menit)"/><SummaryStat value={t.menitTanpaPresensi} label="Tidak Presensi (menit)"/><SummaryStat value={t.totalMenit} label="Total (menit)" danger/></div></div>
      </div>
    </div>
    <div className="text-xs text-slate-600 flex flex-wrap gap-4"><span>Tugas Belajar: {t.tb} hari</span><span>Libur: {t.libur} hari</span><span>Tanpa kedua presensi: {t.tidakMasuk} hari</span><span>Menit tanpa presensi dipisahkan agar tidak dihitung dua kali.</span></div>
    <details className="rounded-xl border bg-white p-4 text-sm"><summary className="cursor-pointer font-bold">Rincian per tanggal dan sumber tarif</summary><div className="overflow-auto mt-3"><table className="w-full min-w-[720px] text-xs text-left"><thead><tr>{['Tanggal','Keterangan','Jam kerja','Wajib pulang','TL','PSW','Potongan absensi'].map(label => <th key={label} className="p-2 border-b">{label}</th>)}</tr></thead><tbody>{calc.days.map(day => <tr key={day.tanggal}><td className="p-2 border-b">{day.tanggal}</td><td className="p-2 border-b">{day.status}</td><td className="p-2 border-b">{day.jamKerja === 'ramadan' ? 'Ramadan' : 'Biasa'}</td><td className="p-2 border-b">{['WFO','WFA','WFH'].includes(day.status) ? day.wajibPulang : '—'}</td><td className="p-2 border-b">{day.tl ? 'TL ' + day.tl : '—'}</td><td className="p-2 border-b">{day.psw ? 'PSW ' + day.psw : '—'}</td><td className="p-2 border-b">{percent(day.potongan)}</td></tr>)}</tbody></table></div><p className="text-xs text-slate-500 mt-3">{Object.values(calc.sources || {}).join(' · ')}</p></details>
    <div className="flex flex-wrap gap-5 text-sm text-[#084C61] underline"><a href={result.spreadsheetUrl} target="_blank" rel="noreferrer">Buka spreadsheet rekap</a>{result.note?.url && <a href={result.note.url} target="_blank" rel="noreferrer">Buka catatan perhitungan</a>}</div>
    {done && <p role="status" className="bg-teal-50 text-teal-800 p-4 rounded-xl flex gap-2 items-center"><CheckCircle2 size={18}/>Selesai. Rekap dan catatan perhitungan sudah tersimpan.</p>}
    <div className="grid grid-cols-2 gap-4"><button onClick={onBack} className="rounded-xl px-5 py-3 text-sm flex gap-2 items-center justify-center"><ArrowLeft size={16}/>Kembali</button><button disabled={!calc.complete} onClick={() => { setDone(true); onDone?.(); }} className="rounded-xl bg-[#0E5B73] text-white font-bold px-5 py-3 text-sm disabled:opacity-40">Selesai</button></div>
  </section>;
}
