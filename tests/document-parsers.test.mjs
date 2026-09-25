import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { attendanceExcelClocks, extractCutiPeriod } from '../src/document-parsers.js';

const letter = `Jakarta, 21 Agustus 2026
I. DATA PEGAWAI
II. JENIS CUTI YANG DIAMBIL
Cuti Tahunan v
III. ALASAN CUTI
Keperluan keluarga
IV. LAMANYA CUTI
Selama
2 (Hari/Bulan/Tahun)*
Mulai Tanggal
3 September 2026
s/d
4 September 2026
V. CATATAN CUTI
Sisa 12
VI. ALAMAT SELAMA MENJALANKAN CUTI`;

test('Cuti uses entire Bab IV, not letter header or only the first four OCR lines', () => {
  assert.deepEqual(extractCutiPeriod(letter),{berangkat:'3 September 2026',pulang:'4 September 2026',duration:2});
  assert.deepEqual(extractCutiPeriod(letter.replaceAll('\n',' | ')),extractCutiPeriod(letter));
});
test('Cuti supports short ranges, one-day leave and cross-month leave without inventing end dates', () => {
  assert.equal(extractCutiPeriod('LAMANYA CUTI Selama 2 hari Mulai Tanggal 3 s.d. 4 September 2026 V. CATATAN CUTI').duration,2);
  assert.equal(extractCutiPeriod('LAMANYA CUTI Selama 1 hari Mulai Tanggal 3 September 2026 V. CATATAN CUTI').pulang,'3 September 2026');
  assert.equal(extractCutiPeriod('Selama 2 hari Mulai Tanggal 31 Agustus 2026 s/d 1 September 2026 V. CATATAN CUTI').pulang,'1 September 2026');
  assert.equal(extractCutiPeriod('LAMANYA CUTI Selama 2 hari Mulai Tanggal 4 September 2026 s/d 7 September 2026 V. CATATAN CUTI').duration,2);
});
test('unreadable Bab IV never falls back to header, signature, or unrelated dates', () => {
  for (const body of [
    'Jakarta 21 Agustus 2026',
    'Jakarta 21 Agustus 2026 IV. LAMANYA CUTI Selama 2 hari Mulai Tanggal 3 September 2026 V. CATATAN CUTI 4 September 2026',
    'LAMANYA CUTI Selama 2 hari Mulai Tanggal 31 September 2026 s/d 1 Oktober 2026',
    'LAMANYA CUTI Selama 2 hari Mulai Tanggal 4 September 2026 s/d 3 September 2026',
    'LAMANYA CUTI Selama 3 hari Mulai Tanggal 3 September 2026 s/d 4 September 2026',
  ]) assert.throws(()=>extractCutiPeriod(body),/Bab IV/);
});
test('Excel D and E stay independent, including absent arrival, absent departure and equal clocks', () => {
  for (const [d,e,want] of [['-','18:04',{datang:'-',pulang:'18:04'}],['7:06','-',{datang:'07:06',pulang:'-'}],['','16:30',{datang:'-',pulang:'16:30'}],['-','-',{datang:'-',pulang:'-'}],['08:00','08:00',{datang:'08:00',pulang:'08:00'}]]) {
    assert.deepEqual(attendanceExcelClocks(['1','Senin','2026-08-24',d,e,'09:00','19:00']),want);
  }
  assert.throws(()=>attendanceExcelClocks([0,0,0,'24:00','16:00']),/tidak valid/);
});

