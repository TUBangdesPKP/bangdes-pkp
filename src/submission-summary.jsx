import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, FileSpreadsheet, RefreshCw, Download } from 'lucide-react';
import { sendClaimRequest } from './archive-claims.js';
import { collectEvidenceDownload, saveEvidenceDownload } from './evidence-download.js';
import { confirmSubmittedRecap } from './submission-recap.js';

export function SubmissionEmployeeCards({ employees, onSelectEmployee, disabled = false }) {
  const sorted = [...employees].sort((a, b) => a.nama.localeCompare(b.nama, 'id') || a.nip.localeCompare(b.nip));
  const groups = ['PNS', 'PPPK', ...(sorted.some(row => !['PNS', 'PPPK'].includes(row.jenisAsn)) ? ['Lainnya'] : [])];
  return <div className="space-y-7">{groups.map(group => {
    const people = sorted.filter(row => group === 'Lainnya' ? !['PNS', 'PPPK'].includes(row.jenisAsn) : row.jenisAsn === group);
    return <section key={group} aria-label={`Pegawai ${group}`} className="space-y-3">
      <h3 className="text-sm font-extrabold text-slate-950">{group}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {people.map(row => <button key={row.nip} type="button" disabled={disabled} onClick={() => onSelectEmployee(row)}
          aria-label={`${row.nama} — ${row.submitted ? 'Sudah submit' : 'Belum submit'}`} title={`${row.nama}\nNIP ${row.nip}`}
          className="flex min-h-14 items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-xs font-bold leading-snug text-slate-950 transition hover:border-[#084C61] hover:bg-teal-50 focus-visible:ring-2 focus-visible:ring-[#084C61] disabled:opacity-50">
          <span>{row.nama}</span>
          {row.submitted ? <CheckCircle2 aria-hidden="true" size={19} className="shrink-0 fill-green-600 text-white"/> : <XCircle aria-hidden="true" size={19} className="shrink-0 fill-red-500 text-white"/>}
        </button>)}
      </div>
      {!people.length && <p className="text-xs text-slate-500">Belum ada pegawai {group}.</p>}
    </section>;
  })}</div>;
}

