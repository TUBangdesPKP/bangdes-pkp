import {sendClaimRequest} from './archive-claims.js';

export const BASE_LEAVE_TYPES = ['Cuti Tahunan', 'Cuti Sakit', 'Cuti Karena Alasan Penting'];
const text = value => String(value ?? '').trim();
export async function loadLeaveRecap(endpoint, fetchRequest = fetch) {
  const result = await sendClaimRequest(endpoint, {action: 'rekap_cuti_kepegawaian'}, fetchRequest, {timeoutMs: 25000});
  if (result.leaveRecapVersion !== 1 || !Array.isArray(result.totals) || result.totals.some(row =>
    !/^\d{18}$/.test(row.nip) || typeof row.type !== 'string' || !row.type.trim()
    || !Number.isFinite(row.days) || row.days < 0
    || (row.year !== null && (!Number.isInteger(row.year) || row.year < 1900 || row.year > 2199)))) {
    throw new Error('Data Rekap Cuti belum dapat dibaca. Perbarui deployment Apps Script lalu muat ulang.');
  }
  return {totals: result.totals, warnings: result.warnings || {}};
}

export function leaveRecapModel(people, totals, {year = '', unit = '', search = ''} = {}) {
  const seen = new Set();
  const employees = people.filter(person => {
    const nip = text(person.NIP);
    if (!/^\d{18}$/.test(nip) || !text(person.Nama) || seen.has(nip)) return false;
    seen.add(nip); return true;
  }).map(person => ({nip: text(person.NIP), name: text(person.Nama), unit: text(person.SubUnitKerja) || 'Subunit belum diisi', days: Object.create(null), total: 0}));
  const byNip = new Map(employees.map(person => [person.nip, person]));
  const units = [...new Set(employees.map(person => person.unit))];
  const types = [...BASE_LEAVE_TYPES, ...[...new Set(totals.map(row => row.type))].filter(type => !BASE_LEAVE_TYPES.includes(type)).sort((a,b) => a.localeCompare(b, 'id'))];
  const years = [...new Set(totals.map(row => row.year).filter(value => value !== null))].sort((a,b) => b-a);
  const unmatched = new Set();
  for (const row of totals) {
    if (year && (year === 'unknown' ? row.year !== null : row.year !== Number(year))) continue;
    const person = byNip.get(row.nip);
    if (!person) {unmatched.add(row.nip); continue;}
    person.days[row.type] = Math.round(((person.days[row.type] || 0) + row.days) * 1e9) / 1e9;
    person.total = Math.round((person.total + row.days) * 1e9) / 1e9;
  }
  const query = text(search).toLowerCase();
  const rows = employees.filter(person => (!unit || person.unit === unit) && (!query || `${person.name} ${person.nip}`.toLowerCase().includes(query)));
  return {rows, types, years, units, unmatched: unmatched.size, hasUnknownYear: totals.some(row => row.year === null),
    totalDays: Math.round(rows.reduce((sum, person) => sum + person.total, 0) * 1e9) / 1e9,
    withLeave: rows.filter(person => person.total > 0).length};
}
