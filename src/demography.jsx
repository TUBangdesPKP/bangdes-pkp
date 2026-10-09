import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { analyzeDemography } from './demography-model.js';

const COLORS=['#0E5B73','#B9A77E','#70B8C8','#7D9D88','#486979','#B88376','#747DAD'];
const percent=(value,total)=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:1}).format(total?value/total*100:0)+'%';
const color=index=>COLORS[index%COLORS.length];
const describe=rows=>rows.map(row=>`${row.label}: ${row.value} pegawai`).join('; ');

function Card({title,source,children}) {
  return <section aria-label={title} className="min-w-0 rounded-[2rem] bg-[#F2EEDF] p-5 md:p-7 border border-[#e6dfcb]">
    <h3 className="text-lg font-extrabold text-[#084C61]">{title}</h3>
    <p className="text-xs text-slate-600 mt-1 mb-5">{source}</p>{children}
  </section>;
}
function Donut({rows,total}) {
  let offset=0;
  return <div className="flex flex-col sm:flex-row items-center gap-6 min-h-[240px]">
    <svg role="img" aria-label={describe(rows)||'Belum ada data'} viewBox="0 0 200 200" className="w-48 h-48 shrink-0">
      <circle cx="100" cy="100" r="72" fill="none" stroke="#e2dfd4" strokeWidth="28" />
      {rows.map((row,i)=>{const length=total?row.value/total*100:0,start=offset;offset+=length;return <circle key={row.label} cx="100" cy="100" r="72" fill="none" stroke={color(i)} strokeWidth="28" pathLength="100" strokeDasharray={`${length} ${100-length}`} strokeDashoffset={-start} transform="rotate(-90 100 100)"><title>{row.label}: {row.value} ({percent(row.value,total)})</title></circle>;})}
      <text x="100" y="99" textAnchor="middle" fontSize="30" fontWeight="800" fill="#084C61">{total}</text>
      <text x="100" y="121" textAnchor="middle" fontSize="12" fill="#475569">pegawai</text>
    </svg>
    <ul className="space-y-3 w-full text-sm">{rows.map((row,i)=><li key={row.label} className="flex items-center justify-between gap-3"><span className="flex items-center gap-2"><span aria-hidden="true" className="w-3 h-3 rounded-full shrink-0" style={{background:color(i)}}/>{row.label}</span><span className="whitespace-nowrap"><b>{row.value}</b> <span className="text-xs text-slate-600">({percent(row.value,total)})</span></span></li>)}</ul>
  </div>;
}
function Bars({rows,total}) {
  const max=Math.max(1,...rows.map(row=>row.value));
  return <div className="max-h-[440px] overflow-y-auto pr-2 space-y-3" role="img" aria-label={describe(rows)||'Belum ada data'}>{rows.map((row,i)=><div key={row.label} className="grid grid-cols-[minmax(95px,1fr)_minmax(100px,1.3fr)] items-center gap-3 text-xs">
    <span className="leading-snug break-words">{row.label}</span><div><div className="text-right mb-1"><b>{row.value}</b> <span className="text-slate-600">({percent(row.value,total)})</span></div><div className="h-3 rounded-full bg-white/70"><div className="h-full rounded-full" style={{width:`${row.value/max*100}%`,background:color(i)}}/></div></div>
  </div>)}</div>;
}
function Columns({rows,total}) {
  const max=Math.max(1,...rows.map(row=>row.value));
  return <div className="overflow-x-auto" role="img" aria-label={describe(rows)||'Belum ada data'}>
    <p className="text-[11px] text-slate-600 mb-3">Jumlah pegawai · skala 0–{max}</p>
    <div className="flex gap-4 border-b border-slate-400 items-end h-[210px] px-3" style={{minWidth:rows.length*65}}>{rows.map((row,i)=><div key={row.label} className="flex-1 flex flex-col items-center justify-end h-full"><b className="text-xs mb-1">{row.value}</b><div className="w-full max-w-14 rounded-t-lg" style={{height:`${row.value/max*175}px`,background:color(i)}}/></div>)}</div>
    <div className="flex gap-4 px-3 pt-2" style={{minWidth:rows.length*65}}>{rows.map(row=><div key={row.label} className="flex-1 text-center text-xs"><b>{row.label}</b><div className="text-slate-600 mt-1">{percent(row.value,total)}</div></div>)}</div>
  </div>;
}
function Pyramid({rows}) {
  const max=Math.max(1,...rows.flatMap(row=>[row.male,row.female]));
  return <div>
    <div className="grid grid-cols-[1fr_88px_1fr] text-xs mb-4"><span className="font-bold text-[#0E5B73]">Laki-laki</span><span/><span className="font-bold text-right text-[#856d3c]">Perempuan</span></div>
    <div role="img" aria-label={rows.map(row=>`${row.label}: ${row.male} laki-laki, ${row.female} perempuan, ${row.other} gender belum terklasifikasi`).join('; ')} className="space-y-5">{rows.map(row=><div key={row.label}>
      <div className="grid grid-cols-[1fr_88px_1fr] items-center gap-2">
        <div className="flex justify-end items-center gap-1"><b className="text-xs">{row.male}</b><div className="h-6 rounded-l-md bg-[#0E5B73]" style={{width:`${row.male/max*80}%`}}/></div>
        <div className="text-center text-xs"><b>{row.label}</b><span className="block text-[10px] text-slate-600">{row.ageRange||'Umur belum diisi'}</span></div>
        <div className="flex items-center gap-1"><div className="h-6 rounded-r-md bg-[#B9A77E]" style={{width:`${row.female/max*80}%`}}/><b className="text-xs">{row.female}</b></div>
      </div>
      {!!row.other&&<p className="text-center text-[10px] text-slate-600 mt-1">{row.other} pegawai: gender belum terklasifikasi</p>}
    </div>)}</div>
    <p className="text-[11px] text-slate-600 mt-5 leading-relaxed">Kedua sisi memakai skala yang sama (0–{max} pegawai). Generasi mengikuti kolom AS; rentang umur adalah nilai minimum–maksimum yang terisi di kolom AI, bukan batas definisi generasi.</p>
  </div>;
}

