import { extractCutiPeriod } from './document-parsers.js';

// Geometry comes from the current document's OCR, not a hard-coded form position.
export function cutiOcrRegions(lines, width, height) {
  const heading = lines.find(line => /LAMANYA\s*CUT/i.test(line.text));
  const dateLine = lines.find(line => /mula[il]?\s*tanggal/i.test(line.text));
  const anchor = heading || dateLine;
  if (!anchor?.bbox) return null;
  const box = anchor.bbox, lineHeight = Math.max(12, box.y1 - box.y0);
  const next = lines.find(line => line.bbox?.y0 > box.y1 && /CATATAN\s*CUT/i.test(line.text));
  const top = Math.max(0, Math.floor(heading ? box.y1 + 2 : box.y0 - lineHeight * 0.4));
  const bottom = Math.min(height, next ? next.bbox.y0 - 5 : height, top + lineHeight * 2.5);
  if (bottom <= top) return null;
  const left = Math.max(0, Math.floor((heading ? box.x0 : Math.min(...lines.filter(l=>l.bbox).map(l=>l.bbox.x0))) - lineHeight));
  const right = Math.min(width, Math.ceil(Math.max(...lines.filter(l=>l.bbox).map(l=>l.bbox.x1)) + lineHeight));
  const row = {left, top, width:right-left, height:Math.ceil(bottom - top)};
  return {row, duration:{...row, width:Math.ceil(row.width * 0.4)}};
}

function candidate(text) {
  try { return extractCutiPeriod(text); } catch { return null; }
}

export async function recognizeCutiImage(canvas, Tesseract, onProgress) {
  const worker = await Tesseract.createWorker('eng');
  try {
    const {data} = await worker.recognize(canvas);
    let period = candidate(data.text);
    if (period && !period.warning) return {text:data.text, period};
    onProgress?.('Membaca ulang baris Lamanya Cuti...');
    let lines = data.lines || [];
    let regions = cutiOcrRegions(lines, canvas.width, canvas.height);
    // A photo can lose its heading under automatic page segmentation.
    if (!regions) {
      await worker.setParameters({tessedit_pageseg_mode:'6'});
      const retry = (await worker.recognize(canvas)).data;
      const alternative = candidate(retry.text);
      if (alternative && !alternative.warning) return {text:data.text, period:alternative};
      lines = retry.lines || [];
      regions = cutiOcrRegions(lines,canvas.width,canvas.height);
      period = alternative || period;
    }
    if (regions) {
      await worker.setParameters({tessedit_pageseg_mode:'7'});
      const rowText = (await worker.recognize(canvas,{rectangle:regions.row})).data.text;
      let rowPeriod = candidate('LAMANYA CUTI\n' + rowText);
      if (rowPeriod && !rowPeriod.warning) return {text:data.text, period:rowPeriod};
      if (rowPeriod) {
        // Narrow crop retains the duration that a table grid or skew can hide.
        const durationText = (await worker.recognize(canvas,{rectangle:regions.duration})).data.text;
        rowPeriod = candidate('LAMANYA CUTI\n' + durationText + '\nMulai Tanggal\n' + rowText) || rowPeriod;
        if (!rowPeriod.warning) return {text:data.text, period:rowPeriod};
      }
      period = rowPeriod || period;
    }
    // An incomplete read may be shown for manual review, but never auto-selected.
    return {text:data.text, period};
  } finally {
    await worker.terminate();
  }
}
