const cleanNip = value => String(value || '').replace(/[\s'"]/g, '').toLowerCase();
const cleanName = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
const hasValue = value => value && !['-', 'pegawai'].includes(cleanName(value));

// Once tab 2 provides an identity, do not mix it with the logged-in admin's identity.
export function getClaimIdentity(parsedData, loggedInUser) {
  const fromFile = hasValue(parsedData?.nip) || hasValue(parsedData?.nama);
  return {
    nip: fromFile ? (hasValue(parsedData?.nip) ? parsedData.nip : '') : loggedInUser?.NIP || '',
    nama: fromFile ? (hasValue(parsedData?.nama) ? parsedData.nama : '') : loggedInUser?.Nama || '',
  };
}

export function parseArchiveDate(value) {
  const text = String(value || '').trim();
  const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const numeric = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const indo = text.toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  let day, month, year;
  if (iso) [, year, month, day] = iso;
  else if (numeric) [, day, month, year] = numeric;
  else if (indo) { day = indo[1]; month = months.indexOf(indo[2]) + 1; year = indo[3]; }
  else return null;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day) ? date : null;
}

export function archiveItemKey(item) {
  return [item.linkAkses, item.nip, item.nama, item.tanggalBerangkat, item.tanggalPulang, item.tujuan].join('|');
}

export function filterArchiveForClaim(items, identity, period) {
  const parts = String(period || '').split(/\s*s\/d\s*/i);
  const start = parseArchiveDate(parts[0]);
  const end = parseArchiveDate(parts[1]);
  if (!start || !end || end < start) return [];
  const nip = cleanNip(identity.nip);
  const nama = cleanName(identity.nama);
  const seen = new Set();
  return items.filter(item => {
    const matched = (nip && cleanNip(item.nip) === nip) || (nama && cleanName(item.nama) === nama);
    if (!matched) return false;
    const first = parseArchiveDate(item.tanggalBerangkat);
    const last = hasValue(item.tanggalPulang) ? parseArchiveDate(item.tanggalPulang) : first;
    if (!first || !last || last < first || first > end || last < start) return false;
    const key = archiveItemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function createClaimPayload({ item, documentModule, activeTab, identity, selectedPeriod, id }) {
  const safe = value => String(value || '').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${documentModule.toUpperCase()}_${safe(identity.nama || identity.nip)}_${safe(item.tanggalBerangkat)}-${safe(item.tanggalPulang)}_${safe(item.tujuan).slice(0, 30)}_klaim_${id}.pdf`;
  return {
    action: 'klaim_dokumen', requestId: id, jenisDokumen: documentModule, modul: activeTab,
    nip: identity.nip, nama: identity.nama, periode: selectedPeriod.periodeEvent,
    bulanTahun: selectedPeriod.title, sourceUrl: item.linkAkses, fileName,
  };
}

export function submissionContext(activeTab, identity, selectedPeriod) {
  return { modul: activeTab, nip: identity.nip, nama: identity.nama,
    periode: selectedPeriod?.periodeEvent || '', bulanTahun: selectedPeriod?.title || '' };
}

export function eventUploadPayload(archivePayload, context, requestId) {
  return { ...archivePayload, ...context, action: 'upload_pendukung',
    jenisDokumen: archivePayload.modul, requestId };
}

export function driveFileId(value) {
  const match = String(value || '').match(/\/(?:d|folders)\/([\w-]+)/) || String(value || '').match(/[?&]id=([\w-]+)/);
  return match ? match[1] : '';
}

export async function sendClaimRequest(endpoint, payload, fetchRequest = fetch, { timeoutMs = 45000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchRequest(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload),
      redirect: 'follow', cache: 'no-store', credentials: 'omit', signal: controller.signal,
    });
    if (!response.ok) {
      const redirected = response.redirected || /^https:\/\/script\.googleusercontent\.com\//.test(response.url || '');
      const location = redirected ? 'respons pengalihan Google' : 'endpoint Apps Script';
      const message = response.status === 404
        ? `HTTP 404 pada ${location}. Hasil proses belum dapat dikonfirmasi. Periksa deployment Web App yang aktif dan URL /exec.`
        : `Server belum mengembalikan hasil (HTTP ${response.status}, ${location}).`;
      throw Object.assign(new Error(message), { transport: true, httpStatus: response.status });
    }
    let data;
    try { data = await response.json(); }
    catch { throw Object.assign(new Error('Respons Apps Script bukan JSON yang valid. Periksa URL /exec dan akses deployment.'), { transport: true }); }
    if (data?.status !== 'success') throw new Error(data?.message || 'Server belum mengonfirmasi permintaan.');
    return data;
  } catch (error) {
    if (controller.signal.aborted) throw Object.assign(new Error('Waktu tunggu respons Apps Script habis. Proses di server mungkin masih berjalan.'), { transport: true });
    if (!response && !error.transport) throw Object.assign(new Error('Tidak dapat menerima respons Apps Script. Periksa koneksi atau akses deployment.'), { transport: true });
    throw error;
  } finally { clearTimeout(timer); }
}

// A lost response does not mean the write failed. Recover using read-only preview;
// never automatically repeat claim/upload/delete or the processing write itself.
export async function processSubmissionEvidence(endpoint, context, {
  fetchRequest = fetch, onRecovery = () => {}, wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
  timeoutMs = 45000, recoveryTimeoutMs = 30000,
} = {}) {
  const requestId = globalThis.crypto?.randomUUID?.() || `process-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    return await sendClaimRequest(endpoint, { ...context, action: 'proses_bukti', requestId }, fetchRequest, { timeoutMs });
  } catch (error) {
    if (!error.transport || [400, 401, 403].includes(error.httpStatus)) throw error;
    onRecovery();
    for (let attempt = 0; attempt < 2; attempt++) {
      await wait(attempt === 0 ? 500 : 1500);
      try {
        const preview = await sendClaimRequest(endpoint, { ...context, action: 'preview_rekap_final', requestId }, fetchRequest, { timeoutMs: recoveryTimeoutMs });
        if (!preview.spreadsheetId || !preview.revision || !Array.isArray(preview.rows)) throw new Error('Preview belum lengkap.');
        return preview;
      } catch { /* Bounded read-only recovery; no repeated writes. */ }
    }
    throw new Error(`${error.message} Pemeriksaan hasil belum berhasil. Jangan hapus klaim; coba lagi setelah beberapa saat. Kode pemeriksaan: ${requestId}`);
  }
}

export async function checkExistingSubmission(endpoint, context, fetchRequest = fetch) {
  // Always POST to the backend; localStorage history cannot establish current existence.
  const data = await sendClaimRequest(endpoint, { ...context, action: 'check_status' }, fetchRequest);
  if (data.checkedLive !== true || typeof data.exists !== 'boolean') {
    throw new Error('Perbarui dan deploy Code.gs terbaru agar status rekap dapat diperiksa langsung.');
  }
  return data.exists;
}
