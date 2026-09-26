import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { sendClaimRequest } from './archive-claims.js';
import { monthLabel, monthlyView, ratio } from './monthly-recap-model.js';
import { EmployeePhoto } from './employee-photo.jsx';

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
  return <section aria-label="Juara rekap yang dipublikasikan" className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
    <div className="px-5 py-4 text-white font-bold text-sm flex items-center gap-2 bg-[#084C61]"><Trophy size={16}/>PALING DISIPLIN{data?.month ? ` • ${monthLabel(data.month).toUpperCase()}` : ''}</div>
    {leaders.length ? <><p className="px-5 pt-4 text-[11px] text-slate-500">5 teratas Paling Tepat Waktu pada rekap yang ditampilkan.</p><ol className="p-5 space-y-4">{leaders.map((row, index) => <li key={row.nip} className="flex items-center gap-3"><span className="text-xs font-bold text-slate-400 w-4">{index + 1}</span><EmployeePhoto src={row.photo} name={row.nama} className="w-11 h-14 rounded-lg shrink-0"/><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[#084C61]">{row.nama}</p><p className="text-[10px] text-slate-500 mt-1">{row.unit}</p></div><strong className="text-xs text-teal-700">{ratio(row.onTime, row.assessed)}</strong></li>)}</ol></> : <p role="status" className="p-8 text-center text-xs text-slate-500">{error || (!data ? 'Memuat juara rekap…' : !data.published ? 'Belum ada rekap yang dipublikasikan.' : 'Belum ada rekap lengkap yang memenuhi peringkat.')}</p>}
  </section>;
}
