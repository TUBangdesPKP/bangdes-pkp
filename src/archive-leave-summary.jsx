import { archiveLeaveSummary, personalLeaveItems } from './archive-leave-summary-model.js';

export function ArchiveLeaveSummary({ items, user }) {
  const { rows, types, invalid } = archiveLeaveSummary(personalLeaveItems(items, user));
  const person = rows[0];
  return <section aria-label="Data Cuti Saya" className="mb-6 bg-white rounded-2xl border p-4 space-y-3">
    <h3 className="font-bold text-[#084C61]">Data Cuti Saya</h3>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {types.map(type => <div key={type} className="rounded-xl bg-[#F2EFDF] p-4 text-center"><p className="text-xs">{type}</p><p className="text-xl font-bold mt-2">{person?.days[type] || 0} <span className="text-xs font-normal">hari</span></p></div>)}
      <div className="rounded-xl border p-4 text-center"><p className="text-xs">Total Hari</p><p className="text-xl font-bold mt-2">{person?.total || 0} <span className="text-xs font-normal">hari</span></p></div>
    </div>
    {!person && <p className="text-sm text-slate-500">Belum ada data cuti pribadi.</p>}
    {invalid > 0 && <p role="status" className="text-xs text-amber-700">{invalid} data memiliki jumlah hari yang belum valid dan tidak dijumlahkan.</p>}
  </section>;
}