export function SubmissionSummary({ endpoint, context, user, onSelectEmployee }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [files, setFiles] = useState([]);
  const [reload, setReload] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');
  const operation = useRef(0);
  const busy = useRef(false);
  const { modul, periode } = context;
  const token = user?.sessionToken, adminToken = user?.adminSessionToken;
  const key = JSON.stringify([endpoint, modul, periode, token, adminToken, reload]);
  const ready = result?.key === key;
  const data = ready ? result.employees || [] : [];
  useEffect(() => {
    let cancelled = false;
    sendClaimRequest(endpoint, { action: 'list_pegawai_submisi', modul, periode, sessionToken: token, adminSessionToken: adminToken }, undefined, { timeoutMs: 90000 })
      .then(response => {
        if (response.rosterVersion !== 1 || response.modul !== modul || response.periode !== periode || !Array.isArray(response.employees)) throw new Error('Perbarui deployment Code.gs untuk memuat daftar pegawai.');
        if (!cancelled) setResult({ key, employees: response.employees });
      }).catch(err => { if (!cancelled) setResult({ key, error: err.message }); });
    return () => { cancelled = true; };
  }, [endpoint, modul, periode, token, adminToken, key]);
  useEffect(() => () => { operation.current++; }, [endpoint, modul, periode, token, adminToken]);
  const submitted = data.filter(row => row.submitted);
  const generate = async () => {
    if (busy.current || !ready || !submitted.length) return;
    if (!confirmSubmittedRecap({ modul, periode }, submitted.length)) return;
    busy.current = true;
    const current = ++operation.current;
    setCreating(true); setError(''); setFiles([]);
    try {
      const response = await sendClaimRequest(endpoint, { action: 'buat_rekap_submisi', modul, periode, sessionToken: token, adminSessionToken: adminToken, confirmed: true, expectedSubmittedCount: submitted.length }, undefined, { timeoutMs: 300000 });
      if (current === operation.current) setFiles(response.files || []);
    } catch (err) { if (current === operation.current) { setError(err.message + ' Jika koneksi terputus, periksa folder REKAP sebelum mencoba kembali.'); setReload(value => value + 1); } }
    finally { if (current === operation.current) { busy.current = false; setCreating(false); } }
  };
  const download = async () => {
    if (busy.current) return;
    busy.current = true;
    const current = ++operation.current;
    setDownloading(true); setError(''); setDownloadStatus('Menyiapkan daftar bukti dukung...');
    try {
      const archive = await collectEvidenceDownload(endpoint, { modul, periode, sessionToken: token, adminSessionToken: adminToken }, {
        cancelled: () => current !== operation.current,
        onProgress: ({ done, total }) => { if (current === operation.current) setDownloadStatus(`Mengambil berkas ${done}/${total}...`); },
      });
      if (current === operation.current) { saveEvidenceDownload(archive); setDownloadStatus('ZIP siap. Unduhan telah dikirim ke browser.'); }
    } catch (err) { if (current === operation.current) { setError(err.message); setDownloadStatus(''); } }
    finally { if (current === operation.current) { busy.current = false; setDownloading(false); } }
  };
  return <section aria-label="Pilih pegawai untuk penghitungan" className="max-w-7xl mx-auto space-y-6">
    <div className="flex flex-wrap justify-between items-start gap-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={generate} disabled={!submitted.length || creating || downloading || !ready} className="bg-[#084C61] text-white rounded-xl px-4 py-2.5 text-xs font-bold flex gap-2 items-center disabled:opacity-40"><FileSpreadsheet size={16}/>{creating ? 'Membuat rekapan...' : 'Buat Rekapan PNS & PPPK'}</button>
          <button onClick={download} disabled={creating || downloading || (!token && !adminToken)} className="border border-[#084C61] bg-white text-[#084C61] rounded-xl px-4 py-2.5 text-xs font-bold flex gap-2 items-center hover:bg-teal-50 disabled:opacity-40"><Download size={16}/>{downloading ? 'Menyiapkan unduhan...' : `Download Bukti Dukung ${modul === 'tukin' ? 'Tukin' : 'Uang Makan'}`}</button>
        </div>
        {downloadStatus && <p role="status" className="text-xs text-slate-600">{downloadStatus}</p>}
        {downloading && <button onClick={() => { operation.current++; busy.current = false; setDownloading(false); setDownloadStatus('Unduhan dibatalkan.'); }} className="text-xs text-[#084C61] underline">Batalkan unduhan</button>}
      </div>
      <div className="text-sm font-bold text-slate-950 space-y-2">
        <p>Sudah submit:</p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
          {['PNS', 'PPPK'].map(type => <div key={type} className="contents"><dt>{type}</dt><dd>{ready ? submitted.filter(row => row.jenisAsn === type).length : '—'} Orang</dd></div>)}
          <dt>Total</dt><dd>{ready ? submitted.length : '—'} Orang</dd>
        </dl>
        <button disabled={!ready || creating || downloading} onClick={() => setReload(value => value + 1)} className="text-xs font-normal flex gap-1 items-center text-slate-500 disabled:opacity-40"><RefreshCw size={13}/>Muat ulang daftar</button>
      </div>
    </div>
    {!ready && <p role="status" className="text-sm text-slate-500">Memuat daftar pegawai...</p>}
    {(error || (ready && result.error)) && <p role="alert" className="text-sm text-red-700">{error || result.error}</p>}
    {!!files.length && <div role="status" className="text-xs text-teal-800 flex gap-4 flex-wrap"><span>Rekapan tersimpan.</span>{files.map(file => <a key={file.fileId} href={file.url} target="_blank" rel="noreferrer" className="underline">Buka rekap {file.jenisAsn}</a>)}</div>}
    {ready && !result.error && <SubmissionEmployeeCards employees={data} onSelectEmployee={onSelectEmployee} disabled={creating || downloading}/>}
  </section>;
}
