// Local-only integration fixture: actual home card/router, no production requests.
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App.jsx';
import '../src/index.css';
const calls=[];
window.fetch=async (_url,options)=>{
  if(!options?.body) { calls.push('GET daftar pegawai');window.dispatchEvent(new Event('public-test-request'));return Response.json(String(_url).includes('allorigins') ? {contents:'[]'} : []); }
  const p=JSON.parse(options.body);calls.push(p.action);window.dispatchEvent(new Event('public-test-request'));
  if(p.action!=='rekap_bulanan_publik') throw Error('Unexpected action in public page: '+p.action);
  return Response.json({status:'success',publicView:true,wrapVersion:2,month:'2026-08',months:['2026-08'],coverage:{submitted:1,available:1},updatedAt:new Date().toISOString(),employees:[{nip:'public-0',nama:'Pegawai Simulasi',unit:'SubUnit Simulasi',masuk:5,hariKerja:5,dinas:0,cuti:0,tb:0,terlambat:0,psw:0,lupaAbsen:0,adjusted:0,unadjusted:0,assessed:5,clean:5,onTime:5,avgArrival:445,flexi:0,flexiMinutes:0,completeMonth:true}],daily:[{unit:'SubUnit Simulasi',tanggal:'2026-08-03',status:'WFO',libur:false,hadir:true,arrival:445,count:5}],documents:[]});
};
export function Fixture(){
  const [requests,setRequests]=useState('[]');
  useEffect(()=>{const update=()=>setRequests(JSON.stringify(calls));window.addEventListener('public-test-request',update);return()=>window.removeEventListener('public-test-request',update);},[]);
  return <><App/><output aria-label="Permintaan simulasi" className="fixed bottom-0 bg-amber-100 p-2 text-xs z-50">SIMULASI LOKAL {requests}</output></>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
