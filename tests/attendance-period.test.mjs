import test from 'node:test';
import assert from 'node:assert/strict';
import { attendanceDate, validateAttendancePeriod, assertAttendanceEmployee } from '../src/attendance-period.js';
import { submissionPeriodCard } from '../src/submission-period-model.js';

const dates = (start, end) => Array.from({ length: (Date.parse(end) - Date.parse(start)) / 86400000 + 1 }, (_, index) => ({ tanggal: new Date(Date.parse(start) + index * 86400000).toISOString().slice(0, 10) }));
test('attendance must cover every date of the selected period, not merely overlap', () => {
  const september = submissionPeriodCard('uang-makan', 2026, 9);
  const correct = dates('2026-09-01', '2026-09-30');
  assert.equal(validateAttendancePeriod(correct, september).valid, true);
  assert.equal(validateAttendancePeriod([...correct].reverse(), september).valid, true);
  for (const rows of [dates('2026-09-11', '2026-10-10'), dates('2026-09-11', '2026-10-05'), correct.slice(1), correct.filter((_, index) => index !== 15), [...correct, correct[0]], [correct[0], ...correct.slice(2), correct[29]], [...correct, { tanggal: '31 September 2026' }]]) {
    const result = validateAttendancePeriod(rows, september);
    assert.equal(result.valid, false); assert.equal(result.expectedDays, 30); assert.match(result.message, /tepat 30 tanggal/);
  }
  const tukin = submissionPeriodCard('tukin', 2026, 11);
  assert.equal(validateAttendancePeriod(dates('2026-09-11', '2026-10-10'), tukin).valid, true);
  const leap = submissionPeriodCard('uang-makan', 2028, 2);
  assert.equal(validateAttendancePeriod(dates('2028-02-01', '2028-02-29'), leap).valid, true);
});
test('attendance dates are calendar-valid and employee NIP is mandatory for the selected card', () => {
  for (const text of ['5 Sep 2026','5 September 2026','05-09-2026','2026-09-05']) assert.equal(attendanceDate(text), '2026-09-05');
  for (const text of ['31-09-2026','2026-02-29','0 Sep 2026','5 Unknown 2026','garbage']) assert.equal(attendanceDate(text), null);
  assert.doesNotThrow(() => assertAttendanceEmployee({ nip: "'00123" }, { nip: '00123', nama: 'Pegawai Uji' }));
  for (const nip of ['123','-','456',undefined]) assert.throws(() => assertAttendanceEmployee({ nip }, { nip: '00123', nama: 'Pegawai Uji' }), /NIP pada file tidak sesuai/);
});