export function DemographyCharts({data}) {
  const model=analyzeDemography(data);
  return <>
    <p className="text-sm text-[#084C61] mb-5"><b>{model.total} pegawai</b> dalam Data_Pegawai. Persentase memakai seluruh pegawai, termasuk kategori belum diisi.</p>
    {!!model.duplicates&&<p role="status" className="text-sm text-amber-800 mb-4">{model.duplicates} baris NIP duplikat tidak dihitung ulang; periksa data master.</p>}
    {!model.total?<p className="p-6 rounded-2xl border bg-white">Belum ada data pegawai untuk ditampilkan.</p>:<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
      <Card title="Status Pegawai" source="Jenis ASN · kolom H"><Donut rows={model.status} total={model.total}/></Card>
      <Card title="Golongan/Ruang Pegawai" source="Golongan/Ruang · kolom J"><Bars rows={model.grades} total={model.total}/></Card>
      <Card title="Tingkat Pendidikan Terakhir" source="Pendidikan Terakhir · kolom Z"><Columns rows={model.education} total={model.total}/></Card>
      <Card title="Jenis Kelamin" source="Gender · kolom G"><Donut rows={model.gender} total={model.total}/></Card>
      <Card title="Jabatan" source="Jabatan lengkap · kolom M · gulir untuk seluruh jabatan"><Bars rows={model.jobs} total={model.total}/></Card>
      <Card title="Rentang Umur / Generasi" source="Piramida generasi menurut jenis kelamin"><Pyramid rows={model.pyramid}/></Card>
    </div>}
  </>;
}

export function DemographyPage({loadPeople}) {
  const [state,setState]=useState({data:null,loading:true,error:'',source:''});
  const [reload,setReload]=useState(0);
  useEffect(()=>{
    let cancelled=false;
    setState(previous=>({...previous,loading:true,error:''}));
    loadPeople(true).then(result=>{
      if(result.source==='empty'||!Array.isArray(result.data))throw new Error('Data spreadsheet belum dapat dimuat. Silakan coba lagi.');
      if(!cancelled)setState({data:result.data,loading:false,error:'',source:result.source});
    }).catch(error=>{if(!cancelled)setState(previous=>({...previous,loading:false,error:error.message}));});
    return ()=>{cancelled=true;};
  },[loadPeople,reload]);
  return <div className="max-w-[1600px] mx-auto p-4 md:p-8 pb-12 text-slate-800">
    <div className="flex justify-between items-center gap-3 mb-3"><h2 className="text-xl font-extrabold text-[#084C61]">Demografi Pegawai</h2><button disabled={state.loading} onClick={()=>setReload(value=>value+1)} className="inline-flex gap-2 items-center text-xs border rounded-xl bg-white px-3 py-2 disabled:opacity-50"><RefreshCw size={15}/>Muat ulang data</button></div>
    {state.loading&&<p role="status" className="py-5 text-sm">Memuat data demografi...</p>}
    {state.error&&<p role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl mb-4">{state.error}</p>}
    {state.source==='cache'&&<p role="status" className="p-3 bg-amber-50 text-amber-900 rounded-xl mb-4 text-xs">Menampilkan data cache; belum terverifikasi sebagai data terbaru. Gunakan Muat ulang data saat koneksi tersedia.</p>}
    {state.data&&<DemographyCharts data={state.data}/>}
  </div>;
}
