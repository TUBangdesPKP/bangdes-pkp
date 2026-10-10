import { archiveLeaveSummary } from './archive-leave-summary-model.js';

export function ArchiveLeaveSummary({ items }) {
  const { rows, types, invalid } = archiveLeaveSummary(items);
  return <section aria-label="Rekap cuti per pegawai" className="mb-6 bg-white rounded-2xl border p-4 space-y-3">
    <h3 className="font-bold text-[#084C61]">Rekap Cuti per Pegawai</h3>
    <div className="overflow-x-auto"><table className="w-full text-xs text-left">
      <thead className="bg-[#F2EFDF]"><tr><th className="p-3">No</th><th className="p-3">Nama</th><th className="p-3">NIP</th>{types.map(type => <th key={type} className="p-3 text-center">{type}<span className="block font-normal">Hari</span></th>)}<th className="p-3 text-center">Total Hari</th></tr></thead>
      <tbody>{rows.map((row,index) => <tr key={row.nip} className="border-t"><td className="p-3">{index+1}</td><td className="p-3 font-semibold">{row.name}</td><td className="p-3 whitespace-nowrap">{row.nip}</td>{types.map(type => <td key={type} className="p-3 text-center">{row.days[type] || 0}</td>)}<td className="p-3 text-center font-bold">{row.total}</td></tr>)}</tbody>
    </table>{!rows.length && <p className="p-4 text-center text-sm text-slate-500">Belum ada data cuti pada filter ini.</p>}</div>
    {invalid > 0 && <p role="status" className="text-xs text-amber-700">{invalid} data memiliki jumlah hari yang belum valid dan tidak dijumlahkan.</p>}
  </section>;
}
