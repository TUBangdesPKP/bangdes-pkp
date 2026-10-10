import { BASE_LEAVE_TYPES } from './leave-recap-model.js';

export function filterArchiveItems(items, { year = 'Semua', month = 'Semua', search = '' } = {}) {
  const query = search.trim().toLowerCase();
  return items.filter(item => (year === 'Semua' || String(item.tahun) === year) &&
    (month === 'Semua' || String(item.bulan).toLowerCase() === month.toLowerCase()) &&
    (!query || `${item.nama} ${item.nip} ${item.tujuan}`.toLowerCase().includes(query)));
}

export function archiveLeaveSummary(items) {
  const people = new Map(), labels = new Map(BASE_LEAVE_TYPES.map(type => [type.toLowerCase(), type]));
  let invalid = 0;
  for (const item of items) {
    const nip = String(item.nip || '').replace(/^'/, '').trim();
    if (!nip) continue;
    if (!people.has(nip)) people.set(nip, { nip, name: item.nama, days: Object.create(null), total: 0 });
    const raw = String(item.tujuan || '').trim().replace(/\s+/g, ' ') || 'Jenis Cuti Lainnya';
    const key = /^(cuti )?(karena )?alasan penting$/i.test(raw) ? 'cuti karena alasan penting' : raw.toLowerCase();
    if (!labels.has(key)) labels.set(key, raw);
    const type = labels.get(key);
    const value = String(item.jumlahHari ?? '').trim().replace(',', '.');
    if (!/^\d+(\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) { invalid++; continue; }
    const person = people.get(nip), days = Number(value);
    person.days[type] = Math.round(((person.days[type] || 0) + days) * 1e9) / 1e9;
    person.total = Math.round((person.total + days) * 1e9) / 1e9;
  }
  return { rows: [...people.values()], types: [...labels.values()], invalid };
}
