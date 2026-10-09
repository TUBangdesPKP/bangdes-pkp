import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { loadCutiCalendar } from '../src/cuti-calendar.js';

const reply = data => ({ok:true,json:async()=>data});
test('cuti calendar uses a read-only action and deduplicates valid dates',async()=>{
  const dates=await loadCutiCalendar('https://example.test/exec',async(url,options)=>{
    assert.equal(url,'https://example.test/exec');
    assert.equal(options.method,'POST');
    assert.deepEqual(JSON.parse(options.body),{action:'kalender_cuti'});
    return reply({status:'success',calendarVersion:1,dates:['2026-05-27','2026-05-28','2026-05-28','2026-05-29']});
  });
  assert.deepEqual(dates,['2026-05-27','2026-05-28','2026-05-29']);
});
test('cuti calendar rejects missing deployment, incomplete or invalid dates, and provider failure',async()=>{
  for(const data of [
    {status:'success'}, {status:'success',calendarVersion:1,dates:[]},
    ...['2026-02-30','2026-05-28T00:00:00Z','28/05/2026','<script>',null,1].map(value=>({status:'success',calendarVersion:1,dates:[value]})),
    {status:'error',message:'Server unavailable'},
  ]) await assert.rejects(()=>loadCutiCalendar('https://example.test/exec',async()=>reply(data)));
  await assert.rejects(()=>loadCutiCalendar('https://example.test/exec',async()=>{throw Error('Offline');}),/Tidak dapat menerima respons/);
});
test('archive manual, OCR, preview and save paths share the loaded calendar and gate submission until ready',()=>{
  const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  const panel=app.slice(app.indexOf('const useArsipUploadPanel ='),app.indexOf('const useArsipUploadPanel =')+110000);
  assert.match(panel,/useCutiCalendar\(APPS_SCRIPT_URL, documentModule === 'cuti'\)/);
  assert.match(panel,/const countArchiveDays = \(start,end\) => hitungHariKerjaAktif\(start,end,cutiCalendar.dates/);
  assert.match(panel,/if \(!cutiCalendar.ready \|\| isSubmittingArsip/);
  assert.match(panel,/const isManualUploadValid = cutiCalendar.ready/);
  assert.match(panel,/const jumlahHari = documentModule === 'cuti' \? countArchiveDays\(entry.startDate, entry.endDate\)/);
  assert.match(panel,/const jumlahHari = documentModule === 'cuti' \? countArchiveDays\(formatIndoToYMD\(tglBerangkat\), formatIndoToYMD\(tglPulang\)\)/);
  assert.match(panel,/Menunggu kalender/);
  assert.match(panel,/onClick=\{cutiCalendar.reload\}/);
});
test('working-day preview is independent of device timezone including DST',()=>{
  const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  const helper=app.slice(app.indexOf('const DAFTAR_LIBUR_NASIONAL ='),app.indexOf('const removeTitlesFromName ='));
  const script=helper+`; console.log(JSON.stringify([hitungHariKerjaAktif('2026-05-26','2026-06-02'),hitungHariKerjaAktif('2026-03-06','2026-03-10'),hitungHariKerjaAktif('2026-12-31','2027-01-04')]));`;
  for(const timezone of ['Asia/Jakarta','America/Los_Angeles','Pacific/Auckland']) {
    const child=spawnSync(process.execPath,['--input-type=module','-e',script],{env:{...process.env,TZ:timezone},encoding:'utf8'});
    assert.equal(child.status,0,child.stderr);
    assert.deepEqual(JSON.parse(child.stdout),[3,3,2],timezone);
  }
});
