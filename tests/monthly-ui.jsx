// Fictional local-only data. No fetch can reach the production backend.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { MonthlyRecap } from '../src/monthly-recap.jsx';
const employees = ['Pegawai Uji Satu','Pegawai Uji Dua','Pegawai Uji Tiga'].map((nama,i) => ({nip:String(i),nama,unit:i===2?'Subdirektorat Uji':'Subbagian Tata Usaha',masuk:6-i,hariKerja:6,dinas:i,cuti:0,tb:0,terlambat:i,psw:0,lupaAbsen:i,adjusted:i,unadjusted:0,assessed:6,clean:6-i,onTime:6-i,avgArrival:440+i*10}));
window.fetch = async (url,options) => {
  if(url!=='/mock-monthly') throw Error('Network disabled in fixture');
  const payload=JSON.parse(options.body);
  return new Response(JSON.stringify({status:'success',month:payload.month||'2026-08',months:['2026-08'],employees,daily:employees.flatMap(person=>Array.from({length:6},(_,i)=>({nip:person.nip,tanggal:`2026-08-${String(3+i).padStart(2,'0')}`,status:'WFO',libur:false,hadir:true,arrival:person.avgArrival}))),documents:[{nip:'2',type:'spt',id:'test',tujuan:'Kota Uji'}]}));
};
createRoot(document.getElementById('root')).render(<main className="p-6 bg-slate-50"><p className="text-xs mb-3">SIMULASI LOKAL — angka buatan untuk uji tampilan, tidak mengubah Drive.</p><MonthlyRecap endpoint="/mock-monthly"/></main>);