// Execute the real application reader with only external IO mocked, so integration
// regressions (flattened CSV, lost columns, overwritten '-') are covered as well.
const appSource=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
function reader(sheets, ocrText=letter, digitalText='') {
  const context=vm.createContext({
    attendanceExcelClocks,extractCutiPeriod,console,
    DAFTAR_LIBUR_NASIONAL:['2026-08-17','2026-08-25'],
    localStorage:{getItem:()=>JSON.stringify([{NIP:'199001012020011001',Nama:'Pegawai Uji'}])},
    parseIndoDate:value=>{const parts=value.split(' '), months=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];return new Date(+parts[2],months.indexOf(parts[1].slice(0,3)),+parts[0]);},
    formatIndoToYMD:()=>'',hitungHariKerjaAktif:()=>2,
    document:{createElement:()=>({getContext:()=>({})})},
    window:{XLSX:{read:()=>({SheetNames:Object.keys(sheets),Sheets:sheets}),utils:{sheet_to_json:(sheet,options)=>{
      assert.equal(options.header,1);assert.equal(options.raw,false);assert.equal(options.range,0);return sheet;
    }}},pdfjsLib:{getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({getTextContent:async()=>({items:digitalText?[{str:digitalText,transform:[0,0,0,0,0,0]}]:[]}),getViewport:()=>({width:100,height:100}),render:()=>({promise:Promise.resolve()})})})})},Tesseract:{recognize:async()=>({data:{text:ocrText}})}},
  });
  vm.runInContext(appSource.slice(appSource.indexOf('const extractArsipData ='),appSource.indexOf('const getStoredUser ='))+'\nglobalThis.readFile = parseDocumentPresensi;',context);
  return (name, module='uang-makan')=>context.readFile({name,arrayBuffer:async()=>new ArrayBuffer(0)},null,module);
}
test('real Excel reader keeps departure-only attendance, 1-digit hours, sheet boundaries and skips header dates', async()=>{
  const parse=reader({One:[['Periode 1 Agustus 2026 s/d 31 Agustus 2026'],[],['No','Hari','Tanggal','Masuk','Keluar'],['1','Senin','2026-08-24','-','18:04',...Array(16).fill(''),'WFO']],Two:[['2','Jumat','2026-08-28','7:06','-']]});
  const result=await parse('sample.xlsx');
  assert.equal(result.rows.length,2);assert.equal(result.totalHariMasuk,2);
  assert.equal(result.rows[1].datang,'-');assert.equal(result.rows[1].pulang,'18:04');
  assert.equal(result.rows[0].datang,'07:06');assert.equal(result.rows[0].pulang,'-');
});
test('real scanned-PDF pipeline carries Bab IV duration and dates through to archive preview',async()=>{
  const result=await reader({},letter)('cuti.pdf','cuti');
  assert.equal(result.arsipDateBerangkat,'3 September 2026');
  assert.equal(result.arsipDatePulang,'4 September 2026');assert.equal(result.arsipJumlahHariCuti,2);
  await assert.rejects(reader({},'Jakarta 21 Agustus 2026')('bad.pdf','cuti'),/Bab IV/);
});
test('partial PDF text with a valid NIP still uses OCR when Bab IV is missing',async()=>{
  const header='Jakarta 21 Agustus 2026 FORMULIR PERMINTAAN DAN PEMBERIAN CUTI NIP 199001012020011001';
  const result=await reader({},letter.replace('Cuti Tahunan v','Cuti Tahunan √'),header)('hybrid.pdf','cuti');
  assert.equal(result.arsipDateBerangkat,'3 September 2026');assert.equal(result.arsipJumlahHariCuti,2);
  assert.equal(result.arsipTujuan,'Cuti Tahunan');
});
test('optional supplied Excel reproducer: August 24 retains D dash and E 18:04', {skip:!process.env.PRESENSI_EXAMPLE_XLSX}, async()=>{
  const code="import openpyxl,json,sys; w=openpyxl.load_workbook(sys.argv[1],data_only=True); print(json.dumps({s.title:[[str(c) if c is not None else '' for c in r] for r in s.values] for s in w.worksheets}))";
  const sheets=JSON.parse(execFileSync(process.env.PARSER_PYTHON||'python',['-c',code,process.env.PRESENSI_EXAMPLE_XLSX],{encoding:'utf8'}));
  const result=await reader(sheets)('example.xlsx');
  assert.equal(result.rows.length,31);
  const row=result.rows.find(r=>r.tanggal==='24 Agu 2026');
  assert.equal(row.datang,'-');assert.equal(row.pulang,'18:04');
});
