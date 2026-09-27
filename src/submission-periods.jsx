import { useEffect, useState } from 'react';
import { Calendar, RefreshCw, UploadCloud } from 'lucide-react';
import { sendClaimRequest } from './archive-claims.js';
import { isRecapAdmin } from './monthly-recap-model.js';
import { MONTH_NAMES, submissionPeriodCard } from './submission-period-model.js';

export function SubmissionPeriods({ endpoint, modul, user, adminKey, onAdminKeyChange, onSelect, initialPeriod }) {
  const [year, setYear] = useState(initialPeriod?.year || new Date().getFullYear());
  const [draftYear, setDraftYear] = useState(String(year));
  const [month, setMonth] = useState(initialPeriod?.month ? String(initialPeriod.month) : '');
  const [periods, setPeriods] = useState([]);
  const [loadedKey, setLoadedKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState('');
  const admin = isRecapAdmin(user?.Akun_Role || user?.Role);
  const key = `${modul}:${year}:${reload}`;
  const ready = loadedKey === key;
  const read = () => sendClaimRequest(endpoint, { action:'list_periode_submisi', modul, year });
  const validate = result => {
    if (!Array.isArray(result.periods) || result.periods.length !== 12 || new Set(result.periods.map(p=>p.month)).size !== 12 || result.periods.some(p=>!Number.isInteger(p.month)||p.month<1||p.month>12||!['DIBUKA','DITUTUP'].includes(p.status))) throw new Error('Perbarui deployment backend untuk memuat periode submisi.');
    return result.periods;
  };
  useEffect(() => {
    let cancelled = false;
    sendClaimRequest(endpoint, { action:'list_periode_submisi', modul, year })
      .then(result => { const rows=validate(result); if(!cancelled){setPeriods(rows);setLoadedKey(key);setError('');} })
      .catch(err => { if(!cancelled){setPeriods([]);setLoadedKey(key);setError(err.message);} });
    return () => { cancelled=true; };
  }, [endpoint, modul, year, key]);
  useEffect(() => {
    const focus=()=>setReload(value=>value+1);
    window.addEventListener('focus',focus);
    return ()=>window.removeEventListener('focus',focus);
  }, []);
  const toggle = async period => {
    if(busy)return;
    setBusy(period.id);setError('');setNotice('');
    try {
      const result=await sendClaimRequest(endpoint,{action:'set_periode_submisi',modul,year,month:period.month,periodStatus:period.status==='DIBUKA'?'DITUTUP':'DIBUKA',expectedStatus:period.status,sessionToken:user?.sessionToken,adminKey});
      setPeriods(validate(result));
      setNotice('Status periode tersimpan dan berlaku untuk semua akun.');
    }catch(err){setError(err.message);try{setPeriods(validate(await read()));}catch{setPeriods([]);}}
    finally{setBusy('');}
  };
  const select = async period => {
    if(busy||period.status!=='DIBUKA')return;
    setBusy(period.id);setError('');
    try {
      const rows=validate(await read());setPeriods(rows);
      if(rows.find(p=>p.month===period.month)?.status!=='DIBUKA')throw new Error('Periode baru saja ditutup Admin. Silakan pilih periode yang masih dibuka.');
      onSelect(period);
    }catch(err){setError(err.message);}
    finally{setBusy('');}
  };
  const cards=ready?periods.filter(p=>!month||p.month===Number(month)).map(p=>submissionPeriodCard(modul,year,p.month,p.status)).sort((a,b)=>(a.status===b.status?0:a.status==='DIBUKA'?-1:1)||a.month-b.month):[];
  return <div className="space-y-4 max-w-4xl mx-auto text-gray-900">
    <section className="rounded-2xl border bg-white p-5 space-y-3" aria-label="Pilihan periode submisi">
      <form onSubmit={e=>{e.preventDefault();const value=Number(draftYear);if(Number.isInteger(value)&&value>=2000&&value<=9999){setYear(value);setNotice('');setError('');}else setError('Masukkan tahun 2000–9999.');}} className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold space-y-1">Bulan{modul==='tukin'?' pembayaran':''}<select aria-label="Bulan submisi" value={month} onChange={e=>setMonth(e.target.value)} disabled={!!busy} className="block rounded-xl border p-2 text-sm font-normal"><option value="">Semua bulan</option>{MONTH_NAMES.map((name,i)=><option key={name} value={i+1}>{name}</option>)}</select></label>
        <label className="text-xs font-bold space-y-1">Tahun<input aria-label="Tahun submisi" type="number" min="2000" max="9999" required value={draftYear} disabled={!!busy} onChange={e=>setDraftYear(e.target.value)} className="block rounded-xl border p-2 text-sm font-normal w-28"/></label>
        <button disabled={!!busy} className="rounded-xl bg-[#084C61] text-white px-4 py-2 text-sm">Tampilkan</button>
        <button type="button" disabled={!!busy||!ready} onClick={()=>setReload(value=>value+1)} className="flex gap-1 items-center text-xs p-2 disabled:opacity-40"><RefreshCw size={14}/>Muat ulang status</button>
      </form>
      <p className="text-xs text-slate-500">{modul==='tukin'?'Bulan pembayaran menentukan presensi tanggal 11 dua bulan sebelumnya sampai tanggal 10 bulan sebelumnya.':'Uang Makan menggunakan tanggal pertama sampai terakhir pada bulan yang dipilih.'} Periode baru perlu diaktifkan Admin.</p>
      {admin&&!user?.sessionToken&&<label className="block text-xs text-slate-600">Kunci admin untuk membuka/menutup periode<input aria-label="Kunci admin periode" type="password" autoComplete="off" value={adminKey} onChange={e=>onAdminKeyChange(e.target.value)} className="block border rounded-xl px-3 py-2 mt-1"/><span className="block mt-1">Gunakan kunci publikasi rekap, bukan PIN. Kunci hanya tersimpan sementara di halaman ini.</span></label>}
      {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
      {notice&&<p role="status" className="text-xs text-teal-700">{notice}</p>}
      {!ready&&<p role="status" className="text-sm text-slate-500">Memuat periode {year}...</p>}
    </section>
    {cards.map(period=>{const closed=period.status!=='DIBUKA';return <section key={period.id} className={`rounded-3xl border p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${closed?'bg-gray-50 border-gray-200':'bg-white border-gray-200 shadow-sm'}`}>
      <div className="space-y-2"><div className="flex items-center gap-3"><span className={`rounded-full border px-3 py-0.5 text-[10px] font-extrabold ${closed?'text-red-700 border-red-200 bg-red-50':'text-emerald-700 border-emerald-200 bg-emerald-50'}`}>{period.status}</span>
        {admin&&<button type="button" role="switch" aria-checked={!closed} aria-label={`Akses ${MONTH_NAMES[period.month-1]} ${year}`} disabled={!!busy||(!user?.sessionToken&&!adminKey)} onClick={()=>toggle(period)} className="flex gap-2 items-center disabled:opacity-40"><span className={`w-9 h-5 rounded-full relative ${closed?'bg-gray-300':'bg-emerald-500'}`}><span className={`w-4 h-4 bg-white rounded-full absolute top-0.5 ${closed?'left-0.5':'left-[18px]'}`}/></span><span className="text-[10px] font-bold">{closed?'Akses Ditutup':'Akses Dibuka'}</span></button>}
      </div><h3 className={`text-lg font-black ${closed?'text-gray-500':'text-gray-900'}`}>{period.title}</h3><p className="flex gap-2 items-center text-xs text-gray-500"><Calendar size={14}/>{period.periodeLabel} · {period.tipe}</p></div>
      <button disabled={closed||!!busy} onClick={()=>select(period)} className="px-6 py-3 rounded-2xl font-bold text-xs text-white bg-[#143E50] flex gap-2 items-center justify-center disabled:opacity-40"><UploadCloud size={16}/>{busy===period.id?'Memeriksa...':closed?'Ditutup':'Pilih & Lanjut'}</button>
    </section>;})}
  </div>;
}
