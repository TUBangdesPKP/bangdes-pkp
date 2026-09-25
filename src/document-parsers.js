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
  const normalized = String(text).replace(/[|\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  const heading = /LAMANYA\s*CUTI/i.exec(normalized);
  const start = heading ? heading.index + heading[0].length : normalized.search(/Selama\s*:?\s*\d+[\s\S]*?Mulai\s*Tanggal/i);
  const fail = () => { throw new Error('Jumlah hari/tanggal pada Bab IV LAMANYA CUTI belum terbaca lengkap. Gunakan Upload Manual Cuti; tanggal kepala surat tidak digunakan sebagai tanggal cuti.'); };
  if (start < 0) return fail();
  const section = normalized.slice(start).split(/(?:\bV\s*\.\s*)?CATATAN\s*CUTI|\bVI\s*\.|ALAMAT\s*SELAMA/i)[0];
  const durationMatch = /Selama\s*:?\s*(\d+)\b/i.exec(section);
  const duration = durationMatch ? +durationMatch[1] : 0;
  if (!duration) return fail();
  const datePart = section.split(/Mulai\s*Tanggal\s*:?/i)[1] || section;
  const datePattern = new RegExp(`(\\d{1,2})\\s*(${MONTHS.join('|')})\\s*(\\d{4})`, 'gi');
  let dates = [...datePart.matchAll(datePattern)].map(m => [+m[1], MONTHS.findIndex(month => month.toLowerCase() === m[2].toLowerCase()), +m[3]]);
  if (dates.length === 1) {
    const short = new RegExp(`(\\d{1,2})\\s*(?:[-–—]|s\\s*[./]?\\s*d\\.?|sampai(?:\\s+dengan)?)\\s*(\\d{1,2})\\s*(${MONTHS.join('|')})\\s*(\\d{4})`, 'i').exec(datePart);
    if (short) dates = [[+short[1], dates[0][1], +short[4]], [+short[2], dates[0][1], +short[4]]];
    else if (duration === 1) dates.push([...dates[0]]);
  }
  const stamp = d => Date.UTC(d[2], d[1], d[0]);
  if (dates.length !== 2 || dates.some(d => new Date(stamp(d)).getUTCDate() !== d[0]) || stamp(dates[0]) > stamp(dates[1]) || duration > (stamp(dates[1]) - stamp(dates[0])) / 86400000 + 1) return fail();
  const format = d => `${d[0]} ${MONTHS[d[1]]} ${d[2]}`;
  return { berangkat: format(dates[0]), pulang: format(dates[1]), duration };
}
