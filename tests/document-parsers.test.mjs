import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { attendanceExcelClocks, attendancePdfRows, extractCutiPeriod } from '../src/document-parsers.js';
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
const holidayContext=vm.createContext({});
vm.runInContext(appSource.slice(appSource.indexOf('const DAFTAR_LIBUR_NASIONAL ='),appSource.indexOf('const removeTitlesFromName ='))+'\nglobalThis.holidays = DAFTAR_LIBUR_NASIONAL; globalThis.workdays = hitungHariKerjaAktif;',holidayContext);
function reader(sheets, ocrText=letter, digitalText='', pdfPages=null) {
  const context=vm.createContext({
    attendanceExcelClocks,attendancePdfRows,extractCutiPeriod,recognizeCutiImage,console,
    DAFTAR_LIBUR_NASIONAL:holidayContext.holidays,
    localStorage:{getItem:()=>JSON.stringify([{NIP:'199001012020011001',Nama:'Pegawai Uji'}])},
    parseIndoDate:value=>{const parts=value.split(' '), months=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];return new Date(+parts[2],months.indexOf(parts[1].slice(0,3)),+parts[0]);},
    formatIndoToYMD:()=>'',hitungHariKerjaAktif:()=>2,
    document:{createElement:()=>({getContext:()=>({})})},
    window:{XLSX:{read:()=>({SheetNames:Object.keys(sheets),Sheets:sheets}),utils:{sheet_to_json:(sheet,options)=>{
      assert.equal(options.header,1);assert.equal(options.raw,false);assert.equal(options.range,0);return sheet;
    }}},pdfjsLib:{getDocument:()=>({promise:Promise.resolve({numPages:pdfPages?.length||1,getPage:async n=>({getTextContent:async()=>({items:pdfPages?pdfPages[n-1]:digitalText?[{str:digitalText,transform:[0,0,0,0,0,0]}]:[]}),getViewport:()=>({width:100,height:100}),render:()=>({promise:Promise.resolve()})})})})},Tesseract:{recognize:async()=>({data:{text:ocrText}}),createWorker:async()=>({recognize:async()=>({data:{text:ocrText}}),setParameters:async()=>{},terminate:async()=>{}})}},
  });
  vm.runInContext(appSource.slice(appSource.indexOf('const extractArsipData ='),appSource.indexOf('const getStoredUser ='))+'\nglobalThis.readFile = parseDocumentPresensi;',context);
  return (name, module='uang-makan', period=null)=>context.readFile({name,arrayBuffer:async()=>new ArrayBuffer(0)},period,module);
}

const pdfItem = (str,x,y,width=20) => ({str,width,transform:[1,0,0,1,x,y]});
const pdfHeaders = () => [pdfItem('No',34,550),pdfItem('Tanggal',82,550),pdfItem('Masuk',204,558),pdfItem('Keluar',348,558),pdfItem('Status',782,550),pdfItem('Waktu',163,540),pdfItem('Lokasi',234,540),pdfItem('Waktu',307,540),pdfItem('Lokasi',378,540)];
const pdfDate = (date,y) => pdfItem(date,50,y,80);
const pdfPunches = (start,end,y,status='WFO') => [pdfItem(start,158,y),pdfItem(end,302,y),pdfItem(status,785,y),pdfItem('22:00',690,y),pdfItem('23:00',750,y)];
const splitPdf = () => [
  [pdfItem('NIP: 199001012020011001',30,590),pdfItem('Total Data: 4 hari',700,590),...pdfHeaders(),pdfDate('Rabu, 9 September 2026',510),...pdfPunches('07:35 WIB','17:36 WIB',506),pdfDate('Selasa, 8 September 2026',70),pdfItem('Kantor 09:00',228,70),pdfItem('Halaman 1 dari 2',430,25)],
  [...pdfHeaders(),...pdfPunches('07:17 WIB','16:31 WIB',520),pdfDate('Senin, 7 September 2026',500),...pdfPunches('-','16:41 WIB',496),pdfDate('Minggu, 6 September 2026',480),...pdfPunches('-','-',476,'-'),pdfItem('TOTAL',400,450),pdfItem('20:00',158,450),pdfItem('Halaman 2 dari 2',430,25)],
];

