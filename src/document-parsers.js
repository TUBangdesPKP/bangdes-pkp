const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Digital Riwayat Presensi tables: preserve column positions and carry an unfinished
// date row across repeated page headers. Never borrow a missing punch from another column.
export function attendancePdfRows(pages) {
  const datePattern = new RegExp(`(?:Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu)[,\\s]+(\\d{1,2})\\s+(${MONTHS.join('|')})\\s+(\\d{4})`, 'i');
  const normalized = pages.map(page => page.map(item => ({
    str: String(item.str || '').trim(), x: item.transform[4], y: item.transform[5], width: item.width || 0,
  })).filter(item => item.str));
  const layout = items => {
    const find = label => items.find(item => item.str.toLowerCase() === label);
    const masuk = find('masuk'), keluar = find('keluar'), tanggal = find('tanggal'), status = find('status');
    if (!masuk || !keluar || !tanggal || !status || !find('no')) return null;
    const waktu = items.filter(item => /^waktu$/i.test(item.str) && item.y <= masuk.y + 2 && item.y >= masuk.y - 40).sort((a,b) => a.x-b.x);
    const lokasi = items.filter(item => /^lokasi$/i.test(item.str) && item.y <= masuk.y + 2 && item.y >= masuk.y - 40).sort((a,b) => a.x-b.x);
    if (waktu.length !== 2 || lokasi.length !== 2 || !(waktu[0].x < lokasi[0].x && lokasi[0].x < waktu[1].x && waktu[1].x < lokasi[1].x)) return null;
    const center = item => item.x + item.width/2;
    const columns = waktu.map((item,i) => ({left:center(item)-(center(lokasi[i])-center(item))/2, right:(center(item)+center(lokasi[i]))/2}));
    return {columns, bottom:Math.min(...waktu.map(item=>item.y)), status:status.x-10,
      location:{left:columns[0].right,right:columns[1].left}};
  };
  if (!normalized.length || !layout(normalized[0])) return null; // Other supported PDF formats retain their reader.
  const result = [], seen = new Set();
  let current = null;
  const fail = detail => { throw new Error(`Tabel presensi PDF belum terbaca lengkap (${detail}). Gunakan PDF lengkap atau file Excel; data tidak diisi dengan perkiraan.`); };
  const finish = () => {
    if (!current) return;
    const clock = (items, label) => {
      const text = items.join(' ').trim();
      if (/^[-–—]+$/.test(text)) return '-';
      const match = /^(\d{1,2})[:.](\d{2})(?::\d{2})?(?:\s*WIB)?$/i.exec(text);
      if (!match || +match[1]>23 || +match[2]>59) return fail(`${current.tanggal}, kolom ${label}`);
      return `${match[1].padStart(2,'0')}:${match[2]}`;
    };
    if (seen.has(current.tanggal)) fail(`tanggal ganda ${current.tanggal}`);
    seen.add(current.tanggal);
    result.push({tanggal:current.tanggal, datang:clock(current.datang,'Masuk'), pulang:clock(current.pulang,'Keluar'),
      status:current.status.join(' '), lokasiDatangRaw:current.location.join(' ')});
  };
  normalized.forEach((items, pageIndex) => {
    const table = layout(items);
    if (!table) return fail(`header halaman ${pageIndex+1}`);
    const end = items.filter(item => /^TOTAL$|^Keterangan:|^Halaman\s+\d+\s+dari\s+\d+/i.test(item.str));
    const cutoff = end.length ? Math.max(...end.map(item=>item.y)) : -Infinity;
    const body = items.filter(item=>item.y < table.bottom-2 && item.y > cutoff+2).sort((a,b)=>b.y-a.y || a.x-b.x);
    const lines = [];
    body.forEach(item => {
      const previous = lines.at(-1);
      if (previous && Math.abs(previous.y-item.y)<2) previous.items.push(item);
      else lines.push({y:item.y,items:[item]});
    });
    lines.forEach(line => {
      line.items.sort((a,b)=>a.x-b.x);
      const dateText = line.items.filter(item=>item.x<table.columns[0].left).map(item=>item.str).join(' ');
      const match = datePattern.exec(dateText);
      if (match) {
        finish();
        const month = MONTHS.findIndex(name=>name.toLowerCase()===match[2].toLowerCase());
        const date = new Date(Date.UTC(+match[3],month,+match[1]));
        if (date.getUTCDate()!==+match[1]) fail(`tanggal ${match[0]}`);
        current = {tanggal:`${+match[1]} ${MONTHS[month]} ${match[3]}`,datang:[],pulang:[],status:[],location:[]};
      }
      const punches = table.columns.map(column => line.items.filter(item => {
        const x = item.x + item.width/2; return x >= column.left && x < column.right;
      }).map(item=>item.str));
      if (!current && punches.some(values=>values.length)) fail(`jam tanpa tanggal pada halaman ${pageIndex+1}`);
      if (!current) return;
      current.datang.push(...punches[0]); current.pulang.push(...punches[1]);
      current.status.push(...line.items.filter(item=>item.x>=table.status).map(item=>item.str));
      current.location.push(...line.items.filter(item=>item.x>=table.location.left && item.x<table.location.right).map(item=>item.str));
    });
  });
  finish();
  const allText = normalized.flat().map(item=>item.str).join(' ');
  const total = /Total\s+Data:\s*(\d+)\s*hari/i.exec(allText);
  if (!result.length || (total && result.length!==+total[1])) fail('jumlah tanggal tidak sesuai Total Data');
  return result;
}

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
