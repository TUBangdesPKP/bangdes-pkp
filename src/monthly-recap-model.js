export const monthLabel = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')
  ? new Date(`${value}-15T12:00:00Z`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : 'Bulanan';
export const ratio = (a, b) => b ? `${(100 * a / b).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%` : '—';
export const clock = value => value == null ? '—' : `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(Math.round(value % 60)).padStart(2, '0')}`;
export const total = (rows, key) => rows.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
export const occurrences = rows => rows.reduce((sum, row) => sum + (row.count ?? 1), 0);
export const isRecapAdmin = role => ['admin', 'superadmin', 'administrator', 'superadministrator'].includes(String(role || '').toLowerCase().replace(/[\s_-]/g, ''));

// Attendance is the primary score; flexi only breaks ties, never outweighs attendance.
export function compareAttendance(a, b) {
  return b.masuk / b.hariKerja - a.masuk / a.hariKerja
    || (a.flexi || 0) - (b.flexi || 0)
    || (a.flexiMinutes || 0) - (b.flexiMinutes || 0)
    || b.masuk - a.masuk || a.nama.localeCompare(b.nama, 'id');
}

export function monthlyView(data, unit = '', publicView = false) {
  const employees = data?.employees || [];
  const units = [...new Set([...(data?.units || []), ...employees.map(row => row.unit)])].sort();
  const chosenUnit = units.includes(unit) ? unit : '';
  const rows = employees.filter(row => !chosenUnit || row.unit === chosenUnit);
  const ids = new Set(rows.map(row => row.nip));
  const inScope = row => publicView ? !chosenUnit || row.unit === chosenUnit : ids.has(row.nip);
  const daily = (data?.daily || []).filter(inScope), documents = (data?.documents || []).filter(inScope);
  const trips = documents.filter(row => row.type === 'spt');
  const days = [...new Set(daily.filter(row => !row.libur).map(row => row.tanggal))];
  const dailyWfo = days.map(date => ({ date, count: occurrences(daily.filter(row => row.tanggal === date && row.status === 'WFO' && row.hadir)) }))
    .sort((a, b) => b.count - a.count || a.date.localeCompare(b.date));
  const arrivals = daily.filter(row => row.hadir && Number.isFinite(row.arrival)).map(row => row.arrival);
  const eligible = rows.filter(row => row.completeMonth === true && row.hariKerja > 0 && row.masuk > 0);
  const discipline = [...eligible].sort(compareAttendance).slice(0, 5);
  const punctual = eligible.filter(row => row.assessed > 0).sort((a, b) => b.onTime / b.assessed - a.onTime / a.assessed
    || compareAttendance(a, b) || (a.avgArrival ?? 1440) - (b.avgArrival ?? 1440)).slice(0, 5);
  const destinations = Object.entries(trips.reduce((counts, trip) => {
    const name = trip.tujuan || 'Tujuan belum tersedia'; counts[name] = (counts[name] || 0) + (trip.count ?? 1); return counts;
  }, {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const groups = units.map(name => {
    const people = employees.filter(row => row.unit === name), groupIds = new Set(people.map(row => row.nip));
    const groupTrips = (data?.documents || []).filter(row => row.type === 'spt' && (publicView ? row.unit === name : groupIds.has(row.nip)));
    return { name, people, trips: occurrences(groupTrips) };
  });
  const top = key => rows.filter(row => row[key] > 0).sort((a, b) => b[key] - a[key] || a.nama.localeCompare(b.nama)).slice(0, 3);
  return { rows, units, chosenUnit, documents, trips, days, dailyWfo, earliest: arrivals.length ? Math.min(...arrivals) : null, discipline, punctual, destinations, groups, top };
}
