import { sendClaimRequest } from './archive-claims.js';

const MAX_BYTES = 512 * 1024 * 1024;
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});
const crc32 = bytes => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
};

// ZIP STORE: PDFs/Office files are already compressed. Blob parts avoid making
// another contiguous copy of the whole archive. UTF-8 names retain employee names.
export function createEvidenceZip(entries) {
  if (entries.length > 3000) throw new Error('Terlalu banyak berkas untuk satu unduhan.');
  const parts = [], central = [], paths = new Set();
  let offset = 0, centralSize = 0;
  for (const { path, bytes } of entries) {
    const segments = path.replace(/\/$/, '').split('/');
    if (!path || path.includes('\\') || [...path].some(c => c.charCodeAt(0) < 32) || segments.some(s => !s || s === '.' || s === '..' || s.includes(':')) || paths.has(path.toLowerCase())) throw new Error('Nama berkas ZIP tidak valid atau ganda.');
    paths.add(path.toLowerCase());
    const name = new TextEncoder().encode(path), size = bytes.length, checksum = crc32(bytes);
    if (name.length > 65535 || offset + size > MAX_BYTES) throw new Error('Ukuran unduhan melebihi batas aman 512 MB.');
    const header = new Uint8Array(30), local = new DataView(header.buffer);
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0x800, true);
    local.setUint16(12, 33, true); // 1 January 1980 (valid minimum DOS date).
    local.setUint32(14, checksum, true); local.setUint32(18, size, true); local.setUint32(22, size, true); local.setUint16(26, name.length, true);
    const record = new Uint8Array(46), view = new DataView(record.buffer);
    view.setUint32(0, 0x02014b50, true); view.setUint16(4, 20, true); view.setUint16(6, 20, true); view.setUint16(8, 0x800, true);
    view.setUint16(14, 33, true); view.setUint32(16, checksum, true); view.setUint32(20, size, true); view.setUint32(24, size, true);
    view.setUint16(28, name.length, true); view.setUint32(38, path.endsWith('/') ? 16 : 0, true); view.setUint32(42, offset, true);
    parts.push(header, name, bytes); central.push(record, name);
    offset += header.length + name.length + size; centralSize += record.length + name.length;
  }
  const end = new Uint8Array(22), endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true); endView.setUint16(8, entries.length, true); endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true); endView.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}

export async function collectEvidenceDownload(endpoint, scope, { request = sendClaimRequest, onProgress = () => {}, cancelled = () => false } = {}) {
  const check = () => { if (cancelled()) throw new Error('Unduhan dibatalkan.'); };
  const call = async payload => {
    check();
    const result = await request(endpoint, { ...scope, ...payload }, undefined, { timeoutMs: 240000 });
    check();
    if (result.downloadVersion !== 1 || result.modul !== scope.modul || result.periode !== scope.periode) throw new Error('Respons unduhan tidak sesuai periode. Perbarui deployment backend.');
    return result;
  };
  const manifest = await call({ action: 'daftar_unduhan_bukti' });
  if (!Array.isArray(manifest.entries) || !manifest.entries.length || manifest.entries.length > 2000 || !Array.isArray(manifest.directories) || manifest.directories.length > 1000 || !manifest.revision || !/^[^/\\]+\.zip$/i.test(manifest.fileName)) throw new Error('Daftar unduhan tidak valid atau kosong.');
  const entries = manifest.directories.map(path => ({ path, bytes: new Uint8Array() }));
  let total = 0;
  for (const [index, file] of manifest.entries.entries()) {
    onProgress({ done: index, total: manifest.entries.length });
    const response = await call({ action: 'unduh_berkas_bukti', fileId: file.fileId, version: file.version });
    if (response.fileId !== file.fileId || response.version !== file.version || typeof response.base64 !== 'string' || response.base64.length > 36 * 1024 * 1024) throw new Error('Isi unduhan tidak sesuai berkas.');
    let raw;
    try { raw = atob(response.base64); } catch { throw new Error('Berkas unduhan rusak. Silakan ulangi.'); }
    if (raw.length !== response.size || raw.length > 25 * 1024 * 1024) throw new Error('Ukuran berkas unduhan tidak sesuai.');
    total += raw.length;
    if (total > MAX_BYTES) throw new Error('Ukuran unduhan melebihi batas aman 512 MB.');
    entries.push({ path: file.path, bytes: Uint8Array.from(raw, c => c.charCodeAt(0)) });
  }
  // Do not download a partial archive if files were added/removed/edited mid-transfer.
  const latest = await call({ action: 'daftar_unduhan_bukti' });
  if (latest.revision !== manifest.revision) throw new Error('Isi folder berubah selama unduhan. Silakan ulangi.');
  check();
  onProgress({ done: manifest.entries.length, total: manifest.entries.length });
  return { blob: createEvidenceZip(entries), fileName: manifest.fileName };
}

export function saveEvidenceDownload({ blob, fileName }) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = fileName;
  document.body.appendChild(link);
  try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000); }
}
