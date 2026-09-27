export function displayAttendanceTime(value) {
  const text = String(value || '').trim();
  if (!text || text === '-') return '-';
  const match = /^(\d{1,2})[:.](\d{2})(?::\d{2})?$/.exec(text);
  return match && +match[1] < 24 && +match[2] < 60 ? `${match[1].padStart(2, '0')}:${match[2]}` : text;
}

export function sameFinalReview(result, review) {
  if (!result?.calculation || !Array.isArray(result.rows)) return false;
  const corrections = input => Object.entries(input || {}).sort(([a], [b]) => a.localeCompare(b)).map(([date, row]) => [date, ['datang', 'pulang'].filter(key => row[key]).map(key => [key, displayAttendanceTime(row[key].time), row[key].fileId])]);
  return JSON.stringify(corrections(result.adjustments)) === JSON.stringify(corrections(review.adjustments)) && result.rows.every(row =>
    (review.schedules?.[row.tanggal] || 'biasa') === (row.jamKerja || 'biasa') &&
    (review.resolutions?.[row.tanggal] || '') === (row.penyelesaian || ''));
}

export function ownArchiveCsv(items) {
  if (!items.length) return '';
  const headers = Object.keys(items[0]);
  const cell = value => '"' + String(value ?? '').replaceAll('"', '""') + '"';
  return [headers, ...items.map(item => headers.map(key => item[key]))].map(row => row.map(cell).join(',')).join('\n');
}
