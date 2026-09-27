import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionPeriodCard} from '../src/submission-period-model.js';

test('meal periods support future years, leap days and stable legacy identifiers',()=>{
  const leap=submissionPeriodCard('uang-makan',2028,2);
  assert.equal(leap.periodeEvent,'01-02-2028 s/d 29-02-2028');assert.equal(leap.expectedDays,29);
  assert.equal(submissionPeriodCard('uang-makan',2027,2).endDate,'28-02-2027');
  assert.equal(submissionPeriodCard('uang-makan',2026,8).id,'um-2026-08');
  assert.equal(submissionPeriodCard('uang-makan',2035,12).periodeFolder,'Periode_2035-12');
});
test('tukin payment periods correctly cross calendar years',()=>{
  const jan=submissionPeriodCard('tukin',2027,1,'DIBUKA');
  assert.equal(jan.periodeEvent,'11-11-2026 s/d 10-12-2026');assert.equal(jan.status,'DIBUKA');
  assert.equal(submissionPeriodCard('tukin',2027,2).periodeEvent,'11-12-2026 s/d 10-01-2027');
  assert.equal(submissionPeriodCard('tukin',2027,3).periodeEvent,'11-01-2027 s/d 10-02-2027');
  assert.equal(submissionPeriodCard('tukin',2026,10).periodeEvent,'11-08-2026 s/d 10-09-2026');
});
test('invalid period selectors are rejected',()=>{
  for(const args of [['uang-makan',2027,13],['tukin',NaN,1],['spt',2027,1],['tukin',2027.5,1]])assert.throws(()=>submissionPeriodCard(...args));
});
