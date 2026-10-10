import { driveFileId } from './archive-claims.js';

export const claimSourceKey = url => driveFileId(url) || String(url || '').trim();

export function uniqueClaimItems(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = claimSourceKey(item.linkAkses);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Await each acknowledgement before the next write. A lost response can mean the
// server is still writing: stop the queue, never automatically repeat that write.
export async function runClaimBatch(payloads, { claim, isCurrent = () => true, onProgress = () => {} }) {
  const seen = new Set();
  const queue = payloads.filter(payload => {
    const key = JSON.stringify([payload.action, payload.jenisDokumen, payload.modul, payload.nip,
      payload.periode, payload.sourceUrl ? claimSourceKey(payload.sourceUrl) : payload.requestId]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const report = { succeeded: [], failed: [], remaining: [], stopped: false };
  for (const [index, payload] of queue.entries()) {
    if (!isCurrent()) { report.stopped = true; report.remaining = queue.slice(index); break; }
    onProgress({ current: index + 1, total: queue.length, payload });
    try {
      const result = await claim(payload);
      report.succeeded.push({ payload, result });
    } catch (error) {
      report.failed.push({ payload, error });
      if (error.transport || error.code === 'SESSION_EXPIRED' || [401, 403].includes(error.httpStatus)) {
        report.stopped = true;
        report.remaining = queue.slice(index + 1);
        break;
      }
    }
  }
  return report;
}
