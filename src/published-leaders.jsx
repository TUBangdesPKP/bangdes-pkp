import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { sendClaimRequest } from './archive-claims.js';
import { monthLabel, monthlyView } from './monthly-recap-model.js';
import { EmployeePhoto } from './employee-photo.jsx';
import { subunitBadge, leaderComposition } from './subunit-badge.js';

export function PublishedLeaders({ endpoint }) {
  const [data, setData] = useState(null), [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    sendClaimRequest(endpoint, { action: 'rekap_bulanan_publik' }).then(result => {
      if (result.publicationVersion !== 1 || result.publicView !== true || !Array.isArray(result.employees)) throw Error('Rekap publik belum tersedia.');
      if (!cancelled) setData(result);
    }).catch(() => { if (!cancelled) setError('Rekap terpublikasi belum dapat dimuat.'); });
    return () => { cancelled = true; };
  }, [endpoint]);
  const leaders = data?.published ? monthlyView(data, '', true).punctual : [];
  const composition = leaderComposition(leaders);
  return <section aria-label="Juara rekap yang dipublikasikan" className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
    <div className="px-5 py-4 text-white font-bold text-sm flex items-center gap-2 bg-[#084C61]"><Trophy size={16}/>PALING DISIPLIN{data?.month ? ` • ${monthLabel(data.month).toUpperCase()}` : ''}</div>
    {leaders.length ? <ol className="px-5 py-2 divide-y divide-slate-100">{leaders.map((row, index) => {
      const badge = subunitBadge(row.unit);
      return <li key={row.nip} className="flex items-start gap-3 py-3">
        <div className="relative shrink-0"><EmployeePhoto src={row.photo} name={row.nama} className="w-10 h-12 rounded-lg"/><span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#D5C58A] text-[#243746] text-[9px] font-bold flex items-center justify-center border border-white" aria-label={`Peringkat ${index + 1}`}>{index + 1}</span></div>
        <div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#084C61] break-words">{row.nama}</p><div className="flex items-start justify-between gap-2 mt-1"><p className="text-[10px] leading-relaxed text-slate-500 min-w-0 flex-1 break-words">{row.jabatan || 'Jabatan belum tersedia'}</p><span title={row.unit} className="shrink-0 max-w-[7rem] rounded-full px-2 py-1 text-[9px] leading-tight font-bold text-center break-words" style={{ backgroundColor: badge.background, color: badge.color }}>{badge.label}</span></div></div>
      </li>;
    })}</ol> : <p role="status" className="p-8 text-center text-xs text-slate-500">{error || (!data ? 'Memuat juara rekap…' : !data.published ? 'Belum ada rekap yang dipublikasikan.' : 'Belum ada rekap lengkap yang memenuhi peringkat.')}</p>}
    {composition.length > 0 && <div aria-label="Komposisi SubUnit para juara" className="px-5 pb-5 pt-2 border-t border-slate-100">
      <h3 className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Sebaran paling disiplin per unit</h3>
      <div aria-hidden="true" className="flex h-2 rounded-full overflow-hidden my-3">{composition.map(group => <div key={group.label} style={{ width: `${group.percentage}%`, backgroundColor: group.background }}/>)}</div>
      <ul className="flex flex-wrap gap-x-3 gap-y-2 text-[10px] text-[#084C61]">{composition.map(group => <li key={group.label} className="inline-flex items-center gap-1"><span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ backgroundColor: group.background }}/>{group.label} <strong>{group.percentage.toLocaleString('id-ID', { maximumFractionDigits: 1 })}%</strong><span className="sr-only"> ({group.count} dari {leaders.length} juara)</span></li>)}</ul>
    </div>}
  </section>;
}
