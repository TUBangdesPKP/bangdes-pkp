export function YearSelect({ value, onChange, label = 'Tahun rekap' }) {
  const lastYear = Math.max(new Date().getFullYear() + 10, Number(value));
  const firstYear = Math.min(2000, Number(value));
  return <label className="inline-flex items-center gap-3 text-sm text-slate-600 whitespace-nowrap">
    <span>Pilih Tahun</span>
    <select aria-label={label} value={value} onChange={event => onChange(Number(event.target.value))}
      className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center text-[#084C61] cursor-pointer" style={{ textAlignLast: 'center' }}>
      {Array.from({ length: lastYear - firstYear + 1 }, (_, index) => lastYear - index).map(year => <option key={year} value={year}>{year}</option>)}
    </select>
  </label>;
}
