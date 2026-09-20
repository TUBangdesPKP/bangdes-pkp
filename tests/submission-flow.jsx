// Isolated UI fixture: every fetch is mocked, no production API/Drive mutation.
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { UserDashboardView } from '../src/App.jsx';
import '../src/index.css';
let processed = false;
const counts = {};
let files = [{fileId:'test_copy',fileName:'SPT simulasi.pdf',fileUrl:'#mock',jenisDokumen:'spt',sourceFileId:'test_source',sourceUrl:'#mock'}];
window.fetch = async (_url, options) => {
  const action = options?.body ? JSON.parse(options.body).action : 'archive';
  counts[action] = (counts[action] || 0) + 1;
  window.dispatchEvent(new Event('mock-request'));
  if (!options?.body) return new Response('Timestamp,NIP,Nama\n');
  const p = JSON.parse(options.body);
  if (p.action === 'list_pendukung') return Response.json({status:'success',documents:files,processed,requiresTab2:false});
  if (p.action === 'hapus_pendukung') { files = []; processed = false; return Response.json({status:'success',fileId:p.fileId}); }
  if (p.action === 'proses_bukti') {
    processed = true;
    // Simulate a committed write whose redirected response is lost once.
    if (new URLSearchParams(window.location.search).has('lostResponse') && counts.proses_bukti === 1) return new Response('Not found', {status:404});
  }
  if (['proses_bukti','preview_rekap_final','simpan_rekap_final'].includes(p.action)) {
    if (!processed) return Response.json({status:'error',message:'Klik Lanjut Proses'});
    return Response.json({status:'success',...p,spreadsheetId:'mock-sheet',spreadsheetUrl:'#mock-sheet',revision:'mock-revision',
      calculation:{modul:p.modul,complete:true,warnings:[],jabatan:'Pegawai Simulasi',sources:{},days:[],
        totals:{masuk:0,hariKerja:21,dinas:21,cuti:0,tb:0,libur:10,flexi:0,terlambat:0,psw:0,tidakMasuk:0,menitTelat:0,menitPsw:0,menitTanpaPresensi:0,totalMenit:0,potonganAbsensi:0},
        amount:{tarif:6349000,skp:100,potonganSkp:0,persenPotongan:0,bruto:6349000,potongan:0,netto:6349000}},
      rows:Array.from({length:31},(_,i)=>({tanggal:`2026-08-${String(i+1).padStart(2,'0')}`,hari:'Hari uji',datang:'08:10',pulang:'17:00',keteranganAwal:'WFO',keterangan:files.length?'Dinas':'WFO',jamKerja:p.schedules?.[`2026-08-${String(i+1).padStart(2,'0')}`]||'biasa',libur:false,konflik:false,dokumen:files}))});
  }
  throw Error('Unexpected request in isolated fixture: '+p.action);
};
function Fixture() {
  const [route,setRoute] = useState({view:'absensi-tunjangan-kinerja',step:1});
  const [requests,setRequests] = useState('{}');
  useEffect(() => { const update=()=>setRequests(JSON.stringify(counts)); window.addEventListener('mock-request',update); return ()=>window.removeEventListener('mock-request',update); },[]);
  return <><div className="fixed bottom-0 left-0 z-50 bg-amber-100 text-xs p-2">SIMULASI LOKAL — tanpa akses backend produksi <output aria-label="Jumlah permintaan">{requests}</output></div><UserDashboardView loggedInUser={{NIP:'TEST',Nama:'Pegawai Uji',Role:'user'}} currentView={route.view} activeStep={route.step} navigate={(view,step=1)=>setRoute({view,step})} onLogoutRequest={()=>{}}/></>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
