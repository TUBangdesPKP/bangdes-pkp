import test from 'node:test';
import assert from 'node:assert/strict';
import { displayAttendanceTime, sameFinalReview, ownArchiveCsv } from '../src/recap-review.js';

test('attendance clocks use HH:mm without turning missing punches into midnight', () => {
  for (const [value, expected] of [['7:30','07:30'],['06:04:00','06:04'],['8.09','08:09'],['-','-'],['','-'],['00:00','00:00']]) assert.equal(displayAttendanceTime(value),expected);
});
test('unchanged review reopens saved results; schedules, conflict decisions and evidence edits invalidate it', () => {
  const result={calculation:{complete:true},rows:[{tanggal:'2026-08-03',jamKerja:'biasa',penyelesaian:''}],adjustments:{'2026-08-03':{datang:{time:'07:30',fileId:'proof'}}}};
  const review={schedules:{'2026-08-03':'biasa'},resolutions:{},adjustments:result.adjustments};
  assert.equal(sameFinalReview(result,review),true);
  assert.equal(sameFinalReview(result,{...review,schedules:{'2026-08-03':'ramadan'}}),false);
  assert.equal(sameFinalReview(result,{...review,adjustments:{}}),false);
  assert.equal(sameFinalReview(result,{...review,resolutions:{'2026-08-03':'Cuti'}}),false);
  assert.equal(sameFinalReview(null,review),false);
});
test('own archive CSV preserves NIPs as text and escapes commas', () => {
  assert.equal(ownArchiveCsv([{NIP:'001234567890123456',Nama:'Uji, S.T.'}]),'"NIP","Nama"\n"001234567890123456","Uji, S.T."');
  assert.equal(ownArchiveCsv([]),'');
});
