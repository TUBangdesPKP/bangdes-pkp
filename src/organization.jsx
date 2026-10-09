import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { organizationModel } from './organization-model.js';
import './organization.css';

function Person({person, leader=false}) {
  return <div className="organization-person">
    <p className="organization-name">{person.name}</p>
    <p className="organization-nip">NIP {person.nip}</p>
    {leader && person.grade && <p className="organization-grade">{person.grade}</p>}
    {!leader && person.job && <p className="organization-job">{person.job}</p>}
  </div>;
}

function Unit({unit}) {
  const functional = unit.id === 'fungsional';
  return <section className={`organization-unit organization-unit-${unit.id}`} aria-label={unit.title}>
    {!functional && <div className="organization-box organization-leader">
      <h3 className="organization-box-title">{unit.id === 'tu' ? 'Kepala Subbagian Tata Usaha' : `Kepala ${unit.title}`}</h3>
      <div className="organization-leader-body">{unit.leaders.length ? unit.leaders.map(person => <Person key={person.nip} person={person} leader/>) : <p className="organization-empty">Data pimpinan belum tersedia</p>}</div>
    </div>}
    <div className="organization-box organization-staff">
      <h3 className="organization-box-title">{functional ? unit.title : 'Staf'}</h3>
      {unit.staff.length ? <ol>{unit.staff.map(person => <li key={person.nip}><Person person={person}/></li>)}</ol> : <p className="organization-empty">Belum ada data staf</p>}
    </div>
  </section>;
}

export function OrganizationChart({people}) {
  const model = organizationModel(people);
  if (!model.total) return <p role="status" className="rounded-xl border bg-white p-6">Belum ada data pegawai untuk ditampilkan.</p>;
  return <>
    <div role="region" aria-label="Bagan struktur unit kerja, dapat digulir" tabIndex={0} className="organization-scroll">
      <div className="organization-chart">
        <section className="organization-box organization-director" aria-label="Direktur">
          <h3 className="organization-box-title">Direktur Pembangunan Perumahan Perdesaan</h3>
          <div className="organization-leader-body">{model.directors.length ? model.directors.map(person => <Person key={person.nip} person={person} leader/>) : <p className="organization-empty">Data direktur belum tersedia</p>}</div>
        </section>
        <div className="organization-branches">
          {model.units.filter(unit => unit.id !== 'tu').map(unit => <Unit key={unit.id} unit={unit}/>)}
        </div>
        <div className="organization-administration"><Unit unit={model.units.find(unit => unit.id === 'tu')}/></div>
      </div>
    </div>
    {!!model.unassigned.length && <section className="mt-6 rounded-xl border bg-white p-5" aria-label="Unit belum terpetakan"><h3 className="font-bold mb-3">Unit belum terpetakan</h3><ul className="grid gap-3 md:grid-cols-3">{model.unassigned.map(person => <li key={person.nip}><Person person={person}/></li>)}</ul></section>}
    {!!model.duplicates && <p role="status" className="mt-3 text-sm text-amber-800">{model.duplicates} NIP duplikat ditampilkan satu kali.</p>}
  </>;
}

export function OrganizationPage({loadPeople}) {
  const [state,setState] = useState({data:null,revision:null,error:'',source:''});
  const [revision,setRevision] = useState(0);
  const loading = state.revision !== revision;
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) { cancelled=true; setState(previous => ({...previous,revision,error:'Data struktur belum dapat dimuat. Silakan muat ulang.'})); } },30000);
    Promise.resolve().then(() => loadPeople(true)).then(result => {
      if (result.source === 'empty' || !Array.isArray(result.data)) throw new Error('Data struktur belum dapat dimuat. Silakan muat ulang.');
      if (!cancelled) setState({data:result.data,revision,error:'',source:result.source});
    }).catch(() => { if (!cancelled) setState(previous => ({...previous,revision,error:'Data struktur belum dapat dimuat. Silakan muat ulang.'})); }).finally(() => clearTimeout(timer));
    return () => { cancelled=true; clearTimeout(timer); };
  },[loadPeople,revision]);
  return <div className="p-4 md:p-8 text-slate-800">
    <div className="flex justify-between items-center gap-3 mb-5"><h2 className="text-xl font-extrabold text-[#084C61]">Struktur Unit Kerja</h2><button type="button" title="Muat ulang struktur" aria-label="Muat ulang struktur" disabled={loading} onClick={() => setRevision(value => value+1)} className="rounded-xl border bg-white p-2.5 disabled:opacity-50"><RefreshCw size={17} className={loading ? 'animate-spin' : ''}/></button></div>
    {loading && <p role="status" className="py-5">Memuat struktur unit kerja…</p>}
    {!loading && state.error && <p role="alert" className="rounded-xl bg-red-50 text-red-700 p-4 mb-4">{state.error}</p>}
    {state.source === 'cache' && <p role="status" className="rounded-xl bg-amber-50 text-amber-900 p-3 mb-4 text-sm">Menampilkan data tersimpan. Muat ulang saat koneksi tersedia.</p>}
    {state.data && <OrganizationChart people={state.data}/>}
  </div>;
}
