import test from 'node:test';
import assert from 'node:assert/strict';
import { confirmSubmittedRecap } from '../src/submission-recap.js';

test('recap confirmation shows only the submitted count and selected module/period; cancel blocks generation', () => {
  const context={modul:'tukin',periode:'11-09-2026 s/d 10-10-2026'};
  const messages=[];
  assert.equal(confirmSubmittedRecap(context,17,message=>{messages.push(message);return false;}),false);
  assert.equal(messages[0],'Yakin akan membuat rekap untuk 17 Pegawai yang sudah Submit?\n\nTunjangan Kinerja — 11-09-2026 s/d 10-10-2026');
  assert.equal(confirmSubmittedRecap({modul:'uang-makan',periode:'01-07-2026 s/d 31-07-2026'},3,message=>{assert.match(message,/3 Pegawai.*Submit\?[\s\S]*Uang Makan — 01-07-2026 s\/d 31-07-2026/);return true;}),true);
  for(const count of [0,-1,NaN,1.5,'3'])assert.equal(confirmSubmittedRecap(context,count,()=>{throw Error('Must not open for an invalid/empty count');}),false);
});
