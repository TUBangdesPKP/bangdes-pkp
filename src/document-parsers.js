const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Keep cell boundaries: a missing D must never borrow a time from E (or a summary column).
export function attendanceExcelClocks(cells) {
  const clock = value => {
    const text = String(value ?? '').trim();
    if (!text || /^[-–—]+$/.test(text)) return '-';
    const match = /^(\d{1,2})[:.](\d{2})(?::\d{2})?(?:\s*WIB)?$/i.exec(text);
    if (!match || +match[1] > 23 || +match[2] > 59) throw new Error(`Jam presensi tidak valid: ${text}. Periksa kolom D (Masuk) dan E (Keluar).`);
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  };
  return { datang: clock(cells[3]), pulang: clock(cells[4]) };
}

export function extractCutiPeriod(text) {
  const normalized = String(text).replace(/[|_\[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
  const heading = /LAMANYA\s*CUT[Il1!]?\b/i.exec(normalized);
  const start = heading ? heading.index + heading[0].length : normalized.search(/Selama\s*:?\s*\d+.{0,100}?(?:Mulai\s*)?Tanggal/i);
  const fail = () => { throw new Error('Jumlah hari/tanggal pada Bab IV LAMANYA CUTI belum terbaca lengkap. Gunakan Upload Manual Cuti; tanggal kepala surat tidak digunakan sebagai tanggal cuti.'); };
  if (start < 0) return fail();
  const section = normalized.slice(start).split(/CATATAN\s*CUT|\bVI\s*\.|ALAMAT\s*SELAMA/i)[0].slice(0,400);
  // Table borders can become 'J', and OCR may omit Selama entirely.
  const durationArea = section.split(/(?:Mulai\s*)?Tanggal/i)[0].slice(0,100);
  const durationMatch = /Selama\s*:?\s*(?:J\s*)?(\d+)\b/i.exec(durationArea) || /\b(\d+)\s*(?:[~:*-]*\s*)?(?=\(|hari|satu|dua|tiga)/i.exec(durationArea);
  const duration = durationMatch && +durationMatch[1] > 0 ? +durationMatch[1] : null;
  const dateLabel = /(?:Mulai\s*)?Tanggal\s*:?/i.exec(section);
  const datePart = dateLabel ? section.slice(dateLabel.index + dateLabel[0].length) : section;
  const datePattern = new RegExp(`(\\d{1,2})\\s*(${MONTHS.join('|')})\\s*(\\d{4})`, 'gi');
  let dates = [...datePart.matchAll(datePattern)].map(m => [+m[1], MONTHS.findIndex(month => month.toLowerCase() === m[2].toLowerCase()), +m[3]]);
  if (dates.length === 1) {
    const sep = '(?:[-–—]|s\\s*[./]?\\s*d\\.?|sampai(?:\\s+dengan)?)';
    const short = new RegExp(`(\\d{1,2})\\s*(?:(${MONTHS.join('|')})\\s*)?${sep}\\s*(\\d{1,2})\\s*(${MONTHS.join('|')})\\s*(\\d{4})`, 'i').exec(datePart);
    if (short) dates = [[+short[1], short[2] ? MONTHS.findIndex(m=>m.toLowerCase()===short[2].toLowerCase()) : dates[0][1], +short[5]], [+short[3], dates[0][1], +short[5]]];
    else if (duration === 1 || duration === null) dates.push([...dates[0]]);
  }
  const stamp = d => Date.UTC(d[2], d[1], d[0]);
  if (dates.length !== 2 || dates.some(d => new Date(stamp(d)).getUTCDate() !== d[0]) || stamp(dates[0]) > stamp(dates[1]) || (duration !== null && duration > (stamp(dates[1]) - stamp(dates[0])) / 86400000 + 1)) return fail();
  const format = d => `${d[0]} ${MONTHS[d[1]]} ${d[2]}`;
  const result = { berangkat: format(dates[0]), pulang: format(dates[1]), duration };
  if (duration === null) result.warning = 'Jumlah hari belum terbaca. Periksa kedua tanggal dan isi Hari cuti melalui Ubah Data sebelum memilih pegawai.';
  return result;
}
