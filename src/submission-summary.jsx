import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, XCircle, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { sendClaimRequest } from './archive-claims.js';

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

export function SubmissionSummary({ endpoint, context, user, adminKey, onAdminKeyChange, onSelectEmployee }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [files, setFiles] = useState([]);
  const [reload, setReload] = useState(0);
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const verificationRequest = useRef(0);
  const { modul, periode } = context;
  const token = user?.sessionToken, adminToken = user?.adminSessionToken;
  const key = JSON.stringify([endpoint, modul, periode, token, adminToken, reload]);
  const verificationKey = JSON.stringify([endpoint, modul, periode, token, adminToken, adminKey]);
  const verified = verification?.key === verificationKey && verification.valid;
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
  useEffect(() => () => { verificationRequest.current++; }, []);
  const verify = async () => {
    if (!adminKey.trim() || verified || verifying) return;
    const request = ++verificationRequest.current;
    setVerifying(true);
    try {
      const response = await sendClaimRequest(endpoint, { action: 'validasi_kunci_rekap', sessionToken: token, adminSessionToken: adminToken, adminKey });
      if (response.verified !== true) throw new Error('Backend belum mendukung verifikasi kunci rekap.');
      if (request === verificationRequest.current) setVerification({ key: verificationKey, valid: true });
    } catch (err) { if (request === verificationRequest.current) setVerification({ key: verificationKey, valid: false, error: err.message }); }
    finally { if (request === verificationRequest.current) setVerifying(false); }
  };
  const generate = async () => {
    if (creating || !verified) return;
    setCreating(true); setError(''); setFiles([]);
    try {
      const response = await sendClaimRequest(endpoint, { action: 'buat_rekap_submisi', modul, periode, sessionToken: token, adminKey }, undefined, { timeoutMs: 300000 });
      setFiles(response.files || []);
    } catch (err) { setError(err.message + ' Jika koneksi terputus, periksa folder REKAP sebelum mencoba kembali.'); }
    finally { setCreating(false); }
  };
  const submitted = data.filter(row => row.submitted);
  return <section aria-label="Pilih pegawai untuk penghitungan" className="max-w-7xl mx-auto space-y-6">
    <div className="flex flex-wrap justify-between items-start gap-5">
      <div className="space-y-3 w-full max-w-sm">
        <form onSubmit={event => { event.preventDefault(); verify(); }} className="space-y-2">
          <label className="block text-xs text-slate-600">Password / kunci Buat Rekap
            <input aria-label="Kunci admin rekap submisi" type="password" autoComplete="off" value={adminKey} disabled={creating}
              onChange={event => { verificationRequest.current++; setVerifying(false); setVerification(null); onAdminKeyChange(event.target.value); }} onBlur={verify}
              placeholder="Kunci publikasi rekap, bukan PIN login" className="block mt-1 border rounded-lg bg-white px-3 py-2 w-full"/>
          </label>
          <button disabled={creating || verifying || !adminKey.trim() || verified} className="text-xs text-[#084C61] underline disabled:opacity-50">{verifying ? 'Memverifikasi...' : verified ? 'Kunci terverifikasi' : 'Verifikasi kunci'}</button>
        </form>
        {verification?.key === verificationKey && verification.error && <p role="alert" className="text-xs text-red-700">{verification.error}</p>}
        <button onClick={generate} disabled={!submitted.length || creating || !ready || !verified} className="bg-[#084C61] text-white rounded-xl px-4 py-2.5 text-xs font-bold flex gap-2 items-center disabled:opacity-40"><FileSpreadsheet size={16}/>{creating ? 'Membuat rekapan...' : 'Buat Rekapan PNS & PPPK'}</button>
      </div>
      <div className="text-sm font-bold text-slate-950 space-y-2">
        <p>Sudah submit:</p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1">
          {['PNS', 'PPPK'].map(type => <div key={type} className="contents"><dt>{type}</dt><dd>{ready ? submitted.filter(row => row.jenisAsn === type).length : '—'} Orang</dd></div>)}
          <dt>Total</dt><dd>{ready ? submitted.length : '—'} Orang</dd>
        </dl>
        <button disabled={!ready || creating} onClick={() => setReload(value => value + 1)} className="text-xs font-normal flex gap-1 items-center text-slate-500 disabled:opacity-40"><RefreshCw size={13}/>Muat ulang daftar</button>
      </div>
    </div>
    {!ready && <p role="status" className="text-sm text-slate-500">Memuat daftar pegawai...</p>}
    {(error || (ready && result.error)) && <p role="alert" className="text-sm text-red-700">{error || result.error}</p>}
    {!!files.length && <div role="status" className="text-xs text-teal-800 flex gap-4 flex-wrap"><span>Rekapan tersimpan.</span>{files.map(file => <a key={file.fileId} href={file.url} target="_blank" rel="noreferrer" className="underline">Buka rekap {file.jenisAsn}</a>)}</div>}
    {ready && !result.error && <SubmissionEmployeeCards employees={data} onSelectEmployee={onSelectEmployee} disabled={creating}/>}
  </section>;
}
