const TYPES = [
  ['Cuti Tahunan', 'TAHUNAN'],
  ['Cuti Besar', 'BESAR'],
  ['Cuti Sakit', 'SAKIT'],
  ['Cuti Melahirkan', 'MELAHIRKAN'],
  ['Cuti Karena Alasan Penting', 'KARENA\\s*ALASAN\\s*PENTING'],
  ['Cuti diluar Tanggungan Negara', 'DI\\s*LUAR\\s*TANGGUNGAN\\s*NEGARA'],
];

// Only Bab II is authoritative. A check in Catatan/approval/footer is not a
// leave-type choice, nor is the reason for leave or the uploaded filename.
export function extractCutiType(text) {
  const clean = String(text || '').replace(/[\u00a0\t]/g, ' ');
  const heading = /JENIS\s*CUT[Il1!\]]?\b/i.exec(clean);
  let section;
  if (heading) {
    section = clean.slice(heading.index + heading[0].length)
      .split(/(?:\b[IVXIlT]+\s*[._]+\s*)?(?:ALASAN\s*CUT|LAMANYA\s*CUT|CATATAN\s*CUT|ALAMAT\s*SELAMA|PERTIMBANGAN|KEPUTUSAN)/i)[0];
  } else {
    // Standalone type excerpts are useful for isolated OCR cells, but never
    // search a whole form without knowing where its type section begins.
    if (/DATA\s*PEGAWAI|LAMANYA|CATATAN|PERTIMBANGAN|KEPUTUSAN|FORMULIR/i.test(clean)) return null;
    section = clean;
  }
  const labels = TYPES.flatMap(([type, name]) => [...section.matchAll(new RegExp(`CUT[Il1!\\]]\\s*${name}`, 'gi'))]
    .map(match => ({ type, start: match.index, end: match.index + match[0].length })));
  labels.sort((a,b) => a.start - b.start);
  const checked = new Set();
  labels.forEach((label, index) => {
    const cell = section.slice(label.end, labels[index+1]?.start ?? section.length)
      .replace(/[1-6]\s*[.)_]*\s*$/, '').trim();
    // OCR can attach the tick to the next option number ("v3."). Strip that
    // number, not the tick. Do not confuse Roman V headings or word fragments.
    if (/^[\s|_[\](){}:.,;\-–—]*[vV✓✔√☑✅∨][\s|_[\](){}:.,;\-–—]*$/.test(cell)) checked.add(label.type);
  });
  return checked.size === 1 ? [...checked][0] : null;
}

export function cutiTypeRegion(lines, width, height) {
  const sorted = lines.filter(line => line.bbox).sort((a,b) => a.bbox.y0-b.bbox.y0);
  const heading = sorted.find(line => /JENIS\s*CUT/i.test(line.text));
  if (!heading) return null;
  const lineHeight = Math.max(10, heading.bbox.y1-heading.bbox.y0);
  const next = sorted.find(line => line.bbox.y0>heading.bbox.y1 && /ALASAN\s*CUT|LAMANYA\s*CUT|CATATAN\s*CUT/i.test(line.text));
  const left = Math.max(0, Math.floor(heading.bbox.x0-lineHeight*2));
  const right = Math.min(width, Math.ceil(Math.max(...sorted.map(line=>line.bbox.x1))+lineHeight));
  const top = Math.max(0, Math.floor(heading.bbox.y1+1));
  const bottom = Math.min(height, top+lineHeight*5, next ? next.bbox.y0-3 : height);
  if (right<=left || bottom<=top) return null;
  return { left, top, width:right-left, height:Math.floor(bottom-top) };
}
