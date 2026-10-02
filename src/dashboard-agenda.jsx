import { useEffect, useState } from 'react';
import { CalendarDays, Download, RefreshCw } from 'lucide-react';
import { sendClaimRequest } from './archive-claims.js';
import { agendaDateLabel, agendaFileUrl, agendaLocationParts, agendaToday } from './dashboard-agenda-model.js';

export function DashboardAgenda({ endpoint }) {
  const [date, setDate] = useState(() => agendaToday());
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const key = `${date}:${revision}`;
  const loading = result?.key !== key;
  const data = !loading ? result?.data : null;
  const error = !loading ? result?.error : '';

  useEffect(() => {
    let cancelled = false;
    sendClaimRequest(endpoint, { action: 'agenda_dashboard', date }).then(data => {
      if (data.agendaVersion !== 1 || data.date !== date || !Array.isArray(data.events)) throw new Error('Format agenda belum tersedia.');
      if (!cancelled) setResult({ key, data });
    }).catch(() => {
      if (!cancelled) setResult({ key, error: 'Agenda belum dapat dimuat. Coba muat ulang; bila tetap gagal, hubungi admin untuk memeriksa koneksi Calendar.' });
    });
    return () => { cancelled = true; };
  }, [endpoint, date, key]);

  return <section aria-label="Agenda kegiatan" className="rounded-2xl border border-[#0E5B73]/40 bg-white p-2 md:p-3 shadow-sm min-w-0">
    <h2 className="flex items-center justify-center gap-2 rounded-xl bg-[#0E5B73] px-4 py-4 text-center text-base md:text-lg font-bold text-white">
      <CalendarDays size={20} className="shrink-0"/> Agenda {agendaDateLabel(date)}
    </h2>
    <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3">
      <p role="status" className="text-xs text-slate-500">{loading ? 'Memuat agenda…' : data ? `${data.events.length} agenda • Waktu Indonesia Barat` : 'Agenda tidak tersedia'}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="sr-only" htmlFor="agenda-date">Tanggal agenda</label>
        <input id="agenda-date" type="date" min="1900-01-01" max="9999-12-31" value={date} onChange={event => { if (/^\d{4}-\d{2}-\d{2}$/.test(event.target.value)) setDate(event.target.value); }} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-[#084C61]"/>
        <button type="button" onClick={() => setDate(agendaToday())} className="rounded-lg border border-slate-200 px-3 py-2 text-[#084C61] hover:bg-slate-50">Hari ini</button>
        <button type="button" aria-label="Muat ulang agenda" title="Muat ulang agenda" disabled={loading} onClick={() => setRevision(value => value + 1)} className="rounded-lg border border-slate-200 p-2 text-[#084C61] hover:bg-slate-50 disabled:opacity-40"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/></button>
      </div>
    </div>
    {error ? <p role="alert" className="rounded-lg bg-rose-50 p-5 text-sm text-rose-700">{error}</p> : <>
      {data?.warning && <p role="status" className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">{data.warning}</p>}
      <div role="region" aria-label="Daftar agenda, dapat digulir" tabIndex={0} className="max-h-[520px] overflow-auto rounded-lg border border-[#0E5B73]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0E5B73]">
        <table className="w-full min-w-[780px] table-fixed border-separate border-spacing-0 text-sm text-slate-700">
          <colgroup><col className="w-[5%]"/><col className="w-[13%]"/><col className="w-[29%]"/><col className="w-[23%]"/><col className="w-[16%]"/><col className="w-[14%]"/></colgroup>
          <thead className="sticky top-0 z-10"><tr>{['No', 'Waktu', 'Uraian Kegiatan', 'Lokasi', 'Disposisi', 'Link Undangan'].map(label => <th key={label} scope="col" className="border-b border-r last:border-r-0 border-[#0E5B73]/20 bg-[#F2EEDF] px-2 py-3 text-center text-xs font-bold text-[#183D4C]">{label}</th>)}</tr></thead>
          <tbody>{data?.events.map((event, index) => {
            const files = (event.files || []).map(file => ({ ...file, url: agendaFileUrl(file.url) })).filter(file => file.url);
            const cell = 'border-b border-r border-[#0E5B73]/20 px-3 py-4 align-top break-words whitespace-pre-line';
            return <tr key={event.id} className="last:[&>td]:border-b-0 even:bg-slate-50/60">
              <td className={`${cell} text-center text-slate-400`}>{index + 1}</td>
              <td className={`${cell} text-xs font-semibold text-[#084C61]`}>{event.time}</td>
              <td className={`${cell} font-semibold text-[#183D4C]`}>{event.title}</td>
              <td className={`${cell} text-xs leading-relaxed`}>{agendaLocationParts(event.location || 'Belum tersedia').map((part, partIndex) => part.href ? <a key={partIndex} href={part.href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline underline-offset-2 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 break-words">{part.text}</a> : part.text)}</td>
              <td className={`${cell} text-xs leading-relaxed`}>{event.disposition || 'Belum tersedia'}</td>
              <td className={`${cell} border-r-0 !px-2`}>
                {files.length ? <ul className="space-y-2">{files.map((file, fileIndex) => <li key={file.url}><a href={file.url} target="_blank" rel="noopener noreferrer" title={file.name} aria-label={`Buka ${file.name}`} className="flex items-start gap-1.5 rounded-lg border border-[#D5C58A]/60 bg-white px-2 py-2 text-[11px] font-semibold text-[#084C61] hover:bg-[#F2EEDF] focus-visible:outline focus-visible:outline-2">
                  <Download size={14} className="shrink-0 mt-0.5"/><span className="whitespace-normal">Download File{files.length > 1 ? ` ${fileIndex + 1}` : ''}</span>
                </a></li>)}</ul> : <span className="text-xs text-slate-400">Tidak ada lampiran</span>}
              </td>
            </tr>;
          })}
          {(loading || !data?.events.length) && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">{loading ? 'Mengambil agenda dari Google Calendar…' : 'Tidak ada agenda pada tanggal ini.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </>}
  </section>;
}