test('digital PDF carries a split row across page headers and isolates arrival/departure from summary clocks',()=>{
  const rows=attendancePdfRows(splitPdf());
  assert.deepEqual(rows.map(r=>[r.tanggal,r.datang,r.pulang]),[
    ['9 September 2026','07:35','17:36'],['8 September 2026','07:17','16:31'],['7 September 2026','-','16:41'],['6 September 2026','-','-'],
  ]);
  assert.equal(rows[1].lokasiDatangRaw,'Kantor 09:00');assert.equal(rows[1].status,'WFO');
  const changed=splitPdf();changed[1]=changed[1].map(item=>item.str==='07:17 WIB'?{...item,str:'7:17 WIB'}:item.str==='16:31 WIB'?{...item,str:'07:17 WIB'}:item);
  const equal=attendancePdfRows(changed)[1];assert.equal(equal.datang,'07:17');assert.equal(equal.pulang,'07:17');
});

test('PDF.js 3 fragmented Total Data header and footer cannot terminate the attendance table', async()=>{
  const pages=splitPdf();
  pages[0].splice(1,1,pdfItem('Total',700,590),pdfItem('Data:',730,590),pdfItem('4',760,590),pdfItem('hari',775,590));
  for(const [i,page] of pages.entries()) {
    page.splice(page.findIndex(item=>item.str.startsWith('Halaman')),1,
      pdfItem('Halaman',430,25),pdfItem(String(i+1),470,25),pdfItem('dari',480,25),pdfItem('2',500,25));
    const index=page.findIndex(item=>item.str==='Selasa, 8 September 2026');
    if(index>=0) page.splice(index,1,pdfItem('Selasa,',50,70),pdfItem('8',75,70,4),pdfItem('September',82,70,30),pdfItem('2026',117,70,16));
  }
  const rows=attendancePdfRows(pages);
  assert.equal(rows.length,4);assert.deepEqual(rows[1].sourcePages,[1,2]);
  assert.equal(rows[1].datang,'07:17');assert.equal(rows[1].pulang,'16:31');
  const preview=await reader({},'','',pages)('split.pdf');
  assert.equal(preview.pdfReadInfo.mode,'PDF lintas halaman v2');
  assert.deepEqual(Array.from(preview.pdfReadInfo.continuedDates),['8 September 2026']);
});

test('continuations work over three pages and retain centered multiline WFA locations',()=>{
  const pages=splitPdf();
  pages[1]=[...pdfHeaders(),...pdfPunches('07:17 WIB','16:31 WIB',520),pdfDate('Senin, 7 September 2026',70),pdfItem('Halaman 2 dari 3',430,25)];
  pages.push([...pdfHeaders(),...pdfPunches('07:24 WIB','18:14 WIB',520,'WFA'),pdfItem('sekitar Kantor',215,510,65),pdfItem('Jawa, 17175, Indonesia',202,500,85),pdfDate('Minggu, 6 September 2026',480),...pdfPunches('-','-',476,'-'),pdfItem('TOTAL',400,450)]);
  const rows=attendancePdfRows(pages);
  assert.deepEqual(rows[1].sourcePages,[1,2]);assert.deepEqual(rows[2].sourcePages,[2,3]);
  assert.equal(rows[2].datang,'07:24');assert.equal(rows[2].pulang,'18:14');assert.equal(rows[2].status,'WFA');
  assert.equal(rows[2].lokasiDatangRaw,'sekitar Kantor Jawa, 17175, Indonesia');
  assert.equal(rows[3].datang,'-');assert.equal(rows[3].pulang,'-');
});

test('recognized PDF never silently fills missing, conflicting or truncated rows with dashes',()=>{
  assert.throws(()=>attendancePdfRows(splitPdf().slice(0,1)),/8 September 2026, kolom Masuk/);
  assert.throws(()=>attendancePdfRows(splitPdf().slice(1)),/jam tanpa tanggal/);
  const missing=splitPdf();missing[1]=missing[1].filter(item=>item.str!=='07:17 WIB');
  assert.throws(()=>attendancePdfRows(missing),/kolom Masuk/);
  const duplicate=splitPdf();duplicate[1].push(pdfDate('Senin, 7 September 2026',460),...pdfPunches('08:00','17:00',456));
  assert.throws(()=>attendancePdfRows(duplicate),/tanggal ganda/);
  const total=splitPdf();total[0][1].str='Total Data: 5 hari';
  assert.throws(()=>attendancePdfRows(total),/Total Data/);
  assert.equal(attendancePdfRows([[pdfItem('Legacy attendance or Cuti',0,0)]]),null);
});

