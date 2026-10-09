// Isolated UI fixture: every fetch is mocked, no production API/Drive mutation.
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { UserDashboardView } from '../src/App.jsx';
import '../src/index.css';
let processed = false;
let saved = null;
const counts = {};
const periodStatuses = new Map();
const closedTest = new URLSearchParams(window.location.search).has('closedSaved');
const storedFixture = p => ({status:'success',nip:p.nip,nama:p.nama,periode:p.periode,spreadsheetId:'mock-closed',spreadsheetUrl:'#mock-sheet',revision:'closed-revision',
  adjustments:{'2026-01-05':{datang:{time:'07:30',fileId:'mock-letter'}}},adjustmentDocuments:[{fileId:'mock-letter',fileName:'Surat Lupa Absen Uji.pdf'}],
  rows:[{tanggal:'2026-01-05',hari:'Senin',datang:'07:30',originalDatang:'-',pulang:'16:00',keteranganAwal:'WFO',keterangan:'WFO',jamKerja:'biasa',libur:false,konflik:false,dokumen:[]}],
  calculation:{modul:p.modul,complete:true,warnings:[],jabatan:'Pegawai Simulasi',sources:{saved:'Hasil tersimpan — simulasi'},days:[],
    totals:{masuk:1,hariKerja:1,dinas:0,cuti:0,tb:0,libur:0,flexi:0,terlambat:0,psw:0,tidakMasuk:0,menitTelat:0,menitPsw:0,menitTanpaPresensi:0,totalMenit:0,potonganAbsensi:0},
    amount:{tarif:37000,skp:100,potonganSkp:0,persenPotongan:0,bruto:37000,potongan:0,netto:37000}}});
