import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { attendanceReferencePayload, isAttendancePdf, MAX_ATTENDANCE_PDF_BYTES } from '../src/attendance-reference.js';

test('only PDF reference bytes are included in attendance upload payloads', async () => {
  const previous=globalThis.FileReader;
  globalThis.FileReader=class { readAsDataURL(){this.result='data:application/pdf;base64,JVBERi0=';this.onload();} };
  try {
    assert.deepEqual(await attendanceReferencePayload({name:'presensi.xlsx',size:50}),{});
    assert.deepEqual(await attendanceReferencePayload({name:'presensi.PDF',size:5}),{referencePdf:{fileName:'presensi.PDF',fileBase64:'JVBERi0='}});
    assert.equal(isAttendancePdf({name:'test.pdf.exe'}),false);
    for (const size of [0,MAX_ATTENDANCE_PDF_BYTES+1]) await assert.rejects(attendanceReferencePayload({name:'test.pdf',size}),/10 MB/);
  } finally { if(previous===undefined)delete globalThis.FileReader;else globalThis.FileReader=previous; }
});
test('presensi panel offers original document preview without exposing PDF parsing diagnostics', () => {
  const source=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  assert.match(source,/Lihat Dokumen/);assert.match(source,/Lihat PDF yang dipilih/);
  assert.doesNotMatch(source,/Baris disambungkan dari halaman berikutnya|pdfReadInfo\.mode/);
  assert.match(source,/readFileDataUrl\(file\)/);
});
