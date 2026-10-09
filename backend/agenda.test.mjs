import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Papa from 'papaparse';

const code = fs.readFileSync(new URL('./Code.gs', import.meta.url), 'utf8');
const header = ['HARI/ TANGGAL PELAKSANAAN','NOMOR AGENDA','ASAL SURAT','WAKTU','TEMPAT','AGENDA RAPAT','DISPO'];
const event = (id, title = 'Rapat Koordinasi', start = '2026-10-02T01:00:00Z') => ({id, summary:title, start:{dateTime:start}, end:{dateTime:'2026-10-02T03:00:00Z'}});
function fixture({pages, rows = [], csv, calendarError, sheetError, cacheError} = {}) {
  const calls = [], cache = new Map();
  const ctx = vm.createContext({
    Calendar:{Events:{list:(id, options) => { calls.push({id, options:{...options}}); if(calendarError)throw Error('SECRET provider error'); return (pages || [{items:[]}])[calls.length - 1]; }}},
    CacheService:{getScriptCache:() => ({get:key => cache.get(key), put:(key,value) => {if(cacheError)throw Error('cache full');cache.set(key,value);}})},
    UrlFetchApp:{fetch:url => {if(sheetError)throw Error('SECRET sheet error');assert.match(url,/gid=470452082/);return {getResponseCode:()=>200,getContentText:()=>csv ?? Papa.unparse([['Title'],[],header,...rows])};}},
    Utilities:{parseCsv:value => Papa.parse(value).data, formatDate:(date,zone,format) => {
      assert.equal(zone,'Asia/Jakarta');
      const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(x=>[x.type,x.value]));
      return format==='yyyy-MM-dd' ? `${parts.year}-${parts.month}-${parts.day}` : format==='dd/MM HH:mm' ? `${parts.day}/${parts.month} ${parts.hour}:${parts.minute}` : `${parts.hour}:${parts.minute}`;
    }},
    LockService:{getScriptLock:()=>({waitLock:()=>{throw Error('Read-only agenda acquired write lock');},hasLock:()=>false})},
    ContentService:{MimeType:{JSON:'application/json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})},
  });
  vm.runInContext(code,ctx);
  return {ctx,calls,cache};
}
test('published CSV columns A/D/E/F/G, merged dates, multiline text and exact title matching', () => {
  const {ctx}=fixture({rows:[
    ['Jumat, 02 Oktober 2026','1','','08.00 WIB s.d. selesai','Ruang A','Rapat Koordinasi','Rentek\nWilayah I'],
    ['','2','','09.00 WIB','','Kegiatan lain','Tata Usaha'],
    ['Senin, 05 Oktober 2026','1','','08.00 WIB','','Rapat Koordinasi','Wilayah III'],
    ['tanggal salah','2','','09.00','','Jangan diwarisi','Salah'],
  ]});
  const rows=ctx.agendaSheetRows_(ctx.UrlFetchApp.fetch('gid=470452082').getContentText());
  assert.equal(rows.length,3);
  assert.equal(rows[1].date,'2026-10-02');
  assert.equal(rows[0].time,'08:00');
  assert.equal(rows[0].timeLabel,'08.00 WIB s.d. selesai');
  assert.equal(ctx.agendaMatch_(event('1','RAPAT  Koordinasi!'),rows).disposition,'Rentek\nWilayah I');
  assert.equal(ctx.agendaMatch_(event('2','Kegiatan tidak ditemukan'),rows),null);
});
test('duplicates need unique clock match; no guessed disposition when ambiguous', () => {
  const {ctx}=fixture();
  const rows=ctx.agendaSheetRows_(Papa.unparse([header,
    ['02/10/2026','','','08.00','','Rapat Koordinasi','Rentek'],
    ['','','','09:00','','Rapat Koordinasi','TU'],
  ]));
  assert.equal(ctx.agendaMatch_(event('1'),rows).disposition,'Rentek');
  assert.equal(ctx.agendaMatch_(event('1','Rapat Koordinasi','2026-10-02T03:00:00Z'),rows),null);
  rows.push({...rows[0],disposition:'Ambigu'});
  assert.equal(ctx.agendaMatch_(event('1'),rows),null);
});
test('date boundaries validate leap year and reject impossible/untrusted dates', () => {
  const {ctx}=fixture();
  assert.equal(ctx.agendaSheetDate_('Kamis, 29 Februari 2024'),'2024-02-29');
  ['2026-02-29','2026-13-01','02/10/2026','2026-10-2','not a date'].forEach(date=>assert.throws(()=>ctx.dashboardAgenda_({date}),/Tanggal agenda/));
  assert.equal(ctx.agendaSheetDate_('29 Februari 2026'),'');
  assert.throws(()=>ctx.agendaSheetRows_('<html>Login</html>'),/CSV/);
  assert.throws(()=>ctx.agendaSheetRows_('A,B,C'),/Kolom/);
});
test('all Calendar pages fetched with WIB bounds, recurring expansion; cancelled and duplicated IDs omitted', () => {
  const {ctx,calls}=fixture({pages:[
    {accessRole:'owner',items:[{...event('1'),location:'Ruang A',attendees:[{email:'secret@example.test'}],description:'private raw field'}, {...event('deleted'),status:'cancelled'}], nextPageToken:'next'},
    {items:[event('1'),event('2','Rapat Lain')]},
  ]});
  const result=ctx.doPost({postData:{contents:JSON.stringify({action:'agenda_dashboard',date:'2026-10-02',calendarId:'attacker',url:'https://attacker.test'})}});
  assert.equal(result.status,'success');
  assert.equal(result.events.length,2);
  assert.equal(calls.length,2);
  assert.equal(calls[0].id,'tubangdespkp@gmail.com');
  assert.equal(calls[0].options.timeMin,'2026-10-02T00:00:00+07:00');
  assert.equal(calls[0].options.timeMax,'2026-10-03T00:00:00+07:00');
  assert.equal(calls[0].options.singleEvents,true);
  assert.equal(calls[1].options.pageToken,'next');
  assert.equal(result.events[0].time,'08:00 – 10:00 WIB');
  assert.doesNotMatch(JSON.stringify(result),/secret@example|private raw field|attacker/);
  ctx.dashboardAgenda_({date:'2026-10-02'});
  assert.equal(calls.length,2,'second read uses cache');
});
test('month/year rollover, all-day and spanning-midnight event time', () => {
  const {ctx,calls}=fixture({pages:[{items:[]}]});
  ctx.dashboardAgenda_({date:'2026-12-31'});
  assert.equal(calls[0].options.timeMax,'2027-01-01T00:00:00+07:00');
  assert.equal(ctx.agendaEventTime_({start:{date:'2026-10-01'},end:{date:'2026-10-04'}}),'Sepanjang hari');
  assert.equal(ctx.agendaEventTime_({...event('1','Rapat','2026-10-01T16:00:00Z'),end:{dateTime:'2026-10-01T18:00:00Z'}}),'01/10 23:00 – 02/10 01:00 WIB');
});
test('all attachments plus description links, deduped by Drive ID; no meetings or unsafe URLs', () => {
  const {ctx}=fixture();
  const files=ctx.agendaFiles_({
    attachments:[{fileUrl:'https://drive.google.com/file/d/fileOne/view?usp=sharing',title:'Undangan.pdf'}, {fileUrl:'javascript:alert(1)',title:'unsafe'}],
    description:'<a href="https://meet.google.com/abc">Meeting</a><br>Link Dokumen / Undangan:<br><a href="https://drive.google.com/open?id=fileOne">duplicate</a><br><a href="https://www.google.com/url?q=https%3A%2F%2Fdrive.google.com%2Ffile%2Fd%2FfileTwo%2Fview&amp;sa=D">Disposisi.pdf</a><br>https://example.test/third.pdf<br>https://example.test@attacker.test/file',
  });
  assert.equal(files.length,3);
  assert.equal(files[0].name,'Undangan.pdf');
  assert.equal(files[1].name,'Disposisi.pdf');
  assert.equal(files[2].url,'https://example.test/third.pdf');
  assert.equal(ctx.agendaFiles_({attachments:Array.from({length:30},(_,i)=>({fileUrl:`https://example.test/${i}.pdf`}))}).length,30);
  ['javascript:alert(1)','data:text/html,hello','//example.test','https://example.test\\@evil.test','https://www.google.com/url?q=javascript%3Aalert(1)'].forEach(url=>assert.equal(ctx.agendaSafeUrl_(url),''));
});
test('sheet errors retain agenda with explicit warning; Calendar failure never masquerades as zero events', () => {
  const {ctx}=fixture({pages:[{items:[event('1')]}],sheetError:true,cacheError:true});
  const result=ctx.dashboardAgenda_({date:'2026-10-02'});
  assert.equal(result.events.length,1);
  assert.match(result.warning,/spreadsheet belum dapat dimuat/);
  assert.doesNotMatch(JSON.stringify(result),/SECRET/);
  assert.throws(()=>fixture({calendarError:true}).ctx.dashboardAgenda_({date:'2026-10-02'}),/Calendar belum dapat dimuat/);
  assert.throws(()=>fixture({pages:[{accessRole:'freeBusyReader',items:[]}]}).ctx.dashboardAgenda_({date:'2026-10-02'}),/Calendar belum dapat dimuat/);
});
test('one matched event uses column G, missing G is blank, location fallback is only from matched row', () => {
  const {ctx}=fixture({pages:[{items:[event('1')]}],rows:[['02-10-2026','','','08.00 WIB','Ruang spreadsheet','Rapat Koordinasi','Rentek']]});
  const result=ctx.dashboardAgenda_({date:'2026-10-02'});
  assert.equal(result.events[0].disposition,'Rentek');
  assert.equal(result.events[0].location,'Ruang spreadsheet');
  assert.equal(result.events[0].time,'08.00 WIB');
  assert.equal(result.warning,'');
});

test('matched agenda preserves spreadsheet time wording, punctuation and line breaks', () => {
  for (const label of ['08.00 WIB - selesai','08.00 WIB s.d. selesai','08.00–09.45 WIB','08.00 WIB\n- selesai','Menyesuaikan']) {
    const {ctx,cache}=fixture({pages:[{items:[event('1')]}],rows:[['02/10/2026','','',label,'','Rapat Koordinasi','TU']]});
    cache.set('dashboard-agenda-v1:2026-10-02',JSON.stringify({events:[{time:'obsolete'}]}));
    assert.equal(ctx.dashboardAgenda_({date:'2026-10-02'}).events[0].time,label);
  }
});

test('blank, unmatched or ambiguous spreadsheet times fall back to Calendar; duplicate clock matching stays intact', () => {
  for (const rows of [
    [['02/10/2026','','','   ','','Rapat Koordinasi','TU']],
    [['02/10/2026','','','08.00 WIB - selesai','','Different title','TU']],
    [['02/10/2026','','','08.00 WIB - selesai','','Rapat Koordinasi','TU'],['','','','08.00 WIB - selesai','','Rapat Koordinasi','Rentek']],
  ]) {
    const {ctx}=fixture({pages:[{items:[event('1')]}],rows});
    assert.equal(ctx.dashboardAgenda_({date:'2026-10-02'}).events[0].time,'08:00 – 10:00 WIB');
  }
  const {ctx}=fixture({pages:[{items:[event('1')]}],csv:Papa.unparse([
    header.map((value,i)=>i===3?'Waktu Pelaksanaan':value),
    ['02/10/2026','','','08.00 WIB - selesai','','Rapat Koordinasi','TU'],
    ['','','','09.00 WIB - selesai','','Rapat Koordinasi','Rentek'],
  ])});
  assert.equal(ctx.dashboardAgenda_({date:'2026-10-02'}).events[0].time,'08.00 WIB - selesai');
});
