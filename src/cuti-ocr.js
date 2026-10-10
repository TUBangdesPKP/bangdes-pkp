import { extractCutiPeriod } from './document-parsers.js';
import { cutiTypeRegion, extractCutiType } from './cuti-type.js';

const ocrLines = data => data.lines || (data.blocks || []).flatMap(block =>
  (block.paragraphs || []).flatMap(paragraph => paragraph.lines || []));

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
    const {data} = await worker.recognize(canvas, {}, { text: true, blocks: true });
    const finish = async (period, lines = ocrLines(data)) => {
      let type = extractCutiType(data.text);
      if (!type) {
        const rectangle = cutiTypeRegion(lines, canvas.width, canvas.height);
        if (rectangle) {
          onProgress?.('Membaca tanda centang pada bagian Jenis Cuti...');
          // Isolate Bab II from table borders, approval checks and footnotes.
          // PSM 6 keeps the two rows in reading order instead of mixing columns.
          await worker.setParameters({ tessedit_pageseg_mode: '6' });
          const retry = (await worker.recognize(canvas, { rectangle })).data;
          type = extractCutiType('JENIS CUTI YANG DIAMBIL\n' + retry.text);
        }
      }
      return { text: data.text, period, type };
    };
    let period = candidate(data.text);
    if (period && !period.warning) return await finish(period);
    onProgress?.('Membaca ulang baris Lamanya Cuti...');
    let lines = ocrLines(data);
    let regions = cutiOcrRegions(lines, canvas.width, canvas.height);
    // A photo can lose its heading under automatic page segmentation.
    if (!regions) {
      await worker.setParameters({tessedit_pageseg_mode:'6'});
      const retry = (await worker.recognize(canvas, {}, { text: true, blocks: true })).data;
      const alternative = candidate(retry.text);
      if (alternative && !alternative.warning) return await finish(alternative, ocrLines(retry));
      lines = ocrLines(retry);
      regions = cutiOcrRegions(lines,canvas.width,canvas.height);
      period = alternative || period;
    }
    if (regions) {
      await worker.setParameters({tessedit_pageseg_mode:'7'});
      const rowText = (await worker.recognize(canvas,{rectangle:regions.row})).data.text;
      let rowPeriod = candidate('LAMANYA CUTI\n' + rowText);
      if (rowPeriod && !rowPeriod.warning) return await finish(rowPeriod, lines);
      if (rowPeriod) {
        // Narrow crop retains the duration that a table grid or skew can hide.
        const durationText = (await worker.recognize(canvas,{rectangle:regions.duration})).data.text;
        rowPeriod = candidate('LAMANYA CUTI\n' + durationText + '\nMulai Tanggal\n' + rowText) || rowPeriod;
        if (!rowPeriod.warning) return await finish(rowPeriod, lines);
      }
      period = rowPeriod || period;
    }
    // An incomplete read may be shown for manual review, but never auto-selected.
    return await finish(period, lines);
  } finally {
    await worker.terminate();
  }
}
