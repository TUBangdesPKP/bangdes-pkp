import test from 'node:test';
import assert from 'node:assert/strict';
import { claimSourceKey, uniqueClaimItems, runClaimBatch } from '../src/claim-batch.js';

const payload = (id, type = 'spt') => ({ action: 'klaim_dokumen', jenisDokumen: type,
  modul: 'uang-makan', nip: '123', periode: '01-07-2026 s/d 31-07-2026',
  sourceUrl: `https://drive.google.com/file/d/${id}/view`, requestId: `request-${id}` });

test('archive selection deduplicates alternate Drive links by source, not filename or row', () => {
  const items = [{ linkAkses: payload('one').sourceUrl, tujuan: 'Surat A' },
    { linkAkses: 'https://drive.google.com/open?id=one', tujuan: 'Surat A (duplikat)' },
    { linkAkses: payload('two').sourceUrl, tujuan: 'Surat A' }];
  assert.deepEqual(uniqueClaimItems(items), [items[0], items[2]]);
  assert.equal(claimSourceKey(items[0].linkAkses), claimSourceKey(items[1].linkAkses));
});

test('multi-claim waits for each write acknowledgment and preserves every result', async () => {
  let inFlight = 0, maximum = 0;
  const calls = [], progress = [];
  const result = await runClaimBatch([payload('a'), payload('b'), payload('c', 'cuti')], {
    claim: async item => {
      inFlight++; maximum = Math.max(maximum, inFlight); calls.push(item.requestId);
      await new Promise(resolve => setImmediate(resolve));
      inFlight--;
      return { document: { fileId: item.requestId } };
    }, onProgress: state => progress.push([state.current, state.total]),
  });
  assert.equal(maximum, 1);
  assert.deepEqual(calls, ['request-a', 'request-b', 'request-c']);
  assert.deepEqual(progress, [[1, 3], [2, 3], [3, 3]]);
  assert.equal(result.succeeded.length, 3); assert.equal(result.failed.length, 0);
});

test('duplicate selection does not send a second write, but different scopes remain independent', async () => {
  const a = payload('a'), calls = [];
  const result = await runClaimBatch([a, { ...a, sourceUrl: 'https://drive.google.com/open?id=a', requestId: 'different' },
    { ...a, modul: 'tukin' }, { ...a, nip: '456' }, { ...a, periode: 'other' }], {
    claim: async item => { calls.push(item); return {}; },
  });
  assert.equal(calls.length, 4); assert.equal(result.succeeded.length, 4);
});

test('rejected document does not erase successes and later valid documents can still finish', async () => {
  const result = await runClaimBatch([payload('a'), payload('bad'), payload('c')], {
    claim: async item => { if (item.requestId === 'request-bad') throw new Error('Arsip tidak cocok'); return {}; },
  });
  assert.deepEqual(result.succeeded.map(row => row.payload.requestId), ['request-a', 'request-c']);
  assert.equal(result.failed[0].payload.requestId, 'request-bad');
  assert.equal(result.stopped, false);
});

for (const failure of [{ transport: true }, { code: 'SESSION_EXPIRED' }, { httpStatus: 403 }]) {
  test(`uncertain write / expired authorization stops queue without automatic retry: ${JSON.stringify(failure)}`, async () => {
    const calls = [];
    const result = await runClaimBatch([payload('a'), payload('b'), payload('c')], {
      claim: async item => { calls.push(item.requestId); if (calls.length === 2) throw Object.assign(new Error('Terputus'), failure); return {}; },
    });
    assert.deepEqual(calls, ['request-a', 'request-b']);
    assert.equal(result.succeeded.length, 1); assert.equal(result.failed.length, 1);
    assert.equal(result.remaining[0].requestId, 'request-c'); assert.equal(result.stopped, true);
  });
}

test('leaving employee/period stops subsequent writes without mixing scopes', async () => {
  let current = true;
  const result = await runClaimBatch([payload('a'), payload('b')], {
    isCurrent: () => current, claim: async () => { current = false; return {}; },
  });
  assert.equal(result.succeeded.length, 1); assert.equal(result.remaining.length, 1);
  assert.equal(result.stopped, true);
  const stale = await runClaimBatch([payload('a')], { isCurrent: () => false, claim: () => assert.fail('stale scope must not write') });
  assert.equal(stale.succeeded.length, 0);
});

test('extra uploads still distinguish request IDs instead of treating missing source links as duplicates', async () => {
  const result = await runClaimBatch(['one', 'two'].map(requestId => ({ action: 'upload_pendukung_lain', requestId })), { claim: async () => ({}) });
  assert.equal(result.succeeded.length, 2);
});
