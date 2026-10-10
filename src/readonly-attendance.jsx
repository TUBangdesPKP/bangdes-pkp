import { useEffect, useState } from 'react';
import { Eye, FileText } from 'lucide-react';
import { sendClaimRequest } from './archive-claims.js';

export function SavedAttendanceView({ data, onPreview }) {
  if (!data?.exists) return <p className="rounded-xl border bg-white p-6">Belum ada presensi tersimpan untuk periode ini.</p>;
  const rows = data.rows || [], file = data.referenceDocument;
  return <div className="grid lg:grid-cols-12 gap-6 items-start" aria-label="Presensi tersimpan hanya lihat">
    <section className="lg:col-span-4 rounded-3xl border bg-white p-6 space-y-5">
      <h3 className="font-extrabold text-[#084C61]">File Presensi</h3>
      {file ? <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3">
        <p className="text-sm font-semibold break-words">{file.fileName}</p>
        <button type="button" onClick={() => onPreview?.(file)} className="flex items-center gap-2 text-sm text-[#084C61] underline"><Eye size={16}/>Lihat Dokumen</button>
      </div> : <p className="text-sm text-slate-600">PDF asli belum tersedia. Hasil pembacaan presensi tersimpan tetap dapat dilihat di samping.</p>}
      <p className="text-xs text-slate-500">Dokumen dan data presensi hanya dapat dilihat.</p>
      <div className="rounded-xl bg-sky-50 border border-sky-200 p-4 text-sm flex gap-2"><FileText size={18}/><span>Presensi <strong>{data.nama}</strong> ({rows.length} baris)</span></div>
    </section>
    <section className="lg:col-span-8 rounded-3xl border bg-white p-6 space-y-5">
      <header className="flex flex-wrap justify-between gap-4 text-sm"><h3 className="font-extrabold">Preview Data Presensi</h3><div className="text-right"><strong>{data.nama}</strong><p className="text-xs text-slate-500">NIP: {data.nip}</p><p className="text-xs text-teal-800">Periode: {data.periode}</p></div></header>
      <div className="max-h-[520px] overflow-auto rounded-xl border"><table className="w-full text-xs text-left"><thead className="sticky top-0 bg-slate-100"><tr>{['Tanggal','Hari','Datang','Pulang','Ket'].map(label=><th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.tanggal} className="border-t"><td className="p-3 whitespace-nowrap">{row.tanggal}</td><td className="p-3">{row.hari}</td><td className="p-3">{row.datang || '-'}</td><td className="p-3">{row.pulang || '-'}</td><td className="p-3"><span className="rounded border px-2 py-1 bg-slate-50">{row.keterangan}</span></td></tr>)}</tbody></table></div>
      <p className="text-xs text-slate-600">Total Hari Terbaca: <strong>{rows.length} Hari</strong></p>
    </section>
  </div>;
}

export function ReadOnlyAttendance({ endpoint, context, onPreview }) {
  const [state,setState] = useState(null), [retry,setRetry] = useState(0);
  const key = JSON.stringify(context);
  useEffect(()=>{
    let cancelled=false;
    sendClaimRequest(endpoint,{...JSON.parse(key),action:'presensi_tersimpan'}).then(data=>{
      const expected=JSON.parse(key);
      if(data.attendanceVersion!==1 || data.modul!==expected.modul || data.periode!==expected.periode || data.nip!==expected.nip || typeof data.exists!=='boolean' || (data.exists&&!Array.isArray(data.rows))) throw new Error('Data presensi tersimpan tidak sesuai akun/periode. Muat ulang setelah backend diperbarui.');
      if(!cancelled)setState({key,retry,data});
    }).catch(error=>{if(!cancelled)setState({key,retry,error:error.message});});
    return ()=>{cancelled=true;};
  },[endpoint,key,retry]);
  const current=state?.key===key&&state.retry===retry?state:null;
  if(!current)return <p role="status">Memuat presensi tersimpan...</p>;
  if(current.error)return <div role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">{current.error}<button className="block underline mt-3" onClick={()=>setRetry(v=>v+1)}>Muat ulang</button></div>;
  return <SavedAttendanceView data={current.data} onPreview={onPreview}/>;
}
