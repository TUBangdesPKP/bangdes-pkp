import React, {useEffect, useMemo, useState} from 'react';
import {ChevronDown, Plus, RefreshCw, Trash2} from 'lucide-react';
import {analyzeCompetency, filterCompetency, JP_TARGET, loadCompetencyTraining, canManageCompetency} from './competency-model.js';
import {sendClaimRequest} from './archive-claims.js';
import {CompetencyDialog} from './competency-editor.jsx';

const number = value => value.toLocaleString('id-ID', {maximumFractionDigits: 3});
const inputClass = 'mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0E5B73]';

export function CompetencyTable({employees, year, expanded, onSelect, onDelete}) {
  return <div className="overflow-auto max-h-[65vh] rounded-2xl border border-slate-200 bg-white">
    <table className="w-full text-sm text-left">
      <caption className="sr-only">Pemenuhan {JP_TARGET} JP tahun {year}, urutan mengikuti Data Pegawai</caption>
      <thead className="sticky top-0 z-10 bg-[#F2EEDF] text-[#084C61]"><tr>
        {['No', 'Nama / NIP', 'Subunit Kerja', 'Jumlah JP', 'Keterangan'].map(title => <th scope="col" key={title} className="px-4 py-4 whitespace-nowrap">{title}</th>)}
      </tr></thead>
      <tbody>{employees.length ? employees.map((person, employeeIndex) => <React.Fragment key={person.nip}>
        <tr className="border-t border-slate-100 hover:bg-slate-50">
          <td className="p-4 text-slate-500">{employeeIndex + 1}</td>
          <th scope="row" className="p-4 min-w-[240px] font-normal">
            <button type="button" onClick={() => onSelect(person.nip)} aria-expanded={expanded === person.nip}
              aria-controls={`jp-detail-${person.nip}`} className="flex items-center gap-2 text-[#084C61] font-bold text-left hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0E5B73]">
              {person.name}<ChevronDown size={16} aria-hidden="true" className={`shrink-0 transition-transform ${expanded === person.nip ? 'rotate-180' : ''}`}/>
            </button><span className="block mt-1 text-xs text-slate-500">NIP {person.nip}</span>
          </th>
          <td className="p-4 min-w-[180px]">{person.unit}</td>
          <td className="p-4 whitespace-nowrap"><b className="text-lg text-[#084C61]">{number(person.total)}</b> JP</td>
          <td className="p-4 min-w-[200px]"><span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${person.met ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{person.met ? 'Memenuhi' : 'Belum Memenuhi'}</span>
            <span className="block mt-1 text-xs text-slate-500">{person.met ? `Target ${JP_TARGET} JP tercapai` : `Kurang ${number(JP_TARGET - person.total)} JP`}</span>
            {!!person.pending && <span className="block mt-1 text-xs text-amber-800">{person.pending} pelatihan: JP belum diisi / tidak valid</span>}
          </td>
        </tr>
        <tr hidden={expanded !== person.nip} id={`jp-detail-${person.nip}`}><td colSpan={5} className="p-4 md:p-6 bg-[#F7FAFC] border-t">
          <h3 className="font-bold text-[#084C61] mb-3">Pelatihan {person.name} · {year}</h3>
          {person.courses.length ? <ol className="space-y-2">{person.courses.map((course, index) => <li key={course.id} className="flex justify-between gap-4 rounded-xl border bg-white p-3">
            <span>{index + 1}. {course.title}</span><div className="flex flex-wrap items-center justify-end gap-3"><span className="font-semibold">{course.jp === null ? 'JP belum diisi / tidak valid' : `${number(course.jp)} JP`}</span>
              {onDelete && <button type="button" onClick={() => onDelete(course)} aria-label={`Hapus pelatihan ${course.title} untuk ${person.name}`} className="inline-flex items-center gap-1 text-red-700 rounded-lg border border-red-200 px-2 py-1 hover:bg-red-50"><Trash2 size={14}/>Hapus</button>}
            </div>
          </li>)}</ol> : <p className="text-slate-500">Belum ada catatan pelatihan untuk tahun {year}.</p>}
        </td></tr>
      </React.Fragment>) : <tr><td colSpan={5} className="p-8 text-center text-slate-500">Tidak ada pegawai yang sesuai filter.</td></tr>}</tbody>
    </table>
  </div>;
}

export function CompetencyView({people, training, initialYear = new Date().getFullYear(), onDelete}) {
  const [year, setYear] = useState(initialYear);
  const [unit, setUnit] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);
  const model = useMemo(() => analyzeCompetency(people, training, year), [people, training, year]);
  const employees = filterCompetency(model.employees, {unit, status, search});
  const met = employees.filter(person => person.met).length;
  return <>
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 p-5 rounded-2xl border bg-white my-5">
      <label className="text-xs font-bold">Tahun<select className={inputClass} value={year} onChange={event => {setYear(Number(event.target.value)); setExpanded(null);}}>{[...new Set([initialYear, ...model.years])].sort((a,b) => b-a).map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="text-xs font-bold">Subunit Kerja<select className={inputClass} value={unit} onChange={event => setUnit(event.target.value)}><option value="">Semua subunit kerja</option>{model.units.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="text-xs font-bold">Status Pemenuhan<select className={inputClass} value={status} onChange={event => setStatus(event.target.value)}><option value="">Semua status</option><option value="met">Memenuhi (≥ 20 JP)</option><option value="unmet">Belum Memenuhi (&lt; 20 JP)</option></select></label>
      <label className="text-xs font-bold">Cari Pegawai<input type="search" className={inputClass} value={search} onChange={event => setSearch(event.target.value)} placeholder="Nama atau NIP"/></label>
    </div>
    <div className="grid grid-cols-3 gap-3 mb-5" aria-live="polite">{[['Pegawai ditampilkan', employees.length], ['Memenuhi', met], ['Belum Memenuhi', employees.length - met]].map(([label, value]) => <div key={label} className="rounded-2xl bg-[#F2EEDF] p-4"><b className="block text-2xl text-[#084C61]">{value}</b><span className="text-xs">{label}</span></div>)}</div>
    {!!(model.unmatched.length || model.invalidYear.length || model.duplicates) && <details className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><summary className="cursor-pointer font-semibold">Data yang perlu diperiksa: {model.unmatched.length} pelatihan belum cocok, {model.invalidYear.length} tahun tidak valid, {model.duplicates} NIP master duplikat</summary>
      <p className="mt-2">Catatan berikut tidak masuk perhitungan. Nama harus cocok secara unik; perbedaan tanda baca dan awalan gelar disetarakan, tanpa menebak kemiripan nama.</p>
      <ul className="list-disc pl-5 mt-2">{[...model.unmatched, ...model.invalidYear].map(course => <li key={course.id}>Baris {course.sourceRow}: {course.name || '(Nama kosong)'} — {course.title || '(Pelatihan kosong)'}</li>)}</ul>
    </details>}
    <CompetencyTable employees={employees} year={year} expanded={expanded} onSelect={nip => setExpanded(previous => previous === nip ? null : nip)} onDelete={onDelete}/>
  </>;
}

export function CompetencyPage({loadPeople, loadTraining = loadCompetencyTraining, endpoint, user, onAuthenticated}) {
  const [state, setState] = useState({data: null, loading: true, error: ''});
  const [reload, setReload] = useState(0);
  const [dialog, setDialog] = useState(null), [notice, setNotice] = useState('');
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    let timer;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {controller.abort(); reject(new Error('Waktu pemuatan habis.'));}, 30000);
    });
    const readTraining = async () => {
      if (endpoint) {
        try {
          const result = await sendClaimRequest(endpoint, {action: 'list_pelatihan_jp'}, fetch, {timeoutMs: 15000});
          if (result.jpVersion !== 1 || !Array.isArray(result.training) || !result.revision) throw new Error('Backend JP belum diperbarui.');
          return {training: result.training, revision: result.revision};
        } catch { /* Public CSV remains readable, but never authorizes a stale write. */ }
      }
      return {training: await loadTraining({signal: controller.signal}), revision: ''};
    };
    Promise.race([Promise.all([loadPeople(true), readTraining()]), timeout]).then(([people, snapshot]) => {
      if (people.source === 'empty' || !Array.isArray(people.data) || !people.data.length) throw new Error('Data induk pegawai belum dapat dimuat.');
      if (!cancelled) setState({data: {people: people.data, ...snapshot, source: people.source}, loading: false, error: ''});
    }).catch(() => {
      if (!cancelled) setState(previous => ({...previous, loading: false, error: 'Data pemenuhan JP belum dapat dimuat. Periksa koneksi dan publikasi spreadsheet, lalu klik Muat ulang data. Data gagal dimuat tidak dianggap sebagai 0 JP.'}));
    }).finally(() => clearTimeout(timer));
    return () => {cancelled = true; controller.abort(); clearTimeout(timer);};
  }, [loadPeople, loadTraining, reload, endpoint]);
  const canDelete = canManageCompetency(user) && !!state.data?.revision && !state.loading;
  return <section className="max-w-[1600px] mx-auto p-4 md:p-8 pb-12 text-slate-800" aria-label="Pemenuhan Kompetensi Pegawai">
    <div className="flex flex-wrap justify-between items-center gap-3"><h2 className="text-xl font-extrabold text-[#084C61]">Pemenuhan Kompetensi / JP</h2>
      <div className="flex items-center gap-2">
        <button type="button" disabled={state.loading || !state.data} onClick={() => {setNotice(''); setDialog({});}} className="inline-flex items-center gap-2 rounded-xl bg-[#084C61] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Plus size={16}/>Tambah Data Pelatihan</button>
        <button type="button" aria-label="Muat ulang data" title="Muat ulang data" disabled={state.loading || !!dialog} onClick={() => {setNotice(''); setState(previous => ({...previous, loading: true, error: ''})); setReload(value => value + 1);}} className="inline-flex items-center border rounded-xl bg-white p-2.5 disabled:opacity-50"><RefreshCw size={18}/></button>
      </div>
    </div>
    {state.loading && <p role="status" className="py-5 text-sm">Memuat data pegawai dan pelatihan...</p>}
    {!!state.error && <p role="alert" className="p-4 bg-red-50 text-red-700 rounded-xl mt-4">{state.error}{state.data && ' Tampilan di bawah masih menggunakan hasil pemuatan sebelumnya.'}</p>}
    {state.data?.source === 'cache' && <p role="status" className="p-3 bg-amber-50 text-amber-900 rounded-xl mt-4 text-xs">Data induk pegawai menggunakan cache; urutan dan subunit belum terverifikasi sebagai data terbaru.</p>}
    {state.data && !state.data.revision && <p role="status" className="p-3 bg-amber-50 text-amber-900 rounded-xl mt-4 text-xs">Menampilkan data publik yang mungkin tertunda. Tambah/hapus menunggu koneksi backend JP terbaru; muat ulang setelah deployment Apps Script diperbarui.</p>}
    {notice && <p role="status" className="p-3 bg-emerald-50 text-emerald-900 rounded-xl mt-4 text-sm">{notice}</p>}
    {state.data && <CompetencyView people={state.data.people} training={state.data.training} onDelete={canDelete ? course => {setNotice(''); setDialog({course});} : undefined}/>}
    {dialog && <CompetencyDialog endpoint={endpoint} user={user} people={state.data?.people || []} revision={state.data?.revision} course={dialog.course} onAuthenticated={onAuthenticated} onClose={() => setDialog(null)}
      onSaved={(result, message) => {setState(previous => ({...previous, error: '', data: {...previous.data, training: result.training, revision: result.revision}})); setNotice(message);}}/>}
  </section>;
}
