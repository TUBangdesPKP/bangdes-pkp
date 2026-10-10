const months = ['jan', 'feb', 'mar', 'apr', 'mei', 'jun', 'jul', 'agu', 'sep', 'okt', 'nov', 'des'];

export function attendanceDate(value) {
  const text = String(value || '').trim();
  let year, month, day;
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) [, year, month, day] = match;
  else if ((match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/))) [, day, month, year] = match;
  else if ((match = text.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i))) {
    [, day, , year] = match;
    month = months.indexOf(match[2].toLowerCase().slice(0, 3)) + 1;
  } else return null;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return date.getUTCFullYear() === Number(year) && date.getUTCMonth() + 1 === Number(month) && date.getUTCDate() === Number(day)
    ? date.toISOString().slice(0, 10) : null;
}

// Validate the actual rows, never a clipped subset or a tolerated boundary difference.
export function validateAttendancePeriod(rows, period) {
  const parts = String(period?.periodeEvent || period || '').split(/\s*s\/d\s*/i);
  const start = attendanceDate(parts[0]), end = attendanceDate(parts[1]);
  if (!start || !end || start > end) return { valid: false, expectedDays: 0, message: 'Pilih periode presensi yang valid.' };
  const expected = [];
  for (let day = Date.parse(start); day <= Date.parse(end); day += 86400000) {
    expected.push(new Date(day).toISOString().slice(0, 10));
    if (expected.length > 366) return { valid: false, expectedDays: 0, message: 'Rentang presensi terlalu panjang.' };
  }
  const dates = rows.map(row => attendanceDate(row.tanggal));
  const seen = new Set(dates);
  const missing = expected.filter(date => !seen.has(date));
  const outside = dates.filter(date => date && (date < start || date > end));
  const duplicates = dates.filter((date, index) => dates.indexOf(date) !== index);
  const invalid = dates.filter(date => !date).length;
  const valid = !missing.length && !outside.length && !duplicates.length && !invalid;
  const problems = [missing.length && `${missing.length} tanggal belum ada`, outside.length && `${outside.length} tanggal di luar periode`, duplicates.length && `${duplicates.length} tanggal ganda`, invalid && `${invalid} tanggal tidak valid`].filter(Boolean);
  return { valid, expectedDays: expected.length, missing, outside, duplicates,
    message: valid ? '' : `Presensi harus memuat tepat ${expected.length} tanggal (${problems.join(', ')}). Unggah file untuk seluruh periode yang dipilih.` };
}

export function assertAttendanceEmployee(data, employee) {
  if (employee && String(data.nip).replace(/^'/, '').trim() !== String(employee.nip).replace(/^'/, '').trim()) {
    throw new Error(`NIP pada file tidak sesuai dengan pegawai yang dipilih: ${employee.nama} (${employee.nip}).`);
  }
}
