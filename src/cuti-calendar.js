import { sendClaimRequest } from './archive-claims.js';

export async function loadCutiCalendar(endpoint, fetchRequest = fetch) {
  const result = await sendClaimRequest(endpoint, {action:'kalender_cuti'}, fetchRequest, {timeoutMs:25000});
  if (result.calendarVersion !== 1 || !Array.isArray(result.dates) || !result.dates.length || result.dates.some(date => {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return true;
    const parsed = new Date(date+'T00:00:00Z');
    return !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== date;
  })) throw new Error('Kalender cuti belum tersedia. Admin perlu memperbarui deployment Apps Script.');
  return [...new Set(result.dates)];
}