let files = [{fileId:'test_copy',fileName:'SPT simulasi.pdf',fileUrl:'#mock',jenisDokumen:'spt',sourceFileId:'test_source',sourceUrl:'#mock'}];
window.fetch = async (_url, options) => {
  const action = options?.body ? JSON.parse(options.body).action : 'archive';
  counts[action] = (counts[action] || 0) + 1;
  window.dispatchEvent(new Event('mock-request'));
  if (!options?.body) return new Response('Timestamp,NIP,Nama\n');
  const p = JSON.parse(options.body);
  if(p.adminReadOnly) {
    if(!['list_pendukung','preview_rekap_final'].includes(p.action))throw Error('Admin review must never mutate data');
    if(!p.sessionToken&&!p.adminSessionToken)throw Error('Admin review requires login session');
    if(!/^19900101202501\d{4}$/.test(p.nip))throw Error('Wrong selected employee');
    if(p.action==='list_pendukung')return Response.json({status:'success',documents:files,requiresTab2:false,processed:true,savedResult:storedFixture(p)});
    return Response.json({...storedFixture(p),savedResult:storedFixture(p)});
  }
  if(closedTest && !['list_periode_submisi','list_submisi_terhitung','list_pendukung','preview_rekap_final'].includes(p.action)) throw Error('Read-only fixture rejected mutation: '+p.action);
  if(closedTest && ['list_pendukung','preview_rekap_final'].includes(p.action)) {
    if(p.nip!=='TEST'||p.nama!=='Pegawai Uji')throw Error('Wrong employee scope');
    const hasResult=p.bulanTahun.includes('Januari');
    if(p.action==='list_pendukung')return Response.json({status:'success',documents:hasResult?files:[],requiresTab2:!hasResult,processed:hasResult,savedResult:hasResult?storedFixture(p):null});
    return Response.json({...storedFixture(p),savedResult:storedFixture(p)});
  }
  if(['list_periode_submisi','set_periode_submisi'].includes(p.action)){
    if(p.action==='set_periode_submisi')periodStatuses.set(`${p.modul}:${p.year}:${p.month}`,p.periodStatus);
    return Response.json({status:'success',periods:Array.from({length:12},(_,i)=>({month:i+1,status:closedTest?'DITUTUP':periodStatuses.get(`${p.modul}:${p.year}:${i+1}`)||(p.year===2026&&i>=6?'DIBUKA':'DITUTUP')}))});
  }
  if (p.action === 'list_pendukung') return Response.json({status:'success',documents:files,processed,requiresTab2:false,savedResult:saved});
  if (p.action === 'list_submisi_terhitung') return Response.json({status:'success',employees:Array.from({length:25},(_,i)=>({nip:`19900101202501${String(i).padStart(4,'0')}`,nama:`Pegawai Simulasi ${i+1}`,jenisAsn:i%2?'PNS':'PPPK',unit:['Subbagian Tata Usaha','Subdirektorat Wilayah I','Subdirektorat Perencanaan Teknis'][i%3]}))});
  if (p.action === 'buat_rekap_submisi') return Response.json({status:'success',files:[{fileId:'mock-pns',jenisAsn:'PNS',url:'#mock-pns'},{fileId:'mock-pppk',jenisAsn:'PPPK',url:'#mock-pppk'}]});
  if (p.action === 'hapus_pendukung') { files = []; processed = false; return Response.json({status:'success',fileId:p.fileId}); }
  if (p.action === 'proses_bukti') {
    processed = true;
    // Simulate a committed write whose redirected response is lost once.
    if (new URLSearchParams(window.location.search).has('lostResponse') && counts.proses_bukti === 1) return new Response('Not found', {status:404});
  }
  if (['proses_bukti','preview_rekap_final','simpan_rekap_final'].includes(p.action)) {
    if (!processed) return Response.json({status:'error',message:'Klik Lanjut Proses'});
    const result={status:'success',...p,spreadsheetId:'mock-sheet',spreadsheetUrl:'#mock-sheet',revision:'mock-revision',
      calculation:{modul:p.modul,complete:true,warnings:[],jabatan:'Pegawai Simulasi',sources:{},days:[],
        totals:{masuk:0,hariKerja:21,dinas:21,cuti:0,tb:0,libur:10,flexi:0,terlambat:0,psw:0,tidakMasuk:0,menitTelat:0,menitPsw:0,menitTanpaPresensi:0,totalMenit:0,potonganAbsensi:0},
        amount:{tarif:6349000,skp:100,potonganSkp:0,persenPotongan:0,bruto:6349000,potongan:0,netto:6349000}},
      rows:Array.from({length:31},(_,i)=>({tanggal:`2026-08-${String(i+1).padStart(2,'0')}`,hari:'Hari uji',datang:'7:30',pulang:'17:00',keteranganAwal:'WFO',keterangan:files.length?'Dinas':'WFO',jamKerja:p.schedules?.[`2026-08-${String(i+1).padStart(2,'0')}`]||'biasa',libur:false,konflik:false,dokumen:files}))};
    if (p.action==='simpan_rekap_final') saved=result;
    return Response.json({...result,savedResult:saved});
  }
  throw Error('Unexpected request in isolated fixture: '+p.action);
};
function Fixture() {
  const [route,setRoute] = useState({view:new URLSearchParams(window.location.search).get('modul')==='uang-makan'?'absensi-uang-makan':'absensi-tunjangan-kinerja',step:1});
  const [requests,setRequests] = useState('{}');
  useEffect(() => { const update=()=>setRequests(JSON.stringify(counts)); window.addEventListener('mock-request',update); return ()=>window.removeEventListener('mock-request',update); },[]);
  const legacy=new URLSearchParams(window.location.search).has('legacyAdmin');
  const admin=legacy||new URLSearchParams(window.location.search).has('admin');
  return <><div className="fixed bottom-0 left-0 z-50 bg-amber-100 text-xs p-2">SIMULASI LOKAL — tanpa akses backend produksi <output aria-label="Jumlah permintaan">{requests}</output></div><UserDashboardView loggedInUser={{NIP:'TEST',Nama:'Pegawai Uji',Akun_Role:admin?'admin':'user',sessionToken:admin&&!legacy?'mock-session':undefined,adminSessionToken:legacy?'mock-admin-session':undefined}} currentView={route.view} activeStep={route.step} navigate={(view,step=1)=>setRoute({view,step})} onLogoutRequest={()=>{}}/></>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
