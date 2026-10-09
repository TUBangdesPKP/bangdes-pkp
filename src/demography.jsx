import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { analyzeDemography } from './demography-model.js';
import './demography.css';

const COLORS=['#0E5B73','#B9A77E','#70B8C8','#7D9D88','#486979','#B88376','#747DAD'];
const percent=(value,total)=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:1}).format(total?value/total*100:0)+'%';
const color=index=>COLORS[index%COLORS.length];
const describe=rows=>rows.map(row=>`${row.label}: ${row.value} pegawai`).join('; ');

function Card({title,children}) {
  return <section aria-label={title} className="demography-card">
    <h3 className="demography-card-title">{title}</h3>
    <div className="demography-card-chart">{children}</div>
  </section>;
}
function Donut({rows,total}) {
  let offset=0;
  return <div className="demography-donut">
    <svg role="img" aria-label={describe(rows)||'Belum ada data'} viewBox="0 0 200 200" className="demography-donut-ring">
      <circle cx="100" cy="100" r="72" fill="none" stroke="#e2dfd4" strokeWidth="28" />
      {rows.map((row,i)=>{const length=total?row.value/total*100:0,start=offset;offset+=length;return <circle key={row.label} cx="100" cy="100" r="72" fill="none" stroke={color(i)} strokeWidth="28" pathLength="100" strokeDasharray={`${length} ${100-length}`} strokeDashoffset={-start} transform="rotate(-90 100 100)"><title>{`${row.label}: ${row.value} (${percent(row.value,total)})`}</title></circle>;})}
      <text x="100" y="100" textAnchor="middle" fontSize="34" fontWeight="800" fill="#084C61">{total}</text>
      <text x="100" y="122" textAnchor="middle" fontSize="13" fill="#475569">pegawai</text>
    </svg>
    <ul className="demography-legend">{rows.map((row,i)=><li key={row.label}><span className="flex items-center gap-2 min-w-0"><span aria-hidden="true" className="w-3.5 h-3.5 rounded-full shrink-0" style={{background:color(i)}}/>{row.label}</span><span className="whitespace-nowrap"><b>{row.value}</b> <span className="text-slate-600">({percent(row.value,total)})</span></span></li>)}</ul>
  </div>;
}
function Bars({rows,total}) {
  const max=Math.max(1,...rows.map(row=>row.value));
  return <div className="demography-bars" role="img" aria-label={describe(rows)||'Belum ada data'} tabIndex={0}>{rows.map((row,i)=><div key={row.label} className="demography-bar-row">
    <span className="leading-snug break-words font-medium">{row.label}</span><div className="min-w-0"><div className="text-right mb-2"><b>{row.value}</b> <span className="text-slate-600">({percent(row.value,total)})</span></div><div className="demography-bar-track"><div className="h-full rounded-full" style={{width:`${row.value/max*100}%`,background:color(i)}}/></div></div>
  </div>)}</div>;
}
function Columns({rows,total}) {
  const max=Math.max(1,...rows.map(row=>row.value));
  return <div className="demography-columns" role="img" aria-label={describe(rows)||'Belum ada data'} tabIndex={0}>
    <div className="demography-column-plot" style={{minWidth:rows.length*70}}>{rows.map((row,i)=><div key={row.label} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full"><b className="mb-2">{row.value}</b><div className="w-full max-w-20 rounded-t-lg shrink-0" style={{height:`${row.value/max*84}%`,background:color(i)}}/></div>)}</div>
    <div className="demography-column-labels" style={{minWidth:rows.length*70}}>{rows.map(row=><div key={row.label} className="flex-1 min-w-0 text-center break-words"><b>{row.label}</b><div className="text-slate-600 mt-1">{percent(row.value,total)}</div></div>)}</div>
  </div>;
}
function Pyramid({rows}) {
  const max=Math.max(1,...rows.flatMap(row=>[row.male,row.female]));
  return <div className="demography-pyramid">
    <div className="demography-pyramid-row mb-6"><span className="font-bold text-[#0E5B73]">Laki-laki</span><span/><span className="font-bold text-right text-[#856d3c]">Perempuan</span></div>
    <div role="img" aria-label={rows.map(row=>`${row.label}: ${row.male} laki-laki, ${row.female} perempuan, ${row.other} gender belum terklasifikasi`).join('; ')} className="space-y-7">{rows.map(row=><div key={row.label}>
      <div className="demography-pyramid-row">
        <div className="demography-pyramid-side"><b>{row.male}</b><div className="flex justify-end min-w-0"><div className="demography-pyramid-bar rounded-l-md bg-[#0E5B73]" style={{width:`${row.male/max*100}%`}}/></div></div>
        <div className="text-center"><b>{row.label}</b><span className="block text-sm text-slate-600 mt-1">{row.ageRange||'Umur belum diisi'}</span></div>
        <div className="demography-pyramid-side demography-pyramid-side-right"><div className="min-w-0"><div className="demography-pyramid-bar rounded-r-md bg-[#B9A77E]" style={{width:`${row.female/max*100}%`}}/></div><b className="text-right">{row.female}</b></div>
      </div>
      {!!row.other&&<p className="text-center text-sm text-slate-600 mt-2">{row.other} pegawai: gender belum terklasifikasi</p>}
    </div>)}</div>
  </div>;
}

export function DemographyCharts({data}) {
  const model=analyzeDemography(data);
  return <>
    <p className="text-base font-semibold text-[#084C61] mb-5">{model.total} Pegawai</p>
    {!!model.duplicates&&<p role="status" className="text-sm text-amber-800 mb-4">{model.duplicates} baris NIP duplikat tidak dihitung ulang; periksa data master.</p>}
    {!model.total?<p className="p-6 rounded-2xl border bg-white">Belum ada data pegawai untuk ditampilkan.</p>:<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
      <Card title="Status Pegawai"><Donut rows={model.status} total={model.total}/></Card>
      <Card title="Golongan/Ruang Pegawai"><Bars rows={model.grades} total={model.total}/></Card>
      <Card title="Tingkat Pendidikan Terakhir"><Columns rows={model.education} total={model.total}/></Card>
      <Card title="Jenis Kelamin"><Donut rows={model.gender} total={model.total}/></Card>
      <Card title="Jabatan"><Bars rows={model.jobs} total={model.total}/></Card>
      <Card title="Rentang Umur / Generasi"><Pyramid rows={model.pyramid}/></Card>
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
