import {useEffect, useMemo, useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {leaveRecapModel, loadLeaveRecap} from './leave-recap-model.js';

const number = value => value.toLocaleString('id-ID', {maximumFractionDigits: 3});
const inputClass = 'mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E5B73]';

export function LeaveRecapTable({model}) {
  return <div className="overflow-auto max-h-[65vh] rounded-2xl border border-slate-200 bg-white" tabIndex={0} aria-label="Tabel Rekap Cuti">
    <table className="w-full text-sm text-left">
      <caption className="sr-only">Jumlah hari cuti per pegawai dan jenis cuti</caption>
      <thead className="sticky top-0 z-10 bg-[#F2EEDF] text-[#084C61]"><tr>
        <th scope="col" className="p-4">No</th><th scope="col" className="p-4 min-w-[250px]">Nama / NIP</th>
        <th scope="col" className="p-4 min-w-[180px]">Subunit Kerja</th>
        {model.types.map(type => <th key={type} scope="col" className="p-4 text-center min-w-[135px]"><span className="block">{type}</span><span className="block mt-1 font-normal">Hari</span></th>)}
        <th scope="col" className="p-4 text-center whitespace-nowrap">Total Hari</th>
      </tr></thead>
      <tbody>{model.rows.length ? model.rows.map((person, index) => <tr key={person.nip} className="border-t border-slate-100 hover:bg-slate-50">
        <td className="p-4 text-slate-500">{index + 1}</td>
        <th scope="row" className="p-4"><span className="block font-bold text-[#084C61]">{person.name}</span><span className="block mt-1 text-xs font-normal text-slate-500">NIP {person.nip}</span></th>
        <td className="p-4">{person.unit}</td>
        {model.types.map(type => <td key={type} className={`p-4 text-center tabular-nums ${person.days[type] ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>{number(person.days[type] || 0)}</td>)}
        <td className="p-4 text-center text-lg font-bold text-[#084C61] tabular-nums">{number(person.total)}</td>
      </tr>) : <tr><td colSpan={model.types.length + 4} className="p-8 text-center text-slate-500">Tidak ada pegawai yang sesuai filter.</td></tr>}</tbody>
    </table>
  </div>;
}

export function LeaveRecapView({people, totals}) {
  const [year, setYear] = useState(''), [unit, setUnit] = useState(''), [search, setSearch] = useState('');
  const model = useMemo(() => leaveRecapModel(people, totals, {year, unit, search}), [people, totals, year, unit, search]);
  const currentYear = new Date().getFullYear();
  return <>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-2xl border bg-white my-5">
      <label className="text-xs font-bold">Tahun<select value={year} onChange={event => setYear(event.target.value)} className={inputClass}><option value="">Semua tahun</option>{[...new Set([currentYear, ...model.years])].sort((a,b) => b-a).map(value => <option key={value} value={value}>{value}</option>)}{model.hasUnknownYear && <option value="unknown">Tahun belum diisi</option>}</select></label>
      <label className="text-xs font-bold">Subunit Kerja<select value={unit} onChange={event => setUnit(event.target.value)} className={inputClass}><option value="">Semua subunit kerja</option>{model.units.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="text-xs font-bold">Cari Pegawai<input type="search" value={search} onChange={event => setSearch(event.target.value)} className={inputClass} placeholder="Nama atau NIP"/></label>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5" aria-live="polite">{[['Pegawai ditampilkan', model.rows.length], ['Pegawai dengan cuti', model.withLeave], ['Total hari cuti', model.totalDays]].map(([label, value]) => <div key={label} className="rounded-2xl bg-[#F2EEDF] p-4"><b className="block text-2xl text-[#084C61]">{number(value)}</b><span className="text-sm">{label}</span></div>)}</div>
    {!!model.unmatched && <p role="status" className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{model.unmatched} NIP pada rekap cuti belum cocok dengan Data Pegawai.</p>}
    <LeaveRecapTable model={model}/>
  </>;
}

export function LeaveRecapPage({endpoint, loadPeople, loadRecap = loadLeaveRecap}) {
  const [state, setState] = useState({data: null, loading: true, error: ''});
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false, timer;
    const timeout = new Promise((_, reject) => {timer = setTimeout(() => reject(new Error('Pemuatan Rekap Cuti terlalu lama. Silakan muat ulang.')), 30000);});
    Promise.race([Promise.all([loadPeople(true), loadRecap(endpoint)]), timeout]).then(([people, recap]) => {
      if (people.source === 'empty' || !Array.isArray(people.data) || !people.data.length) throw new Error('Data Pegawai belum dapat dimuat.');
      if (!cancelled) setState({loading: false, error: '', data: {people: people.data, source: people.source, ...recap}});
    }).catch(error => {if (!cancelled) setState(previous => ({...previous, loading: false, error: error.message}));})
      .finally(() => clearTimeout(timer));
    return () => {cancelled = true; clearTimeout(timer);};
  }, [endpoint, loadPeople, loadRecap, reload]);
  return <section aria-label="Rekap Cuti Pegawai" className="max-w-[1600px] mx-auto p-4 md:p-8 pb-12 text-slate-800">
    <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-extrabold text-[#084C61]">Rekap Cuti</h2><button type="button" disabled={state.loading} aria-label="Muat ulang rekap cuti" title="Muat ulang rekap cuti" onClick={() => {setState(previous => ({...previous, loading: true, error: ''})); setReload(value => value + 1);}} className="border rounded-xl bg-white p-2.5 disabled:opacity-50"><RefreshCw size={18}/></button></div>
    {state.loading && <p role="status" className="py-5 text-sm">Memuat rekap cuti...</p>}
    {state.error && <p role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl mt-4">{state.error}{state.data ? ' Tampilan masih menggunakan hasil sebelumnya.' : ' Pastikan backend terbaru sudah di-deploy.'}</p>}
    {state.data?.source === 'cache' && <p role="status" className="p-3 bg-amber-50 text-amber-900 rounded-xl mt-4 text-sm">Data Pegawai memakai cache dan belum terverifikasi sebagai data terbaru.</p>}
    {!!state.data?.warnings?.invalidRows && <p role="status" className="p-3 bg-amber-50 text-amber-900 rounded-xl mt-4 text-sm">{state.data.warnings.invalidRows} baris cuti belum dihitung karena NIP atau jumlah hari tidak valid.</p>}
    {!!state.data?.warnings?.missingYears && <p role="status" className="p-3 bg-amber-50 text-amber-900 rounded-xl mt-4 text-sm">{state.data.warnings.missingYears} baris cuti belum memiliki tahun valid. Tersedia pada filter Semua tahun atau Tahun belum diisi.</p>}
    {state.data && <LeaveRecapView people={state.data.people} totals={state.data.totals}/>}
  </section>;
}
