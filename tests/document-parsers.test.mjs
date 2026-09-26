import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { attendanceExcelClocks, extractCutiPeriod } from '../src/document-parsers.js';
import { recognizeCutiImage, cutiOcrRegions } from '../src/cuti-ocr.js';

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
    attendanceExcelClocks,extractCutiPeriod,recognizeCutiImage,console,
    DAFTAR_LIBUR_NASIONAL:['2026-08-17','2026-08-25'],
    localStorage:{getItem:()=>JSON.stringify([{NIP:'199001012020011001',Nama:'Pegawai Uji'}])},
    parseIndoDate:value=>{const parts=value.split(' '), months=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];return new Date(+parts[2],months.indexOf(parts[1].slice(0,3)),+parts[0]);},
    formatIndoToYMD:()=>'',hitungHariKerjaAktif:()=>2,
    document:{createElement:()=>({getContext:()=>({})})},
    window:{XLSX:{read:()=>({SheetNames:Object.keys(sheets),Sheets:sheets}),utils:{sheet_to_json:(sheet,options)=>{
      assert.equal(options.header,1);assert.equal(options.raw,false);assert.equal(options.range,0);return sheet;
    }}},pdfjsLib:{getDocument:()=>({promise:Promise.resolve({numPages:1,getPage:async()=>({getTextContent:async()=>({items:digitalText?[{str:digitalText,transform:[0,0,0,0,0,0]}]:[]}),getViewport:()=>({width:100,height:100}),render:()=>({promise:Promise.resolve()})})})})},Tesseract:{recognize:async()=>({data:{text:ocrText}}),createWorker:async()=>({recognize:async()=>({data:{text:ocrText}}),setParameters:async()=>{},terminate:async()=>{}})}},
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

// Anonymized section excerpts from the five supplied scans, not fabricated clean OCR.
test('observed OCR accepts missing Selama, CUT without I, border noise and shared year',()=>{
  const samples=[
    ['IV._LAMANYA CUTI\n[Selama J 1 ~~ (haribulan#tahun) | tanggal [26 Agustus s/d 27 Agustus 2026\nV._CATATAN CUTF', '26 Agustus 2026','27 Agustus 2026',1],
    ['LAMANYA CUTI\n2 (HarifBulanfFahun)* Mulai Tanggal 3 September 2026 4 September 2026','3 September 2026','4 September 2026',2],
    ['IV. LAMANYA CUTI\n1 (Hari/BulanfFahun)* Mulai Tanggal 21 Agustus 2026 | dan | 21 Agustus 2026\nV. CATATAN CUT','21 Agustus 2026','21 Agustus 2026',1],
    ['V_LAMANYA CUT\n[Selama | 1 Satu (haribulanfahun) tanggal 24Agustus2026 |\nVI. ALAMAT SELAMA','24 Agustus 2026','24 Agustus 2026',1],
    ['LAMANYA CUTI\n[Seema | 3 (harikeray mi\nMulai Tanggal\nmilal tanggal 21Agustus 2026 | sid | 26 Agustus 2026','21 Agustus 2026','26 Agustus 2026',3],
  ];
  for(const [text,berangkat,pulang,duration] of samples) assert.deepEqual(extractCutiPeriod(text),{berangkat,pulang,duration});
  for(const sep of ['s/d','s.d','s.d.','s / d','-']) assert.equal(extractCutiPeriod(`LAMANYA CUTI Selama 2 hari tanggal 26 Agustus ${sep} 27 Agustus 2026`).berangkat,'26 Agustus 2026');
});

test('missing duration keeps incomplete dates for review, never silently asserts one day',()=>{
  const result=extractCutiPeriod('Jakarta 21 Agustus 2026\nIV. LAMANYA CUTI\n4 September 2026\nV. CATATAN CUTI');
  assert.equal(result.duration,null);assert.match(result.warning,/Jumlah hari belum terbaca/);
});

function mockOcr(responses) {
  let calls=0,closed=0; const options=[];
  return {Tesseract:{createWorker:async()=>({recognize:async(_,o)=>{options.push(o);const data=responses[calls++];if(data instanceof Error)throw data;return {data};},setParameters:async()=>{},terminate:async()=>{closed++;}})},stats:()=>({calls,closed,options})};
}
test('Ayu regression: retry the actual date row when whole-page OCR only sees the end date',async()=>{
  const mock=mockOcr([{text:'IV. LAMANYA CUTI\n4 September 2026\nV. CATATAN CUTI',lines:[
    {text:'IV. LAMANYA CUTI',bbox:{x0:155,y0:632,x1:326,y1:646}},
    {text:'4 September 2026',bbox:{x0:957,y0:656,x1:1110,y1:674}},
    {text:'V. CATATAN CUTI',bbox:{x0:155,y0:701,x1:345,y1:722}},
  ]},{text:'2 (HarifBulanfFahun)* Mulai Tanggal 3 September 2026 4 September 2026'}]);
  const result=await recognizeCutiImage({width:1191,height:1684},mock.Tesseract);
  assert.deepEqual(result.period,{berangkat:'3 September 2026',pulang:'4 September 2026',duration:2});
  assert.equal(mock.stats().calls,2);assert.equal(mock.stats().closed,1);
  assert.ok(mock.stats().options[1].rectangle.top>646);
});
test('skewed photo recovers missing duration from the left-hand cells of the same row',async()=>{
  const mock=mockOcr([{text:'mula tanggal 21Agustus 2026 | sia | 26 Agustus 2026',lines:[
    {text:'FORMULIR CUTI',bbox:{x0:90,y0:450,x1:1300,y1:480}},
    {text:'mula tanggal 21Agustus 2026 | sia | 26 Agustus 2026',bbox:{x0:728,y0:891,x1:1649,y1:922}}
  ]},{text:'milal tanggal 21Agustus 2026 | sid | 26 Agustus 2026'},{text:'[Seema | 3 (harikeray mi'}]);
  const result=await recognizeCutiImage({width:1800,height:2560},mock.Tesseract);
  assert.equal(result.period.duration,3);assert.equal(result.period.pulang,'26 Agustus 2026');
  assert.equal(mock.stats().calls,3);assert.equal(mock.stats().closed,1);
});
test('OCR worker is released on failure and a letter date alone cannot become a leave date',async()=>{
  const mock=mockOcr([new Error('OCR failed')]);
  await assert.rejects(recognizeCutiImage({width:100,height:100},mock.Tesseract),/OCR failed/);
  assert.equal(mock.stats().closed,1);
  assert.equal(cutiOcrRegions([{text:'Jakarta 21 Agustus 2026',bbox:{x0:1,y0:1,x1:90,y1:10}}],100,100),null);
});
test('optional supplied Excel reproducer: August 24 retains D dash and E 18:04', {skip:!process.env.PRESENSI_EXAMPLE_XLSX}, async()=>{
  const code="import openpyxl,json,sys; w=openpyxl.load_workbook(sys.argv[1],data_only=True); print(json.dumps({s.title:[[str(c) if c is not None else '' for c in r] for r in s.values] for s in w.worksheets}))";
  const sheets=JSON.parse(execFileSync(process.env.PARSER_PYTHON||'python',['-c',code,process.env.PRESENSI_EXAMPLE_XLSX],{encoding:'utf8'}));
  const result=await reader(sheets)('example.xlsx');
  assert.equal(result.rows.length,31);
  const row=result.rows.find(r=>r.tanggal==='24 Agu 2026');
  assert.equal(row.datang,'-');assert.equal(row.pulang,'18:04');
});
