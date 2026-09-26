// Fictional local-only data. No fetch can reach the production backend.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { MonthlyRecap } from '../src/monthly-recap.jsx';
const employees = ['Pegawai Uji Satu','Pegawai Uji Dua','Pegawai Uji Tiga','Pegawai Uji Empat','Pegawai Uji Lima'].map((nama,i) => ({nip:String(i),nama,unit:i>=2?'Subdirektorat Uji':'Subbagian Tata Usaha',masuk:20-Math.max(0,i-1),hariKerja:20,dinas:Math.max(0,i-1),cuti:0,tb:0,terlambat:i,psw:0,lupaAbsen:i,adjusted:i,unadjusted:0,assessed:20,clean:20-i,onTime:20-i,avgArrival:440+i*10,flexi:5-i,flexiMinutes:(5-i)*15,completeMonth:true}));
let fail=false, count=0, sequence=0, published=null;
const drafts=new Map();
const publication=()=>({version:1,drafts:[...drafts.values()].map(item=>item.meta),published});
const nativeTimeout=window.setTimeout.bind(window);
window.fetch = async (url,options) => {
  if(url!=='/mock-monthly') throw Error('Network disabled in fixture');
  const payload=JSON.parse(options.body);
  window.dispatchEvent(new CustomEvent('wrap-request',{detail:`${++count}: ${JSON.stringify({...payload,adminKey:payload.adminKey?'[redacted]':undefined})}`}));
  await new Promise(resolve=>nativeTimeout(resolve,500));
  if(fail)return new Response('Service unavailable',{status:503});
  const month=payload.month||'2026-08', rows=['2026-08','2025-12'].includes(month)?employees:[];
  const data={status:'success',publicView:true,wrapVersion:2,month,months:['2026-08','2025-12'],units:['Subbagian Tata Usaha','Subdirektorat Uji'],coverage:{submitted:rows.length,available:rows.length},updatedAt:new Date().toISOString(),employees:rows,daily:rows.map(person=>({unit:person.unit,tanggal:`${month}-03`,status:'WFO',libur:false,hadir:true,arrival:person.avgArrival})),documents:[]};
  if(['proses_wrap_bulanan','publikasikan_wrap_bulanan'].includes(payload.action)) {
    if(payload.adminKey!=='fixture-key')return Response.json({status:'error',message:'Kunci simulasi salah'});
    if(payload.action==='proses_wrap_bulanan'){
      const meta={snapshotId:`test-${++sequence}`,month,savedAt:new Date().toISOString(),employees:rows.length};drafts.set(month,{meta,data:structuredClone(data)});
      return Response.json({status:'success',draft:meta,publication:publication(),data:{...data,publication:publication()}});
    }
    const draft=drafts.get(month);
    if(!payload.confirmed||draft?.meta.snapshotId!==payload.snapshotId)return Response.json({status:'error',message:'Versi berubah'});
    published={...draft.meta,publishedAt:new Date().toISOString()};
    return Response.json({status:'success',publication:publication()});
  }
  return Response.json({...data,employees:[],daily:[],...drafts.get(month)?.data,publication:publication()});
};
export function Fixture(){
  const [request,setRequest]=useState(''),[role,setRole]=useState('super_admin');
  useEffect(()=>{const update=event=>setRequest(event.detail);window.addEventListener('wrap-request',update);return()=>window.removeEventListener('wrap-request',update);},[]);
  return <main className="p-4 md:p-6 bg-slate-50"><div className="text-xs mb-3 space-y-2"><p>SIMULASI LOKAL — angka buatan, tanpa akses Drive. Tidak ada refresh otomatis. Kunci uji: fixture-key.</p><div className="flex flex-wrap gap-3"><label><input type="checkbox" onChange={event=>{fail=event.target.checked;}}/> Simulasikan server gagal</label><button onClick={()=>{if(!employees.some(row=>row.nip==='baru'))employees.push({...employees[0],nip:'baru',nama:'Pegawai Baru Uji'});}}>Tambahkan data masuk</button><label>Peran uji <select value={role} onChange={event=>setRole(event.target.value)}><option value="super_admin">Super Admin</option><option value="admin">Admin</option><option value="pegawai">Pegawai</option></select></label></div><output aria-label="Permintaan rekap">{request}</output></div><MonthlyRecap endpoint="/mock-monthly" role={role}/></main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
