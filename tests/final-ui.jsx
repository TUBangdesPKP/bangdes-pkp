// Manual UI test fixture. No request reaches Google Drive or the production backend.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import { FinalRecap, FinalRecapSaved } from '../src/final-recap.jsx';
const context = {modul:'tukin',nip:'TEST',nama:'Pegawai Uji',periode:'11-08-2026 s/d 10-09-2026'};
const docs = [{fileId:'spt-copy',fileName:'SPT Uji.pdf',jenisDokumen:'spt'},{fileId:'cuti-copy',fileName:'Cuti Uji.pdf',jenisDokumen:'cuti'}];
const rows = [
  {tanggal:'2026-08-21',hari:'Jumat',datang:'08:10',pulang:'17:00',keteranganAwal:'WFO',keterangan:'',libur:false,konflik:true,dokumen:docs},
  {tanggal:'2026-08-22',hari:'Sabtu',datang:'-',pulang:'-',keteranganAwal:'Libur',keterangan:'Libur',libur:true,konflik:true,dokumen:docs},
  {tanggal:'2026-08-24',hari:'Senin',datang:'08:10',pulang:'17:00',keteranganAwal:'WFO',keterangan:'Dinas',libur:false,konflik:false,dokumen:docs.slice(0,1)},
  {tanggal:'2026-08-25',hari:'Selasa',datang:'08:10',pulang:'17:00',keteranganAwal:'WFO',keterangan:'Cuti',libur:false,konflik:false,dokumen:docs.slice(1)},
];
window.fetch = async (url, options) => {
  if (url !== '/mock-final') throw Error('Network disabled in fixture');
  const payload = JSON.parse(options.body);
  if (payload.action === 'simpan_rekap_final' && (!payload.confirmed || !payload.resolutions['2026-08-21'])) throw Error('Missing confirmation/conflict choice');
  return new Response(JSON.stringify({status:'success',...context,spreadsheetId:'test-only',spreadsheetUrl:'#mock-spreadsheet',revision:'test',rows: rows.map(row => ({...row,keterangan:payload.resolutions?.[row.tanggal] || row.keterangan}))}));
};
function Fixture() {
  const [result,setResult] = useState(null);
  return <main className="bg-slate-50 min-h-screen p-8"><p className="mb-4 text-xs">SIMULASI LOKAL — tidak mengubah Drive.</p>{result ? <FinalRecapSaved result={result} moduleLabel="Tunjangan Kinerja" onBack={() => setResult(null)}/> : <FinalRecap endpoint="/mock-final" context={context} onBack={() => {}} onSaved={setResult}/>}</main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
