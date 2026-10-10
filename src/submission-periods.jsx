import { useState } from 'react';
import { Calendar, UploadCloud } from 'lucide-react';
import { isRecapAdmin } from './monthly-recap-model.js';
import { MONTH_NAMES, submissionPeriodCard } from './submission-period-model.js';
import { EmployeeRecapPeriods } from './employee-recap-periods.jsx';

export function SubmissionPeriods(props) {
  return props.adminMode && isRecapAdmin(props.user?.Akun_Role || props.user?.Role)
    ? <AdminSubmissionPeriods {...props}/> : <EmployeeRecapPeriods {...props}/>;
}

export function AdminPeriodCards({ modul, year, onSelect }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-8">
    {MONTH_NAMES.map((name, index) => {
      const period = submissionPeriodCard(modul, year, index + 1, 'DIBUKA');
      return <section key={period.id} className="min-h-44 lg:min-h-48 rounded-[2rem] border border-slate-300 bg-white px-4 py-5 text-center flex flex-col items-center justify-between gap-4">
        <h3 className="text-xl lg:text-2xl font-extrabold text-slate-950">{name.toUpperCase()}</h3>
        <button type="button" aria-label={`Pilih & Lanjut ${name} ${year}`} onClick={() => onSelect(period)} className="flex items-center justify-center gap-2 rounded-2xl bg-[#143E50] px-5 py-3 text-sm font-bold text-white hover:bg-[#084C61] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#084C61]"><UploadCloud size={17}/>Pilih &amp; Lanjut</button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500"><Calendar size={13} className="shrink-0"/>{period.periodeLabel}</p>
      </section>;
    })}
  </div>;
}

function AdminSubmissionPeriods({ modul, onSelect, initialPeriod, onModuleChange }) {
  const [year, setYear] = useState(initialPeriod?.year || new Date().getFullYear());
  const [draftYear, setDraftYear] = useState(String(year));
  return <section className="space-y-7 max-w-7xl mx-auto py-3" aria-label="Pilihan periode admin">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-xl lg:text-2xl font-extrabold text-slate-950">Penghitungan {modul === 'tukin' ? 'Tunjangan Kinerja' : 'Uang Makan'}</h2>
      <form className="flex flex-wrap items-center gap-2" onSubmit={event => { event.preventDefault(); const value = Number(draftYear); if (Number.isInteger(value) && value >= 2000 && value <= 9999) setYear(value); }}>
        <select aria-label="Jenis penghitungan" value={modul} onChange={event => onModuleChange(event.target.value)} className="rounded-xl border bg-white p-2 text-sm"><option value="uang-makan">Uang Makan</option><option value="tukin">Tunjangan Kinerja</option></select>
        <input aria-label="Tahun submisi" className="w-24 rounded-xl border bg-white p-2 text-sm" type="number" min="2000" max="9999" required value={draftYear} onChange={event => setDraftYear(event.target.value)}/>
        <button className="rounded-xl bg-[#084C61] text-white px-3 py-2 text-sm">Tampilkan</button>
      </form>
    </div>
    <AdminPeriodCards modul={modul} year={year} onSelect={onSelect}/>
  </section>;
}