test('real tab 2 pipeline uses structured PDF rows for meal and Tukin preview',async()=>{
  for(const module of ['uang-makan','tukin']) {
    const result=await reader({},'', '',splitPdf())('attendance.pdf',module);
    assert.equal(result.rows.length,4);assert.equal(result.totalHariMasuk,3);
    const row=result.rows.find(row=>row.tanggal==='8 Sep 2026');assert.equal(row.datang,'07:17');assert.equal(row.pulang,'16:31');assert.equal(row.keterangan,'WFO');
    const departure=result.rows.find(row=>row.tanggal==='7 Sep 2026');assert.equal(departure.datang,'-');assert.equal(departure.pulang,'16:41');
    assert.equal(result.rows.find(row=>row.tanggal==='6 Sep 2026').keterangan,'Libur');
  }
});

test('PDF accepts WIB/WITA/WIT without converting the local clock and preserves a missing departure',async()=>{
  for(const zone of ['WIB','WITA','WIT','wita']) {
    const pages=splitPdf();
    pages[1]=pages[1].map(item=>item.str==='07:17 WIB'?{...item,str:`7:17 ${zone}`}:item.str==='16:31 WIB'?{...item,str:'-'}:item);
    // The zone label may also be a separate PDF text item.
    if(zone==='WIT') {
      const index=pages[1].findIndex(item=>item.str==='7:17 WIT');
      pages[1].splice(index,1,pdfItem('7:17',158,520,16),pdfItem('WIT',179,520,13));
    }
    const row=attendancePdfRows(pages)[1];assert.equal(row.datang,'07:17');assert.equal(row.pulang,'-');
    for(const module of ['uang-makan','tukin']) {
      const result=await reader({},'','',pages)('zone.pdf',module);
      const day=result.rows.find(row=>row.tanggal==='8 Sep 2026');
      assert.equal(day.datang,'07:17');assert.equal(day.pulang,'-');
    }
  }
  for(const bad of ['25:17 WITA','07:70 WIT','07:17 UNKNOWN']) {
    const pages=splitPdf();pages[1]=pages[1].map(item=>item.str==='07:17 WIB'?{...item,str:bad}:item);
    assert.throws(()=>attendancePdfRows(pages),/8 September 2026, kolom Masuk/);
  }
});

