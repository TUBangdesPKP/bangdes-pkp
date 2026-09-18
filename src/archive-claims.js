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
    // Existing Apps Script contract copies sourceUrl into the event folder.
    // Keep its action name for compatibility; document type is explicit metadata.
    action: 'klaim_spt', jenisDokumen: documentModule, modul: activeTab,
    nip: identity.nip, nama: identity.nama, periode: selectedPeriod.periodeEvent,
    bulanTahun: selectedPeriod.title, sourceUrl: item.linkAkses, fileName,
  };
}

export async function sendClaimRequest(endpoint, payload, fetchRequest = fetch) {
  const response = await fetchRequest(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Server menolak permintaan (${response.status}).`);
  let data;
  try { data = await response.json(); }
  catch { throw new Error('Respons server tidak valid. Klaim belum dapat dikonfirmasi.'); }
  if (data.status !== 'success') throw new Error(data.message || 'Server belum mengonfirmasi klaim.');
  return data;
}
