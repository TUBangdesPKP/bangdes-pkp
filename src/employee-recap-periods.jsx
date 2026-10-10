import { useEffect, useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { sendClaimRequest } from './archive-claims.js';
import { MONTH_NAMES, submissionPeriodCard, validateEmployeeRecaps } from './submission-period-model.js';
import { YearSelect } from './year-select.jsx';

export function EmployeeRecapCards({ modul, year, months, loading, error, onSelect }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-8">
    {MONTH_NAMES.map((name, index) => {
      const period = submissionPeriodCard(modul, year, index + 1);
      const recap = months?.find(item => item.month === index + 1);
      const amount = loading ? 'Memuat nominal…' : error ? 'Nominal belum tersedia' : recap?.state === 'saved'
        ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(recap.netto)
        : recap?.state === 'incomplete' ? 'Perlu penyesuaian' : recap?.state === 'pending' ? 'Menunggu perhitungan' : 'Belum ada data';
      return <button key={period.id} type="button" onClick={() => onSelect(period)} aria-label={`Lihat rekap ${name} ${year}`}
        className="min-h-44 lg:min-h-48 rounded-[2rem] border border-slate-300 bg-white px-4 py-5 text-center flex flex-col items-center justify-between gap-4 transition hover:border-[#084C61] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#084C61] focus-visible:ring-offset-2">
        <h3 className="text-xl lg:text-2xl font-extrabold text-slate-950">{name.toUpperCase()}</h3>
        <p className={recap?.state === 'saved' && !loading && !error ? 'text-lg lg:text-xl font-bold text-[#084C61]' : 'text-sm text-slate-500'}>{amount}</p>
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500"><Calendar size={13} className="shrink-0"/>{period.periodeLabel}</p>
      </button>;
    })}
  </div>;
}

export function EmployeeRecapPeriods({ endpoint, modul, user, initialPeriod, onSelect }) {
  const [year, setYear] = useState(initialPeriod?.year || new Date().getFullYear());
  const [reload, setReload] = useState(0);
  const [result, setResult] = useState(null);
  const nip = String(user?.NIP || '').replace(/^'/, '').trim();
  const token = user?.sessionToken;
  const key = JSON.stringify([endpoint, modul, year, nip, token, reload]);
  const ready = result?.key === key;
  useEffect(() => {
    let cancelled = false;
    sendClaimRequest(endpoint, { action: 'rekap_pegawai_tahunan', modul, year, nip, sessionToken: token })
      .then(data => {
        const months = validateEmployeeRecaps(data, { modul, year, nip });
        if (!cancelled) setResult({ key, months });
      }).catch(error => { if (!cancelled) setResult({ key, error: error.message }); });
    return () => { cancelled = true; };
  }, [endpoint, modul, year, nip, token, key]);
  return <section className="space-y-7 max-w-7xl mx-auto py-3" aria-label="Rekap pembayaran pegawai">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <h2 className="text-xl lg:text-2xl font-extrabold text-slate-950">Rekap Pembayaran {modul === 'tukin' ? 'Tunjangan Kinerja' : 'Uang Makan'} Pegawai</h2>
      <div className="flex items-center gap-2">
        <YearSelect value={year} onChange={setYear}/>
        <button type="button" aria-label="Muat ulang nominal" title="Muat ulang nominal" onClick={() => setReload(value => value + 1)} className="rounded-xl border bg-white p-2"><RefreshCw size={17}/></button>
      </div>
    </div>
    {ready && result.error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{result.error} Anda tetap dapat membuka setiap bulan untuk melihat rekap.</p>}
    <EmployeeRecapCards modul={modul} year={year} months={ready ? result.months : null} loading={!ready} error={ready && result.error} onSelect={onSelect}/>
  </section>;
}