const suppliedPdfCases = [
  { env:'PRESENSI_PDF_FIXTURE_D', split:'11 September 2026', dinas:true, masuk:20, expected:['07:25/-','07:00/-','07:15/16:17','-/-','-/-','07:46/19:31','07:44/19:15','07:30/17:40','07:47/18:44','07:13/17:09','-/-','-/-','07:41/18:14','07:33/19:53','07:35/18:29','07:37/19:07','07:22/17:21','-/-','-/-','07:35/21:13','07:21/20:12','07:50/18:12','07:21/17:16','07:25/16:25','-/-','08:25/16:15','07:32/22:07','07:30/18:58','07:31/18:30','07:31/16:06'] },
  { env:'PRESENSI_PDF_FIXTURE', split:'8 September 2026', expected:['07:28/19:08','06:59/16:33','07:13/16:45','-/-','-/-','07:14/17:43','07:19/18:49','07:31/19:34','06:56/17:30','07:19/16:47','-/-','-/-','07:30/17:03','07:35/17:00','07:09/17:04','07:08/17:02','07:01/16:49','-/-','-/-','07:05/18:37','07:35/17:07','07:35/17:36','07:17/16:31','07:06/16:41','-/-','-/-','07:07/17:29','07:12/17:00','07:24/19:08','07:12/16:36'] },
  { env:'PRESENSI_PDF_FIXTURE_B', split:'9 September 2026', wfa:true, expected:['08:05/16:49','08:15/18:46','07:43/16:26','-/-','-/-','08:08/17:17','08:05/19:10','07:51/17:32','07:59/20:08','07:18/16:32','-/-','-/-','07:24/18:14','07:58/17:53','08:16/17:15','08:07/17:00','07:59/17:34','-/-','-/-','08:07/17:11','08:07/16:55','07:59/17:18','07:52/16:53','08:04/17:30','-/-','-/-','08:17/17:22','08:08/17:27','08:13/16:55','08:05/16:45'] },
  { env:'PRESENSI_PDF_FIXTURE_C', split:'8 September 2026', expected:['07:52/16:30','08:17/16:51','08:00/16:42','-/-','-/-','08:03/20:04','07:52/16:58','07:57/16:47','07:54/16:31','07:54/16:43','-/-','-/-','08:01/17:07','08:02/16:43','08:00/16:32','08:00/17:35','07:57/17:03','-/-','-/-','08:05/17:09','07:59/17:27','08:16/17:07','07:55/16:31','08:07/16:39','-/-','-/-','08:04/17:39','07:53/16:37','07:54/16:52','07:57/16:54'] },
];
for (const runtime of ['installed','browser3']) for(const sample of suppliedPdfCases) test(`optional supplied multipage PDF ${sample.env} (${runtime}): all dates and punches match source`, {skip:!process.env[sample.env] || (runtime==='browser3'&&!process.env.PRESENSI_PDFJS3_DIR)},async()=>{
  const lib=runtime==='browser3'
    ? createRequire(import.meta.url)(process.env.PRESENSI_PDFJS3_DIR+'/pdf.cjs')
    : await import('pdfjs-dist/legacy/build/pdf.mjs');
  if(runtime==='browser3') {
    assert.equal(lib.version,'3.11.174');
    lib.GlobalWorkerOptions.workerSrc=process.env.PRESENSI_PDFJS3_DIR+'/pdf.worker.cjs';
    // Node's fake worker is global: isolate the v3 test from the previously loaded v6 worker.
    globalThis.pdfjsWorker=createRequire(import.meta.url)(lib.GlobalWorkerOptions.workerSrc);
  }
  const {getDocument}=lib;
  const loading=getDocument({data:new Uint8Array(fs.readFileSync(process.env[sample.env]))});
  const pdf=await loading.promise;
  try {
    const pages=[];for(let n=1;n<=pdf.numPages;n++)pages.push((await (await pdf.getPage(n)).getTextContent()).items);
    const {expected}=sample;
    assert.deepEqual(attendancePdfRows(pages).map(row=>`${row.datang}/${row.pulang}`),expected);
    for(const module of ['uang-makan','tukin']) {
      const result=await reader({},'','',pages)('attendance.pdf',module);
      assert.equal(result.rows.length,30);assert.equal(result.totalHariMasuk,sample.masuk ?? 22);
      assert.deepEqual(Array.from(result.rows,row=>row.tanggal),Array.from({length:30},(_,i)=>`${30-i} Sep 2026`));
      assert.deepEqual(Array.from(result.rows,row=>`${row.datang}/${row.pulang}`),expected);
      assert.equal(result.rows.filter(row=>row.keterangan==='Libur').length,8);
      assert.deepEqual(Array.from(result.pdfReadInfo.continuedDates),[sample.split]);
      if(sample.dinas) {
        assert.equal(result.rows.filter(row=>row.keterangan==='Dinas').length,2);
        assert.equal(result.rows[0].keterangan,'Dinas');assert.equal(result.rows[1].keterangan,'Dinas');
        assert.match(result.rows[0].lokasiDatangRaw,/95123, Indonesia$/);
        assert.equal(result.rows.find(row=>row.tanggal==='5 Sep 2026').keterangan,'Libur');
      }
      if(sample.wfa) {
        const wfa=result.rows.find(row=>row.tanggal==='18 Sep 2026');
        assert.equal(wfa.keterangan,'WFA');assert.match(wfa.lokasiDatangRaw,/sekitar Jembatan Kembar, Narogong, Bekasi, Jawa Barat, Jawa, 17175, Indonesia/);
      }
    }
  } finally {await loading.destroy();}
});
test('real Excel reader keeps departure-only attendance, 1-digit hours, sheet boundaries and skips header dates', async()=>{
  const parse=reader({One:[['Periode 1 Agustus 2026 s/d 31 Agustus 2026'],[],['No','Hari','Tanggal','Masuk','Keluar'],['1','Senin','2026-08-24','-','18:04',...Array(16).fill(''),'WFO']],Two:[['2','Jumat','2026-08-28','7:06','-']]});
  const result=await parse('sample.xlsx');
  assert.equal(result.rows.length,2);assert.equal(result.totalHariMasuk,2);
  assert.equal(result.rows[1].datang,'-');assert.equal(result.rows[1].pulang,'18:04');
  assert.equal(result.rows[0].datang,'07:06');assert.equal(result.rows[0].pulang,'-');
});

test('2027 national and collective holidays are Libur in Excel preview and excluded from working days',async()=>{
  const holidays=Array.from(holidayContext.holidays).filter(date=>date.startsWith('2027-'));
  assert.equal(holidays.length,26);
  const rows=holidays.map((date,i)=>[String(i+1),'',date,'-','-',...Array(16).fill(''),'WFO']);
  const result=await reader({One:rows})('holidays.xlsx');
  assert.equal(result.rows.length,26);
  assert.ok(result.rows.every(row=>row.keterangan==='Libur'));
  assert.equal(result.totalHariMasuk,0);
  assert.equal(holidayContext.workdays('2027-03-08','2027-03-15'),0);
  assert.equal(holidayContext.workdays('2027-03-08','2027-03-16'),1);
  assert.equal(holidayContext.workdays('2027-12-24','2027-12-27'),1);
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
