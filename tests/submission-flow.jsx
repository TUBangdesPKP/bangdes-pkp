// Isolated UI fixture: every fetch is mocked, no production API/Drive mutation.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { UserDashboardView } from '../src/App.jsx';
import '../src/index.css';
let processed = false;
let files = [{fileId:'test_copy',fileName:'SPT simulasi.pdf',fileUrl:'#mock',jenisDokumen:'spt',sourceFileId:'test_source',sourceUrl:'#mock'}];
window.fetch = async (_url, options) => {
  if (!options?.body) return new Response('Timestamp,NIP,Nama\n');
  const p = JSON.parse(options.body);
  if (p.action === 'list_pendukung') return Response.json({status:'success',documents:files,processed,requiresTab2:false});
  if (p.action === 'hapus_pendukung') { files = []; processed = false; return Response.json({status:'success',fileId:p.fileId}); }
  if (p.action === 'proses_bukti') processed = true;
  if (['proses_bukti','preview_rekap_final','simpan_rekap_final'].includes(p.action)) {
    if (!processed) return Response.json({status:'error',message:'Klik Lanjut Proses'});
    return Response.json({status:'success',...p,spreadsheetId:'mock-sheet',spreadsheetUrl:'#mock-sheet',revision:'mock-revision',
      rows:Array.from({length:31},(_,i)=>({tanggal:`2026-08-${String(i+1).padStart(2,'0')}`,hari:'Hari uji',datang:'08:10',pulang:'17:00',keteranganAwal:'WFO',keterangan:files.length?'Dinas':'WFO',libur:false,konflik:false,dokumen:files}))});
  }
  throw Error('Unexpected request in isolated fixture: '+p.action);
};
function Fixture() {
  const [route,setRoute] = useState({view:'absensi-tunjangan-kinerja',step:1});
  return <><div className="fixed bottom-0 left-0 z-50 bg-amber-100 text-xs p-2">SIMULASI LOKAL — tanpa akses backend produksi</div><UserDashboardView loggedInUser={{NIP:'TEST',Nama:'Pegawai Uji',Role:'user'}} currentView={route.view} activeStep={route.step} navigate={(view,step=1)=>setRoute({view,step})} onLogoutRequest={()=>{}}/></>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
