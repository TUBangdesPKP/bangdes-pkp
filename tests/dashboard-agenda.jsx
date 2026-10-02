// Local fixture: all requests are mocked; no production Calendar, sheet or profile calls.
import { createRoot } from 'react-dom/client';
import { DashboardHome } from '../src/App.jsx';
import { PkpLogo } from '../src/pkp-logo.jsx';
import '../src/index.css';

const units = ['Subbagian Tata Usaha','Subdirektorat Perencanaan Teknis','Subdirektorat Wilayah I','Subdirektorat Wilayah II','Subdirektorat Wilayah III'];
window.fetch = async (_url, options) => {
  const p = JSON.parse(options.body);
  if (p.action === 'rekap_bulanan_publik') return Response.json({status:'success',publicationVersion:1,publicView:true,published:true,wrapVersion:2,month:'2026-08',employees:units.map((unit,i)=>({nip:`simulasi-${i}`,nama:`Pegawai Simulasi ${i+1}`,jabatan:'Penata Kelola Perumahan Ahli Pertama',unit,masuk:20,hariKerja:20,assessed:20,onTime:20,completeMonth:true,flexi:0,flexiMinutes:0})),daily:[],documents:[]});
  if (p.action !== 'agenda_dashboard') throw Error('Unexpected request');
  if (p.date.endsWith('-06')) await new Promise(resolve=>setTimeout(resolve,1500));
  if (p.date.endsWith('-04')) return Response.json({status:'error',message:'Simulasi Calendar tidak tersedia'});
  return Response.json({status:'success',agendaVersion:1,date:p.date,warning:p.date.endsWith('-05') ? 'Agenda Calendar tersedia, tetapi Disposisi dari spreadsheet belum dapat dimuat.' : '',events:p.date.endsWith('-03') ? [] : Array.from({length:8},(_,i)=>({id:`event-${i}`,title:['Rapat Koordinasi Pelaksanaan Program Perumahan Perdesaan','Pembahasan Rencana Kegiatan dan Evaluasi Capaian','Pendampingan Penyusunan Laporan Bulanan'][i%3],time:i===7?'Sepanjang hari':`${String(8+i).padStart(2,'0')}:00 – ${String(10+i).padStart(2,'0')}:00 WIB`,location:'Ruang Rapat Direktorat Pembangunan Perumahan Perdesaan\nDaring melalui Zoom Meeting',disposition:p.date.endsWith('-05')?'':['Kasubdit Rentek\nKasubdit Wilayah I','Kasubbag Tata Usaha','Seluruh pegawai'][i%3],files:i===7?[]:Array.from({length:i===0?3:1},(_,j)=>({name:['Undangan rapat koordinasi.pdf','Bahan pembahasan.pdf','Disposisi Direktur.pdf'][j],url:`https://drive.google.com/file/d/SIMULASI-${i}-${j}/view`}))}))});
};
createRoot(document.getElementById('root')).render(<>
  <header className="border-b bg-[#F2EEDF] px-6 py-4 flex gap-3 items-center"><PkpLogo className="w-9 h-9"/><strong className="text-[#084C61]">Direktorat Pembangunan Perumahan Perdesaan</strong><span className="ml-auto text-xs">SIMULASI LOKAL</span></header>
  <DashboardHome navigate={()=>{}} loggedInUser={null}/>
</>);
