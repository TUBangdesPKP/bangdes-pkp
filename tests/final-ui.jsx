// Manual UI test fixture. No request reaches Google Drive or the production backend.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { FinalRecap, FinalRecapSaved } from '../src/final-recap.jsx';
const context = {modul:'tukin',nip:'TEST',nama:'Pegawai Uji',periode:'11-08-2026 s/d 10-09-2026'};
if (new URLSearchParams(location.search).has('meal')) context.modul = 'uang-makan';
const docs = [{fileId:'spt-copy',fileName:'SPT Uji.pdf',jenisDokumen:'spt'},{fileId:'cuti-copy',fileName:'Cuti Uji.pdf',jenisDokumen:'cuti'}];
const rows = [
  {tanggal:'2026-08-20',hari:'Kamis',datang:'08:45',pulang:'16:29',keteranganAwal:'WFO',keterangan:'WFO',libur:false,konflik:false,dokumen:[]},
  {tanggal:'2026-08-21',hari:'Jumat',datang:'08:10',pulang:'17:00',keteranganAwal:'WFO',keterangan:'',libur:false,konflik:true,dokumen:docs},
  {tanggal:'2026-08-22',hari:'Sabtu',datang:'-',pulang:'-',keteranganAwal:'Libur',keterangan:'Libur',libur:true,konflik:true,dokumen:docs},
  {tanggal:'2026-08-24',hari:'Senin',datang:'08:10',pulang:'17:00',keteranganAwal:'WFO',keterangan:'Dinas',libur:false,konflik:false,dokumen:docs.slice(0,1)},
  {tanggal:'2026-08-25',hari:'Selasa',datang:'08:10',pulang:'17:00',keteranganAwal:'WFO',keterangan:'Cuti',libur:false,konflik:false,dokumen:docs.slice(1)},
];
window.fetch = async (url, options) => {
  if (url !== '/mock-final') throw Error('Network disabled in fixture');
  const payload = JSON.parse(options.body);
  if (payload.action === 'simpan_rekap_final' && (!payload.confirmed || !payload.resolutions['2026-08-21'])) throw Error('Missing confirmation/conflict choice');
  const calculation={modul:context.modul,complete:true,warnings:[],jabatan:'Analis Perumahan',sources:{tarif:'Data_Pegawai, baris uji, kolom Besaran Uang Makan'},
    totals:{masuk:1,hariKerja:4,dinas:2,cuti:1,tb:0,libur:1,flexi:0,terlambat:1,psw:1,tidakMasuk:0,menitTelat:15,menitPsw:31,menitTanpaPresensi:0,totalMenit:46,potonganAbsensi:1.25},
    amount:context.modul==='tukin'?{tarif:6349000,skp:100,potonganSkp:0,persenPotongan:.375,bruto:6349000,potongan:23809,netto:6325191}:{tarif:37000,persenPotongan:5,bruto:37000,potongan:1850,netto:35150},
    days:rows.map(row=>({...row,status:payload.resolutions?.[row.tanggal]||row.keterangan,jamKerja:payload.schedules?.[row.tanggal]||'biasa',wajibPulang:'17:00',tl:row.keterangan==='WFO'?1:0,psw:row.keterangan==='WFO'?2:0,potongan:row.keterangan==='WFO'?1.25:0}))};
  return new Response(JSON.stringify({status:'success',...context,calculation,note:{url:'#mock-note'},spreadsheetId:'test-only',spreadsheetUrl:'#mock-spreadsheet',revision:'test',rows: rows.map(row => ({...row,jamKerja:payload.schedules?.[row.tanggal]||'biasa',keterangan:payload.resolutions?.[row.tanggal] || row.keterangan}))}));
};
function Fixture() {
  const [result,setResult] = useState(null);
  return <main className="bg-slate-50 min-h-screen p-8"><p className="mb-4 text-xs">SIMULASI LOKAL — tidak mengubah Drive.</p>{result ? <FinalRecapSaved result={result} moduleLabel={context.modul==='tukin'?'Tunjangan Kinerja':'Uang Makan'} onBack={() => setResult(null)}/> : <FinalRecap endpoint="/mock-final" context={context} onBack={() => {}} onSaved={setResult}/>}</main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
