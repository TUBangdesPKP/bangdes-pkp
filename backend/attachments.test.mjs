import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { extractCutiPeriod } from '../src/document-parsers.js';

const sourceCode = fs.readFileSync(new URL('./Code.gs', import.meta.url), 'utf8');

function fixture() {
  const files = new Map(), folders = new Map(), books = new Map();
  const properties = new Map(), cache = new Map();
  let sequence = 0;
  const iterator = values => { let i = 0; return { hasNext: () => i < values.length, next: () => values[i++] }; };
  class Sheet {
    constructor(rows = []) { this.rows = rows.map(row => [...row]); this.id = ++sequence; this.backgrounds = []; }
    getSheetId() { return this.id; }
    getName() { return this.name || 'Rekap'; }
    setName(name) { if(this.book.sheets.has(name)&&this.book.sheets.get(name)!==this)throw Error('Duplicate sheet name');this.book.sheets.delete(this.name);this.name=name;this.book.sheets.set(name,this);return this; }
    hideSheet() { this.hidden = true; return this; }
    getMaxColumns() { return 1000; }
    insertColumnsAfter() { return this; }
    getDataRange() { return { getValues: () => this.rows.map(row => [...row]), getDisplayValues: () => this.rows.map(row => row.map(value => String(value ?? ''))) }; }
    getLastRow() { return this.rows.length; }
    getLastColumn() { return Math.max(1, ...this.rows.map(row => row.length)); }
    getMaxRows() { return Math.max(100, this.rows.length); }
    insertRowAfter() { return this; }
    insertRowsAfter() { return this; }
    appendRow(row) { this.rows.push([...row]); return this; }
    deleteRow(row) { this.rows.splice(row-1,1); return this; }
    setFrozenRows() { return this; }
    getRange(row, col, height = 1, width = 1) {
      const sheet = this;
      if (typeof row === 'string') {
        if (row === 'B:B') return { getValues: () => sheet.rows.map(item => [item[1] || '']) };
        const m = row.match(/^([A-Z]+)(\d+)/);
        row = Number(m?.[2] || 1); col = (m?.[1]?.charCodeAt(0) || 65) - 64;
      }
      const range = {
        getValues() { return Array.from({length:height}, (_,i) => Array.from({length:width}, (_,j) => sheet.rows[row-1+i]?.[col-1+j] ?? '')); },
        getDisplayValues() { return range.getValues().map(line => line.map(value => Object.prototype.toString.call(value) === '[object Date]' ? `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}` : String(value))); },
        getValue() { return range.getValues()[0][0]; },
        getFormulas() { return range.getValues().map(row => row.map(value => typeof value === 'string' && value.startsWith('=') ? value : '')); },
        getBackgrounds() { return Array.from({length:height}, (_,i) => Array.from({length:width}, (_,j) => sheet.cellBackgrounds?.[row-1+i]?.[col-1+j] || '#ffffff')); },
        getNumberFormats() { return Array.from({length:height}, () => Array(width).fill('General')); },
        setNumberFormats() { return range; },
        setNumberFormat() { return range; },
        setValues(values) { values.forEach((line, i) => line.forEach((value, j) => { sheet.rows[row - 1 + i] ||= []; sheet.rows[row - 1 + i][col - 1 + j] = value; })); return range; },
        setValue(value) { return range.setValues([[value]]); },
        setFontWeight() { return range; }, setBackground() { return range; }, setFontColor() { return range; }, setBackgrounds(values) { sheet.backgrounds = values; sheet.cellBackgrounds ||= []; values.forEach((line,i) => line.forEach((value,j) => { sheet.cellBackgrounds[row-1+i] ||= []; sheet.cellBackgrounds[row-1+i][col-1+j]=value; })); return range; }, sort() { return range; },
      };
      return range;
    }
  }
  class Book {
    constructor() { this.sheets = new Map(); }
    getSpreadsheetTimeZone() { return this.timeZone || 'Asia/Jakarta'; }
    getSheetByName(name) { return this.sheets.get(name) || null; }
    insertSheet(name) { const sheet = new Sheet(); sheet.name = name; sheet.book = this; this.sheets.set(name, sheet); return sheet; }
    getSheets() { return [...this.sheets.values()]; }
  }
  class File {
    constructor(id, name, parent, mime = 'application/pdf') { Object.assign(this, { id, name, parent, mime, trashed: false }); files.set(id, this); }
    getId() { return this.id; } getName() { return this.name; } getUrl() { return `https://drive.google.com/file/d/${this.id}/view`; }
    getMimeType() { return this.mime; } isTrashed() { return this.trashed; }
    getSize() { return this.size ?? Buffer.byteLength(this.content || 'PDF test'); }
    getLastUpdated() { return new Date(this.updated || '2026-10-10T00:00:00Z'); }
    getBlob() { return {getBytes:()=>Buffer.from(this.content || 'PDF test')}; }
    setContent(content) { this.content = content; return this; }
    setName(name) { this.name = name; return this; }
    getParents() { return iterator(this.parent ? [this.parent] : []); }
    setTrashed(value) { this.trashed = value; return this; } setSharing() { return this; }
    makeCopy(name, parent) {
      const copy = new File(`copy_document_${++sequence}`, name, parent, this.mime);
      if (this.mime === 'application/vnd.google-apps.spreadsheet') { const book = new Book(), original=books.get(this.id); if(original)original.getSheets().forEach(sheet=>{book.insertSheet(sheet.getName()).rows=sheet.rows.map(row=>[...row]);});else book.insertSheet('Rekap'); books.set(copy.id, book); }
      return copy;
    }
  }
  class Folder {
    constructor(id, name, parent) { Object.assign(this, { id, name, parent }); folders.set(id, this); }
    getId() { return this.id; } getUrl() { return `https://drive.google.com/drive/folders/${this.id}`; } isTrashed() { return false; }
    getName() { return this.name; }
    moveTo(parent) { this.parent=parent; return this; }
    getParents() { return iterator(this.parent ? [this.parent] : []); }
    getFoldersByName(name) { return iterator([...folders.values()].filter(f => f.parent === this && f.name === name)); }
    getFolders() { return iterator([...folders.values()].filter(f => f.parent === this)); }
    createFolder(name) { return new Folder(`folder_created_${++sequence}`, name, this); }
    getFiles() { return iterator([...files.values()].filter(f => f.parent === this && !f.trashed)); }
    getFilesByName(name) { return iterator([...files.values()].filter(f => f.parent === this && f.name === name && !f.trashed)); }
    createFile(blob) { const file = new File(`upload_document_${++sequence}`, blob.name, this, blob.mime); file.content = blob.data; return file; }
  }
  let locked = false;
  const context = vm.createContext({
    console, Logger: { log() {} },
    ContentService: { MimeType: { JSON: 'json', TEXT: 'text' }, createTextOutput: text => ({ setMimeType() { return this; }, getContent: () => text }) },
    LockService: { getScriptLock: () => ({ waitLock: () => { locked = true; }, hasLock: () => locked, releaseLock: () => { locked = false; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: key => properties.get(key) ?? null, setProperty(key,value) { properties.set(key,String(value)); return this; }, deleteProperty: key => properties.delete(key), getProperties: () => Object.fromEntries(properties) }) },
    CacheService: { getScriptCache: () => ({get:key=>cache.get(key)||null,put:(key,value)=>cache.set(key,value),remove:key=>cache.delete(key)}) },
    DriveApp: { getFolderById: id => { if (!folders.has(id)) throw Error('No folder'); return folders.get(id); }, getFileById: id => { if (!files.has(id)) throw Error('No file'); return files.get(id); }, Access: {}, Permission: {} },
    SpreadsheetApp: { flush() {}, openById: id => { if (!books.has(id)) throw Error('No spreadsheet'); return books.get(id); } },
    Utilities: { DigestAlgorithm: {SHA_256:'sha256'}, computeDigest: (algorithm, value) => [...crypto.createHash(algorithm).update(value).digest()], getUuid: () => `uuid_${++sequence}`, formatDate: (date, timeZone, format) => format === 'yyyy-MM-dd' ? new Intl.DateTimeFormat('en-CA', {timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date) : '19/09/2026 10:00:00', base64Encode: data => Buffer.from(data).toString('base64'), base64Decode: data => Buffer.from(data, 'base64'), newBlob: (data, mime, name) => ({ data, mime, name }) },
  });
  vm.runInContext(sourceCode, context);
  const master = new Book(); books.set(context.TARGET_SPREADSHEET_ID, master);
  const root = new Folder(context.ROOT_FOLDER_ID, 'root');
  const sptRoot = new Folder(context.SPT_FOLDER_ID, 'arsip-spt');
  const cutiRoot = new Folder(context.CUTI_FOLDER_ID, 'arsip-cuti');
  const destination = new Folder('submission_folder_123', 'Pegawai', root);
  const otherDestination = new Folder('other_employee_folder', 'Other', root);
  const spreadsheet = new File('presensi_spreadsheet_123', 'Rekap', destination, 'application/vnd.google-apps.spreadsheet');
  const recapBook = new Book(); books.set(spreadsheet.id, recapBook);
  const working = recapBook.insertSheet('Rekap');
  working.rows = Array.from({length:5}, () => []);
  for (let day = 4; day <= 9; day++) {
    const row = Array(22).fill(''); row[0] = day-3; row[1] = ['Sabtu','Minggu','Senin','Selasa','Rabu','Kamis'][day-4];
    row[2] = `2026-07-0${day}`; row[3]='08:10'; row[4]='17:00'; row[5]='=D6'; row[21]= day === 9 ? 'Libur' : 'WFO'; working.rows.push(row);
  }
  working.rows.push(['TOTAL']);
  const presensi = new File('presensi_document_123', 'Presensi.pdf', destination);
  const untouched = new File('other_existing_document', 'JanganDihapus.pdf', destination);
  new File(context.TEMPLATE_ID, 'Template', root, 'application/vnd.google-apps.spreadsheet');
  const period = '01-07-2026 s/d 31-07-2026';
  const scope = { modul: 'uang-makan', nip: '123456', nama: 'Pegawai Contoh', periode: period, bulanTahun: 'Juli 2026' };
  const rekap = master.insertSheet('REKAP_UANG_MAKAN');
  rekap.appendRow(['Timestamp', 'NIP', 'Nama', 'Periode', '', '', '', 'File', 'Folder', 'Sheet']);
  rekap.appendRow(['today', "'123456", scope.nama, period, '', '', '', presensi.getUrl(), destination.getUrl(), spreadsheet.id]);
  master.insertSheet('REKAP_TUKIN').rows = rekap.rows.map(row => [...row]);
  master.insertSheet('Data_Pegawai').rows = [['NIP','Nama','Nama_Folder'], ['123456',scope.nama,'Nama Khusus Pegawai']];
  const spt = new File('archive_spt_document_123', 'Surat Tugas.pdf', sptRoot);
  const cuti = new File('archive_cuti_document_123', 'Cuti.png', cutiRoot, 'image/png');
  for (const [type, file] of [['spt', spt], ['cuti', cuti]]) {
    master.insertSheet(type === 'spt' ? 'REKAP_SPT' : 'REKAP_CUTI').rows = [
      ['Timestamp','NIP','Nama','Tujuan','Mulai','Selesai','Hari','Bulan','Tahun','Link'],
      ['today', '123456', scope.nama, type === 'spt' ? 'Kota Serang' : 'Cuti Tahunan','6 Juli 2026','8 Juli 2026',3,'Juli','2026',file.getUrl()],
    ];
  }
  const rawCall = payload => JSON.parse(context.doPost({ postData: { contents: JSON.stringify({ ...scope, ...payload }) } }).getContent());
  // Existing calculation/write regressions run as an authorized administrator.
  // Permission tests use rawCall: never inject credentials for those requests.
  const call = payload => {
    const mutation = !payload.action || ['proses_bukti','simpan_rekap_final','klaim_dokumen','klaim_spt','klaim_cuti','upload_pendukung','upload_pendukung_lain','hapus_pendukung','hapus_klaim_spt','hapus_klaim_cuti'].includes(payload.action);
    if (!mutation || !['uang-makan','tukin'].includes(payload.modul || scope.modul) || 'sessionToken' in payload || 'adminKey' in payload) return rawCall(payload);
    const previous = properties.get('WRAP_ADMIN_KEY');
    properties.set('WRAP_ADMIN_KEY', wrapKey);
    try { return rawCall({ ...payload, adminKey: wrapKey }); }
    finally { if (previous === undefined) properties.delete('WRAP_ADMIN_KEY'); else properties.set('WRAP_ADMIN_KEY', previous); }
  };
  return { context, properties, master, files, folders, books, Book, File, destination, otherDestination, spreadsheet, presensi, untouched, spt, cuti, scope, call, rawCall, recapBook, working };
}

const wrapKey = 'local-test-key-only-1234567890';

function recapRequest(f) {
  f.properties.set('LEGACY_ADMIN_PIN','062419');
  const adminSessionToken=f.rawCall({action:'login_admin',pin:'062419'}).adminSessionToken;
  return {action:'buat_rekap_submisi',adminSessionToken,confirmed:true,expectedSubmittedCount:1};
}

function sessionClock(f) {
  let time=Date.parse('2026-10-10T00:00:00Z');
  f.context.Date=class extends Date { constructor(...args){super(...(args.length?args:[time]));} static now(){return time;} };
  return {advance:ms=>{time+=ms;},now:()=>time};
}

test('employee and legacy admin sessions survive cache eviction and active use beyond six hours; idle timeout is exactly six hours',()=>{
  for(const type of ['profile','admin']){
    const f=profileFixture(), clock=sessionClock(f), idle=6*60*60*1000;
    f.properties.set('LEGACY_ADMIN_PIN','062419');
    const login=f.rawCall(type==='profile'?{action:'login_pegawai',pin:'012345'}:{action:'login_admin',pin:'062419'});
    const token=login.sessionToken||login.adminSessionToken, auth=type==='profile'?{sessionToken:token}:{adminSessionToken:token};
    const key=f.context.activitySessionKey_(type,token), initial=JSON.parse(f.properties.get(key));
    assert.equal(initial.expires,clock.now()+idle);
    assert.equal(f.context.CacheService.getScriptCache().get((type==='profile'?'profile:':'admin-read:')+f.context.digest_(token)),null);
    const read=()=>type==='profile'?f.rawCall({...auth,action:'profil_saya'}):f.rawCall({...auth,action:'list_submisi_terhitung'});
    clock.advance(31*60000);assert.equal(read().status,'success');
    assert.equal(JSON.parse(f.properties.get(key)).expires,initial.expires); // Reads/polling do not renew.
    for(let hour=0;hour<8;hour++){
      clock.advance(60*60000);
      const result=f.rawCall({...auth,action:'aktivitas_sesi',activityAgeMs:0});
      assert.equal(result.status,'success',result.message);assert.equal(result.expiresAt,clock.now()+idle);
    }
    clock.advance(idle-1);assert.equal(read().status,'success');
    clock.advance(1);assert.equal(read().code,'SESSION_EXPIRED');
    assert.equal(f.rawCall({...auth,action:'aktivitas_sesi',activityAgeMs:0,expires:clock.now()+idle}).code,'SESSION_EXPIRED');
  }
});

test('session heartbeat uses actual last-activity age and logout/PIN changes revoke server access',()=>{
  const f=profileFixture(), clock=sessionClock(f), sessionToken=f.rawCall({action:'login_pegawai',pin:'012345'}).sessionToken;
  const auth={sessionToken}, key=f.context.activitySessionKey_('profile',sessionToken);
  clock.advance(60000);
  const renewed=f.rawCall({...auth,action:'aktivitas_sesi',activityAgeMs:15000});
  assert.equal(renewed.expiresAt,clock.now()-15000+6*60*60*1000);
  const before=f.properties.get(key);
  for(const activityAgeMs of [-1,'0',6*60*60*1000,null])assert.equal(f.rawCall({...auth,action:'aktivitas_sesi',activityAgeMs}).status,'error');
  assert.equal(f.properties.get(key),before);
  assert.equal(f.rawCall({...auth,action:'aktivitas_sesi',activityAgeMs:60000}).expiresAt,renewed.expiresAt); // Late heartbeat never shortens.
  assert.equal(f.rawCall({...auth,action:'keluar_sesi'}).status,'success');assert.equal(f.properties.has(key),false);
  assert.equal(f.rawCall({...auth,action:'profil_saya'}).code,'SESSION_EXPIRED');
  assert.equal(f.rawCall({...auth,action:'keluar_sesi'}).status,'success');
  const second=f.rawCall({action:'login_pegawai',pin:'012345'}).sessionToken;
  f.people.rows[1][4]='111111';
  assert.equal(f.rawCall({action:'aktivitas_sesi',sessionToken:second,activityAgeMs:0}).code,'SESSION_EXPIRED');
  assert.equal(f.rawCall({action:'aktivitas_sesi',sessionToken:'forged',activityAgeMs:0,role:'admin'}).code,'SESSION_EXPIRED');
});

test('login prunes expired durable sessions without clearing active sessions or unrelated properties',()=>{
  const f=profileFixture(), clock=sessionClock(f);
  f.properties.set('SETTING_KEEP','value');
  const first=f.rawCall({action:'login_pegawai',pin:'012345'}).sessionToken;
  clock.advance(6*60*60*1000);
  const second=f.rawCall({action:'login_pegawai',pin:'012345'}).sessionToken;
  assert.equal(f.properties.has(f.context.activitySessionKey_('profile',first)),false);
  assert.equal(f.rawCall({action:'profil_saya',sessionToken:second}).status,'success');
  assert.equal(f.properties.get('SETTING_KEEP'),'value');
});

function downloadFixture(modul='uang-makan',periode='01-07-2026 s/d 31-07-2026') {
  const f=fixture(), Folder=f.destination.constructor;
  f.scope.modul=modul;f.scope.periode=periode;
  const period=f.context.submissionPeriod_(f.scope), root=f.folders.get(f.context.ROOT_FOLDER_ID);
  const category=new Folder('download_category',modul==='tukin'?'BUKTI_TUNJANGAN_KINERJA':'BUKTI_UANG_MAKAN',root);
  const periodFolder=new Folder('download_period',(modul==='tukin'?'Tunjangan Kinerja':'Uang Makan')+'_'+String(period.month).padStart(2,'0')+'_'+period.monthName+(period.year===2026?'':'_'+period.year),category);
  const pns=new Folder('download_pns','PNS',periodFolder);f.destination.moveTo(pns);
  const {adminSessionToken}=recapRequest(f), exports=[];
  f.context.ScriptApp={getOAuthToken:()=> 'server-only-token'};
  f.context.UrlFetchApp={fetch:(url,options)=>{exports.push({url,options});return {getResponseCode:()=>200,getBlob:()=>({getBytes:()=>Buffer.from('PK spreadsheet export')})};}};
  return {...f,periodFolder,exports,request:{action:'daftar_unduhan_bukti',adminSessionToken}};
}

test('download traverses only the exact module/payment period, preserving employee folders and exporting Sheets', () => {
  for(const [modul,periode,label] of [['uang-makan','01-07-2026 s/d 31-07-2026','Uang Makan_Juli 2026'],['tukin','11-09-2026 s/d 10-10-2026','Tukin_November 2026'],['tukin','11-11-2026 s/d 10-12-2026','Tukin_Januari 2027']]) {
    const f=downloadFixture(modul,periode), before=[f.files.size,f.folders.size], result=f.rawCall({...f.request,folderId:f.context.ROOT_FOLDER_ID,bulanTahun:'SALAH'});
    assert.equal(result.status,'success',result.message);assert.equal(result.fileName,`Bukti Dukung ${label}.zip`);
    assert.equal(result.entries.length,3);assert.ok(result.entries.every(entry=>entry.path.includes('/PNS/Pegawai/')));
    assert.deepEqual([f.files.size,f.folders.size],before);
    assert.equal(f.rawCall(f.request).revision,result.revision);
    const sheet=result.entries.find(entry=>entry.fileId===f.spreadsheet.id);assert.match(sheet.path,/Rekap\.xlsx$/);
    const output=f.rawCall({...f.request,action:'unduh_berkas_bukti',fileId:sheet.fileId,version:sheet.version});
    assert.equal(output.status,'success',output.message);assert.equal(Buffer.from(output.base64,'base64').toString(),'PK spreadsheet export');
    assert.match(f.exports[0].url,/googleapis.com\/drive\/v3\/files\/presensi_spreadsheet_123\/export\?mimeType=/);
    assert.equal(f.exports[0].options.headers.Authorization,'Bearer server-only-token');assert.doesNotMatch(JSON.stringify(output),/server-only-token/);
    const pdf=result.entries.find(entry=>entry.fileId===f.presensi.id);
    assert.equal(f.rawCall({...f.request,action:'unduh_berkas_bukti',...pdf}).base64,Buffer.from('PDF test').toString('base64'));
    assert.deepEqual([f.files.size,f.folders.size],before);
  }
});

test('download requires a live admin session for every file and rejects cross-period IDs, stale files and shortcuts', () => {
  const f=downloadFixture(), manifest=f.rawCall(f.request), pdf=manifest.entries.find(entry=>entry.fileId===f.presensi.id);
  const get={...f.request,...pdf,action:'unduh_berkas_bukti'};
  assert.equal(f.rawCall({...f.request,adminSessionToken:undefined,role:'admin',adminKey:wrapKey}).status,'error');
  assert.equal(f.rawCall({...get,adminSessionToken:undefined}).status,'error');
  assert.equal(f.rawCall({...get,fileId:f.spt.id,version:f.context.evidenceFileVersion_(f.spt)}).status,'error');
  assert.equal(f.rawCall({...get,modul:'tukin'}).status,'error');
  assert.equal(f.rawCall({...get,periode:'01-08-2026 s/d 31-08-2026'}).status,'error');
  f.presensi.updated='2026-10-11T00:00:00Z';assert.match(f.rawCall(get).message,/berubah/);
  assert.notEqual(f.rawCall(f.request).revision,manifest.revision);
  f.presensi.parent=f.otherDestination;assert.match(f.rawCall({...get,version:f.context.evidenceFileVersion_(f.presensi)}).message,/bukan bagian/);
  const shortcut=new f.File('shortcut','Surat',f.destination,'application/vnd.google-apps.shortcut');
  assert.match(f.rawCall(f.request).message,/shortcut/);shortcut.trashed=true;
  f.properties.set('LEGACY_ADMIN_PIN','123456');assert.equal(f.rawCall(f.request).status,'error');assert.equal(f.rawCall(get).status,'error');
  const employee=profileFixture(), sessionToken=employee.rawCall({action:'login_pegawai',pin:'012345'}).sessionToken;
  for(const action of ['daftar_unduhan_bukti','unduh_berkas_bukti'])assert.match(employee.rawCall({action,sessionToken,role:'admin'}).message,/Hanya Admin/);
});

test('download reports empty, oversized, failed export and ambiguous folders without partial success or Drive writes', () => {
  const f=downloadFixture();
  const before=[f.files.size,f.folders.size];
  f.presensi.size=26*1024*1024;assert.match(f.rawCall(f.request).message,/batas aman/);delete f.presensi.size;
  const manifest=f.rawCall(f.request), sheet=manifest.entries.find(entry=>entry.fileId===f.spreadsheet.id);
  f.context.UrlFetchApp.fetch=()=>({getResponseCode:()=>403});
  assert.match(f.rawCall({...f.request,...sheet,action:'unduh_berkas_bukti'}).message,/Ekspor.*HTTP 403/);
  const Folder=f.destination.constructor;
  new Folder('ambiguous',f.periodFolder.name,f.periodFolder.parent);assert.match(f.rawCall(f.request).message,/ganda/);f.folders.delete('ambiguous');
  for(const file of f.files.values())if(file.parent===f.destination)file.trashed=true;
  assert.match(f.rawCall(f.request).message,/Belum ada file/);assert.deepEqual([f.files.size,f.folders.size],before);
  f.periodFolder.name='other-period';assert.match(f.rawCall(f.request).message,/Belum ada folder/);assert.deepEqual([f.files.size,f.folders.size],before);
});

test('ZIP paths sanitize special names and disambiguate duplicates, including native export extensions', () => {
  const f=downloadFixture();
  new f.File('duplicate_name','Rekap.xlsx',f.destination);
  new f.File('unsafe_name','../Surat: α.pdf',f.destination);
  new f.destination.constructor('empty_folder','Kosong',f.periodFolder);
  const response=f.rawCall(f.request);assert.equal(response.status,'success',response.message);
  assert.equal(new Set(response.entries.map(e=>e.path.toLowerCase())).size,response.entries.length);
  assert.ok(response.entries.some(e=>e.path.endsWith('/Rekap (2).xlsx')));
  assert.ok(response.directories.some(path=>path.endsWith('/Kosong/')));
  assert.ok(response.entries.every(e=>!e.path.split('/').includes('..')&&!e.path.includes(':')));
});

test('recap generation needs no publication password but requires admin, confirmation and current submitted count', () => {
  const f=consolidatedFixture(), payload=recapRequest(f), before=f.files.size;
  f.properties.delete('WRAP_ADMIN_KEY');
  for(const override of [{confirmed:false},{confirmed:undefined},{expectedSubmittedCount:2},{expectedSubmittedCount:'1'},{adminSessionToken:undefined,role:'admin',adminKey:wrapKey}]) {
    assert.equal(f.rawCall({...payload,...override}).status,'error');assert.equal(f.files.size,before);
  }
  const result=f.rawCall(payload);assert.equal(result.status,'success',result.message);assert.equal(result.employees,1);
  assert.equal(result.files.length,2);
  const employee=profileFixture(), sessionToken=employee.rawCall({action:'login_pegawai',pin:'012345'}).sessionToken;
  assert.match(employee.rawCall({...payload,adminSessionToken:undefined,sessionToken,role:'admin'}).message,/Hanya Admin/);
});

test('PDF references are stored in the exact employee folder and restored independently of the calculation sheet', () => {
  for (const modul of ['uang-makan','tukin']) {
    const f=fixture(); f.scope.modul=modul;
    let sheetData=fullJulyAttendance(f.working.rows.slice(5,-1));
    if(modul==='tukin') {
      f.scope.periode='11-06-2026 s/d 10-07-2026';
      f.master.getSheetByName('REKAP_TUKIN').rows[1][3]=f.scope.periode;
      sheetData=sheetData.slice(0,30).map((row,i)=>{const copy=[...row];copy[2]=new Date(Date.UTC(2026,5,11+i)).toISOString().slice(0,10);return copy;});
    }
    const referencePdf={fileName:'Referensi.PDF',fileBase64:Buffer.from('%PDF-1.7\nTest attendance\n%%EOF').toString('base64')};
    const result=f.call({sheetData,referencePdf});
    assert.equal(result.status,'success',result.message);
    const pdf=f.files.get(result.referenceDocument.fileId);
    assert.equal(pdf.mime,'application/pdf');assert.equal(pdf.parent.id,f.destination.id);assert.match(pdf.name,/^Presensi_.*\.pdf$/);
    assert.equal(Buffer.from(pdf.content).toString(),'%PDF-1.7\nTest attendance\n%%EOF');
    const record=f.context.submissionRecord_(f.scope);
    assert.equal(record.presensiId,pdf.id);assert.equal(record.spreadsheetId,result.spreadsheetId);assert.notEqual(record.presensiId,record.spreadsheetId);
    f.properties.set('LEGACY_ADMIN_PIN','062419');
    const adminSessionToken=f.rawCall({action:'login_admin',pin:'062419'}).adminSessionToken;
    const restored=f.rawCall({action:'presensi_tersimpan',adminSessionToken});
    assert.equal(restored.referenceDocument.fileId,pdf.id);assert.equal(restored.rows.length,sheetData.length);
    const replacement=f.call({sheetData,referencePdf});assert.equal(replacement.status,'success',replacement.message);
    assert.equal(pdf.trashed,false);assert.equal(f.presensi.trashed,false);assert.equal(f.untouched.trashed,false);
    assert.equal(f.rawCall({action:'presensi_tersimpan',adminSessionToken}).referenceDocument.fileId,replacement.referenceDocument.fileId);
    const latest=f.files.get(replacement.referenceDocument.fileId);
    latest.parent=f.otherDestination;
    assert.equal(f.rawCall({action:'presensi_tersimpan',adminSessionToken}).referenceDocument,null);
    latest.parent=f.destination;latest.trashed=true;
    assert.equal(f.rawCall({action:'presensi_tersimpan',adminSessionToken}).referenceDocument,null);
  }
});

test('PDF storage rejects malformed, non-PDF, oversized and unauthorized requests before creating files', () => {
  const f=fixture(), sheetData=fullJulyAttendance(f.working.rows.slice(5,-1));
  const count=f.files.size;
  for (const referencePdf of [{fileName:'test.xlsx',fileBase64:'JVBERi0='},{fileName:'test.pdf',fileBase64:'invalid!'}, {fileName:'test.pdf',fileBase64:Buffer.from('not a PDF').toString('base64')}, {fileName:'test.pdf',fileBase64:'A'.repeat(14*1024*1024+1)}]) {
    assert.equal(f.call({sheetData,referencePdf}).status,'error');assert.equal(f.files.size,count);assert.equal(f.spreadsheet.trashed,false);
  }
  assert.equal(f.rawCall({sheetData,referencePdf:{fileName:'test.pdf',fileBase64:'JVBERi0='}}).status,'error');
  assert.equal(f.files.size,count);
});

test('uncommitted PDF is cleaned up on master write failure, without deleting any previous document', () => {
  const f=fixture(), sheet=f.master.getSheetByName('REKAP_UANG_MAKAN'), original=sheet.getRange.bind(sheet), before=JSON.stringify(sheet.rows);
  sheet.getRange=(...args)=>{const range=original(...args);if(args[0]===2&&args[1]===1)range.setValues=()=>{throw Error('Write failed');};return range;};
  const result=f.call({sheetData:fullJulyAttendance(f.working.rows.slice(5,-1)),referencePdf:{fileName:'test.pdf',fileBase64:'JVBERi0='}});
  assert.equal(result.status,'error');assert.match(result.message,/Write failed/);
  const newPdf=[...f.files.values()].find(file=>file.id.startsWith('upload_document_'));
  assert.ok(newPdf);assert.equal(newPdf.trashed,true);assert.equal(f.presensi.trashed,false);assert.equal(f.spreadsheet.trashed,false);assert.equal(JSON.stringify(sheet.rows),before);
});

test('admin roster includes unsubmitted master employees, checks server role and reads latest period status', () => {
  const f=consolidatedFixture();
  f.properties.set('LEGACY_ADMIN_PIN','062419');
  const adminSessionToken=f.rawCall({action:'login_admin',pin:'062419'}).adminSessionToken;
  const people=f.master.getSheetByName('Data_Pegawai'), extra=[...people.rows[1]];
  extra[0]='222222';extra[1]='Adi PPPK';extra[7]='PPPK';people.rows.push(extra);
  const request={action:'list_pegawai_submisi',adminSessionToken};
  const before=JSON.stringify(people.rows), result=f.rawCall(request);
  assert.equal(result.status,'success',result.message);assert.equal(result.rosterVersion,1);
  assert.equal(result.employees.length,2);assert.equal(result.employees[0].nama,'Adi PPPK');assert.equal(result.employees[0].submitted,false);
  assert.equal(result.employees[1].submitted,true);assert.equal(JSON.stringify(people.rows),before);
  assert.equal(f.rawCall({...request,adminSessionToken:undefined,role:'admin',adminKey:wrapKey}).status,'error');
  const sheet=f.master.getSheetByName('REKAP_UANG_MAKAN'), latest=[...sheet.rows[1]];
  latest[sheet.rows[0].indexOf('Hitung_Status')]='Menunggu perhitungan ulang';sheet.rows.push(latest);
  assert.equal(f.rawCall(request).employees.find(row=>row.nip===f.scope.nip).submitted,false);
  assert.equal(f.rawCall({...request,periode:'01-08-2026 s/d 31-08-2026'}).employees.filter(row=>row.submitted).length,0);
  people.rows.push([...extra]);assert.match(f.rawCall(request).message,/NIP ganda/);
});

test('presensi restoration is read-only, exact-scope, restores baseline and requires an admin session', () => {
  const f=consolidatedFixture();f.properties.set('LEGACY_ADMIN_PIN','062419');
  const adminSessionToken=f.rawCall({action:'login_admin',pin:'062419'}).adminSessionToken;
  const request={action:'presensi_tersimpan',adminSessionToken};
  const before=JSON.stringify([...f.books].map(([id,book])=>[id,[...book.sheets].map(([name,sheet])=>[name,sheet.rows])]));
  const result=f.rawCall(request);assert.equal(result.status,'success',result.message);assert.equal(result.attendanceVersion,1);assert.equal(result.exists,true);
  assert.equal(result.rows.length,6);assert.equal(result.rows[0].tanggal,'2026-07-04');assert.equal(result.rows[0].datang,'08:10');
  assert.equal(f.rawCall({...request,nip:'999999'}).exists,false);
  assert.equal(f.rawCall({...request,periode:'01-08-2026 s/d 31-08-2026'}).exists,false);
  assert.equal(f.rawCall({...request,adminSessionToken:undefined,adminKey:wrapKey}).status,'error');
  assert.equal(JSON.stringify([...f.books].map(([id,book])=>[id,[...book.sheets].map(([name,sheet])=>[name,sheet.rows])])),before);
  const employee=profileFixture(), sessionToken=employee.rawCall({action:'login_pegawai',pin:'012345'}).sessionToken;
  for(const action of ['presensi_tersimpan','list_pegawai_submisi','validasi_kunci_rekap']) assert.equal(employee.rawCall({action,sessionToken,role:'admin',adminKey:wrapKey}).status,'error');
});

test('personal attendance reads the saved PDF and rows for only the authenticated NIP without modifying files or recaps',()=>{
  for(const modul of ['uang-makan','tukin']) for(const role of ['pegawai','Admin']) {
    const f=profileFixture();
    f.people.rows[0][3]='Role';f.people.rows[1][3]=role;
    if(modul==='tukin') {
      f.scope.periode='11-06-2026 s/d 10-07-2026';
      f.master.getSheetByName('REKAP_TUKIN').rows[1][3]=f.scope.periode;
    }
    const sessionToken=f.rawCall({action:'login_pegawai',pin:'012345'}).sessionToken;
    const request={action:'presensi_tersimpan',modul,periode:f.scope.periode,sessionToken,employeeReadOnly:true};
    const snapshot=()=>JSON.stringify({books:[...f.books].map(([id,book])=>[id,[...book.sheets].map(([name,sheet])=>[name,sheet.rows])]),files:[...f.files.values()].map(file=>[file.id,file.name,file.parent?.id,file.trashed])});
    const before=snapshot(), result=f.rawCall(request);
    assert.equal(result.status,'success',result.message);assert.equal(result.attendanceVersion,1);
    assert.equal(result.nip,'123456');assert.equal(result.modul,modul);assert.equal(result.exists,true);
    assert.equal(result.referenceDocument.fileId,f.presensi.id);assert.equal(result.rows.length,6);
    assert.equal(result.rows[0].tanggal,'2026-07-04');assert.equal(result.rows[0].datang,'08:10');
    assert.equal(f.rawCall({...request,nip:'654321',Role:'Admin'}).status,'error');
    assert.equal(f.rawCall({...request,sessionToken:'expired'}).status,'error');
    assert.equal(f.rawCall({...request,periode:modul==='tukin'?'11-07-2026 s/d 10-08-2026':'01-08-2026 s/d 31-08-2026'}).exists,false);
    for(const action of ['proses_bukti','simpan_rekap_final','upload_pendukung','hapus_pendukung','klaim_dokumen']) assert.equal(f.rawCall({...request,action}).status,'error');
    assert.equal(snapshot(),before);
    f.presensi.parent=f.otherDestination;
    assert.equal(f.rawCall(request).referenceDocument,null);
  }
});

test('recap key is verified on the server; tab 6 submit is revision-bound and later edits revoke the check', () => {
  const f=consolidatedFixture();f.properties.set('LEGACY_ADMIN_PIN','062419');
  const adminSessionToken=f.rawCall({action:'login_admin',pin:'062419'}).adminSessionToken;
  const auth={adminSessionToken,adminKey:wrapKey};
  assert.equal(f.rawCall({...auth,action:'validasi_kunci_rekap'}).verified,true);
  assert.equal(f.rawCall({...auth,action:'validasi_kunci_rekap',adminKey:'wrong'}).status,'error');
  assert.match(f.rawCall({...auth,action:'simpan_rekap_final',sixStep:true,revision:f.context.finalState_(f.scope).revision,confirmed:true}).message,/tepat 31 tanggal/);
  assert.equal(f.rawCall({...auth,sheetData:fullJulyAttendance(f.working.rows.slice(5,-1)),ringkasan:{}}).status,'success');
  assert.equal(f.rawCall({...auth,action:'proses_bukti'}).status,'success');
  const saved=f.rawCall({...auth,action:'simpan_rekap_final',sixStep:true,revision:f.context.finalState_(f.scope).revision,confirmed:true});
  assert.equal(saved.status,'success',saved.message);
  const roster=()=>f.rawCall({...auth,action:'list_pegawai_submisi'}).employees[0];
  assert.equal(roster().submitted,false);assert.equal(f.rawCall({...auth,action:'buat_rekap_submisi'}).status,'error');
  const payload={...auth,action:'submit_rekap_final',confirmed:true,revision:saved.revision};
  assert.equal(f.rawCall({...payload,revision:'stale'}).status,'error');
  assert.equal(f.rawCall({...payload,adminKey:undefined}).status,'error');
  // Approval freezes the reviewed amount, even if rates/summary cells changed
  // between the preview and the final Submit click.
  f.master.getSheetByName('Data_Pegawai').rows[1][19]=999999;
  const mealMaster=f.master.getSheetByName('REKAP_UANG_MAKAN');
  mealMaster.rows[1][mealMaster.rows[0].indexOf('Hitung_Netto')]=1;
  assert.equal(f.rawCall(payload).submitted,true);assert.equal(roster().submitted,true);
  assert.equal(mealMaster.rows[1][mealMaster.rows[0].indexOf('Hitung_Netto')],saved.calculation.amount.netto);
  assert.equal(mealMaster.rows[1][mealMaster.rows[0].indexOf('Hitung_Tarif')],saved.calculation.amount.tarif);
  assert.equal(f.rawCall(payload).submitted,true);
  assert.equal(f.rawCall({...auth,action:'klaim_spt',sourceUrl:f.spt.getUrl()}).status,'success');
  assert.equal(roster().submitted,false);assert.equal(f.rawCall(payload).status,'error');
});

test('server rejects missing, duplicate and outside dates before presensi writes', () => {
  const f=fixture(), rows=fullJulyAttendance(f.working.rows.slice(5,-1)), before=JSON.stringify(f.master.getSheetByName('REKAP_UANG_MAKAN').rows);
  for(const sheetData of [rows.slice(1),rows.filter((_,i)=>i!==14),[...rows,rows[0]],[rows[1],...rows.slice(1)],rows.map((row,i)=>i?row:row.map((v,col)=>col===2?'2026-08-01':v))]) {
    const result=f.call({sheetData});assert.equal(result.status,'error');assert.match(result.message,/tanggal|Tanggal/);
    assert.equal(JSON.stringify(f.master.getSheetByName('REKAP_UANG_MAKAN').rows),before);assert.equal(f.spreadsheet.trashed,false);
  }
  assert.doesNotThrow(()=>f.context.validateTab2Data_({...f.scope,sheetData:rows}));
});

function fullJulyAttendance(rows) {
  return Array.from({length:31}, (_, index) => {
    const date = `2026-07-${String(index+1).padStart(2,'0')}`;
    const original = rows.find(row => row[2] === date);
    if (original) return [...original];
    const row = Array(22).fill(''), day = new Date(date).getUTCDay();
    row[0]=index+1; row[1]=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'][day]; row[2]=date;
    row[3]='07:30'; row[4]='17:00'; row[21]=day===0||day===6?'Libur':'WFO';
    return row;
  });
}
test('employee annual cards expose only own saved net amounts, preserve zero and invalidate stale amounts', () => {
  const f = profileFixture(), sessionToken = f.rawCall({action:'login_pegawai', pin:'012345'}).sessionToken;
  const sheet = f.master.getSheetByName('REKAP_UANG_MAKAN');
  sheet.rows = [['Timestamp','NIP','Nama','Periode','Hitung_Status','Hitung_Netto'],
    ['', '123456', 'PRIVATE', '01-01-2026 s/d 31-01-2026', 'Lengkap', 925000],
    ['', '654321', 'OTHER PRIVATE', '01-02-2026 s/d 28-02-2026', 'Lengkap', 999999],
    ['', '123456', '', '01-03-2026 s/d 31-03-2026', 'Lengkap', 0],
    ['', '123456', '', '01-04-2026 s/d 30-04-2026', 'Lengkap', 37000],
    ['', '123456', '', '01-04-2026 s/d 30-04-2026', 'Menunggu perhitungan ulang', ''],
    ['', '123456', '', '01-05-2026 s/d 31-05-2026', 'Perlu penyesuaian', 12000],
    ['', '123456', '', '01-06-2026 s/d 30-06-2026', 'Lengkap', ''],
    ['', '123456', '', '01-07-2025 s/d 31-07-2025', 'Lengkap', 888888]];
  const request = {action:'rekap_pegawai_tahunan', sessionToken, year:2026};
  const before = JSON.stringify(sheet.rows), result = f.rawCall(request);
  assert.equal(result.status, 'success', result.message); assert.equal(result.months.length, 12);
  assert.deepEqual(result.months.slice(0,6), [
    {month:1,state:'saved',netto:925000}, {month:2,state:'missing',netto:null},
    {month:3,state:'saved',netto:0}, {month:4,state:'pending',netto:null},
    {month:5,state:'incomplete',netto:null}, {month:6,state:'incomplete',netto:null}]);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|999999|888888|654321/);
  assert.equal(JSON.stringify(sheet.rows), before);
  for (const extra of [{sessionToken:undefined},{sessionToken:'expired'},{nip:'654321'}, {year:2026.5}, {modul:'spt'}]) assert.equal(f.rawCall({...request,...extra}).status,'error');
  f.master.getSheetByName('REKAP_TUKIN').rows = [sheet.rows[0],
    ['', '123456', '', '11-09-2026 s/d 10-10-2026', 'Lengkap', 6349000],
    ['', '123456', '', '11-11-2026 s/d 10-12-2026', 'Lengkap', 6000000]];
  assert.equal(f.rawCall({...request,modul:'tukin'}).months[10].netto,6349000);
  assert.equal(f.rawCall({...request,modul:'tukin',year:2027}).months[0].netto,6000000);
});

test('attendance writes reject employees and anonymous callers even for open periods and forged admin roles', () => {
  const f = profileFixture(), sessionToken = f.rawCall({action:'login_pegawai',pin:'012345'}).sessionToken;
  const before = JSON.stringify(f.working.rows);
  for (const modul of ['uang-makan','tukin']) {
    for (const action of [undefined,'proses_bukti','simpan_rekap_final','klaim_dokumen','klaim_spt','klaim_cuti','upload_pendukung','upload_pendukung_lain','hapus_pendukung','hapus_klaim_spt','hapus_klaim_cuti']) {
      for (const auth of [{}, {sessionToken}, {sessionToken,Role:'Admin'}, {sessionToken,employeeReadOnly:true}]) {
        const result=f.rawCall({action,modul,...auth});
        assert.equal(result.status,'error',`${modul}:${action}`);
        assert.match(result.message,/Admin|WRAP_ADMIN_KEY|tidak mengizinkan/);
      }
    }
  }
  assert.equal(JSON.stringify(f.working.rows),before);
  assert.equal(f.rawCall({action:'list_pendukung',sessionToken,employeeReadOnly:true}).status,'success');
  assert.equal(f.rawCall({action:'list_pendukung',nip:'654321',sessionToken,employeeReadOnly:true}).status,'error');
});
test('personnel leave recap sums recorded days by NIP/type/year and never exposes letters or individual dates',()=>{
  const f=fixture(), sheet=f.master.getSheetByName('REKAP_CUTI');
  sheet.rows=[['Timestamp','NIP','Nama','Jenis Cuti','Tanggal Awal','Tanggal Akhir','Jumlah Hari Cuti','Bulan','Tahun','Link Arsip','Tanggal_1'],
    ['PRIVATE',"'199001012020011001",'PRIVATE NAME','Cuti Tahunan','PRIVATE START','PRIVATE END',3,'Oktober',2026,'PRIVATE URL','PRIVATE DATE'],
    ['','','','','','','','',''],
    ['', '199001012020011001','PRIVATE',' cuti  tahunan ','','','2 hari','',2026],
    ['', '199001012020011001','','Cuti Sakit','','','1,5','',2026],
    ['', '199001012020011001','','Cuti Tahunan','','',4,'',2025],
    ['', '199001012020011002','','Cuti Melahirkan','','',30,'',2026],
    ['', '199001012020011002','','Cuti Alasan Penting','','',2,'',2026]];
  const before=JSON.stringify(sheet.rows), result=f.call({action:'rekap_cuti_kepegawaian'});
  assert.equal(result.status,'success',result.message);assert.equal(result.leaveRecapVersion,1);
  assert.equal(result.totals.length,5);
  assert.deepEqual(result.totals.find(row=>row.type==='Cuti Tahunan'&&row.year===2026),{nip:'199001012020011001',type:'Cuti Tahunan',year:2026,days:5});
  assert.equal(result.totals.find(row=>row.type==='Cuti Sakit').days,1.5);
  assert.equal(result.totals.find(row=>row.type==='Cuti Karena Alasan Penting').days,2);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE|https:|Timestamp|Tanggal|Link Arsip/);
  assert.equal(JSON.stringify(sheet.rows),before);
});
test('personnel leave recap preserves unknown years, reports invalid data and never substitutes guessed date durations',()=>{
  const f=fixture(), sheet=f.master.getSheetByName('REKAP_CUTI');
  sheet.rows=[['Timestamp','NIP','Nama','Jenis Cuti','Tanggal Awal','Tanggal Akhir','Jumlah Hari Cuti','Bulan','Tahun'],
    ['', '199001012020011001','','Cuti Besar','2026-12-30','2027-01-03',3,'',2027],
    ['', '199001012020011001','','Cuti Tahunan','','',2,'',''],
    ['', '199001012020011001','','-','','',0,'',2026],
    ['', 'invalid','','Cuti Sakit','','',5,'',2026],
    ['', '199001012020011001','','Cuti Sakit','2026-01-01','2026-01-30','','',2026],
    ['', '199001012020011001','','Cuti Sakit','','',-2,'',2026]];
  const result=f.call({action:'rekap_cuti_kepegawaian'});
  assert.equal(result.status,'success',result.message);
  assert.deepEqual(result.warnings,{invalidRows:3,missingYears:1});
  assert.equal(result.totals.find(row=>row.type==='Cuti Besar').year,2027);
  assert.equal(result.totals.find(row=>row.type==='Cuti Tahunan').year,null);
  assert.equal(result.totals.find(row=>row.type==='Jenis belum diisi').days,0);
  sheet.rows=[sheet.rows[0]];
  assert.deepEqual(f.call({action:'rekap_cuti_kepegawaian'}).totals,[]);
  sheet.rows[0][6]='Unexpected';
  assert.equal(f.call({action:'rekap_cuti_kepegawaian'}).status,'error');
  f.master.sheets.delete('REKAP_CUTI');
  assert.equal(f.call({action:'rekap_cuti_kepegawaian'}).status,'error');
});

function jpFixture() {
  const f=profileFixture();
  f.people.rows[0][3]='Role';f.people.rows[1][3]='Admin';
  f.people.rows[1][0]='199001012020011001';f.people.rows[2][0]='199001012020011002';
  const book=new f.Book(), sheet=book.insertSheet('Backend');sheet.id=0;
  sheet.rows=[['Nama','Sertifikasi / Diklat','Tahun','Jumlah JP'],['Pegawai Pertama','Pelatihan A',2026,20],[],['Pegawai Kedua','Pelatihan B',2025,6],[],['Pegawai Ketiga','Pelatihan C',2026,'']];
  book.insertSheet('Data').rows=[['Ringkasan'],['=SUM(Backend!D:D)']];
  f.books.set(f.context.JP_SPREADSHEET_ID,book);
  const sessionToken=f.call({action:'login_pegawai',nip:f.people.rows[1][0],pin:'012345'}).sessionToken;
  return {...f,jpSheet:sheet,jpBook:book,sessionToken};
}
test('JP public reads only the approved detail columns and preserves actual row IDs',()=>{
  const f=jpFixture(), result=f.call({action:'list_pelatihan_jp'});
  assert.equal(result.status,'success',result.message);assert.equal(result.jpVersion,1);
  assert.deepEqual(result.training.map(row=>row.sourceRow),[2,4,6]);
  assert.equal(result.training[2].jp,null);assert.equal(result.training[0].jp,20);
  assert.ok(result.revision);assert.doesNotMatch(JSON.stringify(result),/012345|sessionToken|pinHash/);
  assert.equal(f.jpSheet.rows.length,6);
});
test('JP add uses master name and A:D, compacts gaps, escapes formulas and rejects replay',()=>{
  const f=jpFixture(), beforeMaster=JSON.stringify(f.people.rows), beforeSummary=JSON.stringify(f.jpBook.getSheetByName('Data').rows);
  const request={action:'tambah_pelatihan_jp',sessionToken:f.sessionToken,expectedRevision:f.call({action:'list_pelatihan_jp'}).revision,employeeNip:f.people.rows[2][0],nama:'Forged',title:'=HYPERLINK("https://invalid.test")',year:'2027',jp:'20,5'};
  const result=f.call(request);
  assert.equal(result.status,'success',result.message);assert.equal(f.jpSheet.rows.length,5);
  assert.deepEqual(f.jpSheet.rows[4],[f.people.rows[2][1], '\'=HYPERLINK("https://invalid.test")',2027,20.5]);
  assert.equal(JSON.stringify(f.people.rows),beforeMaster);assert.equal(JSON.stringify(f.jpBook.getSheetByName('Data').rows),beforeSummary);
  assert.match(f.call(request).message,/telah berubah/);assert.equal(f.jpSheet.rows.length,5);
});
test('JP rejects guest, employee, legacy admin-read, forged role and revoked/expired sessions',()=>{
  const f=jpFixture(), initial=JSON.stringify(f.jpSheet.rows), revision=f.call({action:'list_pelatihan_jp'}).revision;
  const employee=f.call({action:'login_pegawai',nip:f.people.rows[2][0],pin:'654321'}).sessionToken;
  f.properties.set('LEGACY_ADMIN_PIN','112233');
  const legacy=f.call({action:'login_admin',pin:'112233'}).adminSessionToken;
  const body={employeeNip:f.people.rows[2][0],title:'Test',year:2026,jp:20,sourceRow:2,expectedRevision:revision};
  for(const auth of [{},{sessionToken:employee,Role:'Admin'},{adminSessionToken:legacy},{adminKey:wrapKey},{sessionToken:'expired'}]) {
    for(const action of ['tambah_pelatihan_jp','hapus_pelatihan_jp'])assert.equal(f.call({...body,action,...auth}).status,'error');
  }
  f.people.rows[1][3]='pegawai';
  assert.match(f.call({...body,action:'hapus_pelatihan_jp',sessionToken:f.sessionToken}).message,/Role Admin/);
  f.people.rows[1][3]='Admin';f.people.rows[1][4]='999999';
  assert.equal(f.call({...body,action:'hapus_pelatihan_jp',sessionToken:f.sessionToken}).status,'error');
  assert.equal(JSON.stringify(f.jpSheet.rows),initial);
});
test('JP validates each input and mismatched headers before any write',()=>{
  const f=jpFixture(), revision=f.call({action:'list_pelatihan_jp'}).revision, before=JSON.stringify(f.jpSheet.rows);
  const request={action:'tambah_pelatihan_jp',sessionToken:f.sessionToken,expectedRevision:revision,employeeNip:f.people.rows[2][0],title:'Valid',year:2026,jp:20};
  for(const invalid of [{employeeNip:'unknown'},{title:''},{year:'26'},{year:2026.5},{jp:''},{jp:-1},{jp:'Infinity'},{jp:'1.2345'},{expectedRevision:''}])assert.equal(f.call({...request,...invalid}).status,'error',JSON.stringify(invalid));
  assert.equal(JSON.stringify(f.jpSheet.rows),before);
  f.jpSheet.rows[0][3]='';f.jpSheet.rows[0][4]='Jumlah JP';
  assert.match(f.call(request).message,/kolom A:D/);
  assert.equal(f.jpSheet.rows.length,6);
});
test('JP delete backs up selected row and closes all blank gaps without touching other training or summary',()=>{
  const f=jpFixture(), snapshot=f.call({action:'list_pelatihan_jp'}), original=[...f.jpSheet.rows[3]], summary=JSON.stringify(f.jpBook.getSheetByName('Data').rows);
  const request={action:'hapus_pelatihan_jp',sessionToken:f.sessionToken,sourceRow:4,expectedRevision:snapshot.revision};
  const result=f.call(request);assert.equal(result.status,'success',result.message);
  assert.deepEqual(f.jpSheet.rows,[['Nama','Sertifikasi / Diklat','Tahun','Jumlah JP'],['Pegawai Pertama','Pelatihan A',2026,20],['Pegawai Ketiga','Pelatihan C',2026,'']]);
  assert.equal(JSON.stringify(f.jpBook.getSheetByName('Data').rows),summary);
  const backup=f.master.getSheetByName('JP_PELATIHAN_TERHAPUS');assert.equal(backup.hidden,true);
  assert.deepEqual(JSON.parse(backup.rows[1][4]),original);assert.equal(backup.rows[1][2],4);
  assert.match(f.call(request).message,/telah berubah/);
  assert.equal(f.jpSheet.rows.length,3);
});
test('JP rejects stale deletes after external edits, invalid rows and failed backups',()=>{
  const f=jpFixture(), revision=f.call({action:'list_pelatihan_jp'}).revision;
  const request={action:'hapus_pelatihan_jp',sessionToken:f.sessionToken,expectedRevision:revision,sourceRow:2};
  for(const sourceRow of [1,3,99,2.2])assert.equal(f.call({...request,sourceRow}).status,'error');
  f.jpSheet.rows[1][1]='Edited';
  assert.match(f.call(request).message,/telah berubah/);
  const latest=f.call({action:'list_pelatihan_jp'}).revision, before=JSON.stringify(f.jpSheet.rows);
  const backup=f.master.insertSheet('JP_PELATIHAN_TERHAPUS');backup.getRange=()=>({setValues(){throw Error('Backup unavailable');}});
  assert.equal(f.call({...request,expectedRevision:latest}).status,'error');
  assert.equal(JSON.stringify(f.jpSheet.rows),before);
});

test('period status persists centrally, requires admin, rejects stale updates and isolates module/year', () => {
  const f=fixture();f.properties.set('WRAP_ADMIN_KEY',wrapKey);
  const read=(modul,year)=>f.call({action:'list_periode_submisi',modul,year});
  assert.equal(read('uang-makan',2027).periods.every(p=>p.status==='DITUTUP'),true);
  const command={action:'set_periode_submisi',modul:'uang-makan',year:2027,month:2,periodStatus:'DIBUKA',expectedStatus:'DITUTUP'};
  assert.equal(f.call(command).status,'error');
  assert.equal(f.call({...command,adminKey:wrapKey}).status,'success');
  assert.equal(read('uang-makan',2027).periods[1].status,'DIBUKA');
  assert.equal(read('tukin',2027).periods[1].status,'DITUTUP');
  assert.equal(read('uang-makan',2028).periods[1].status,'DITUTUP');
  assert.match(f.call({...command,adminKey:wrapKey}).message,/sudah berubah/);
  assert.equal(f.call({...command,adminKey:wrapKey,expectedStatus:'DIBUKA',periodStatus:'DITUTUP'}).status,'success');
  assert.equal(read('uang-makan',2027).periods[1].status,'DITUTUP');
  assert.equal(read('spt',2027).status,'error');assert.equal(read('uang-makan',2027.5).status,'error');
  assert.equal(f.call({...command,adminKey:wrapKey,month:13}).status,'error');
});
test('legacy closed flags do not block verified admins, while anonymous writes remain denied',()=>{
  const f=fixture();payrollFixture(f);assert.equal(confirmRecap(f).status,'success');
  f.properties.set('SUBMISI_STATUS_uang-makan_2026_07','DITUTUP');
  const before=JSON.stringify(f.working.rows),count=f.files.size;
  for(const action of [undefined,'proses_bukti','simpan_rekap_final','klaim_dokumen','klaim_spt','klaim_cuti','upload_pendukung','upload_pendukung_lain','hapus_pendukung','hapus_klaim_spt','hapus_klaim_cuti'])assert.equal(f.rawCall({action}).status,'error');
  assert.equal(JSON.stringify(f.working.rows),before);assert.equal(f.files.size,count);
  assert.equal(f.call({action:'preview_rekap_final'}).status,'success');
  assert.equal(f.call({action:'list_pendukung'}).status,'success');
  assert.equal(confirmRecap(f).status,'success');
});
test('server gates Tukin by payment month across year boundary, not attendance month',()=>{
  const f=fixture(),payload={modul:'tukin',periode:'11-11-2026 s/d 10-12-2026'};
  assert.throws(()=>f.context.requireOpenSubmission_(payload),/ditutup/);
  f.properties.set('SUBMISI_STATUS_tukin_2027_01','DIBUKA');
  assert.doesNotThrow(()=>f.context.requireOpenSubmission_(payload));
  assert.throws(()=>f.context.requireOpenSubmission_({...payload,periode:'11-12-2026 s/d 10-01-2027'}),/ditutup/);
});

test('closed meal and tukin views reuse stored results without recalculating or writing',()=>{
  for (const modul of ['uang-makan','tukin']) {
    const f=fixture();payrollFixture(f);
    const saved=confirmRecap(f,{}, {modul});
    assert.equal(saved.status,'success');
    // Fixture July meal / July-attendance Tukin have different payment months.
    for(let month=1;month<=12;month++)f.properties.set(`SUBMISI_STATUS_${modul}_2026_${String(month).padStart(2,'0')}`,'DITUTUP');
    const snapshot=()=>JSON.stringify({books:[...f.books].map(([id,book])=>[id,[...book.sheets].map(([name,sheet])=>[name,sheet.rows])]),files:[...f.files.keys()]});
    const before=snapshot();
    for(let repeat=0;repeat<2;repeat++) {
      const docs=f.call({action:'list_pendukung',modul});
      assert.equal(docs.status,'success');assert.equal(docs.processed,true);
      assert.deepEqual(docs.savedResult.calculation,saved.calculation);
      assert.equal(docs.savedResult.nip,f.scope.nip);
      assert.equal(f.call({action:'preview_rekap_final',modul}).status,'success');
    }
    for (const absent of [{nip:'OTHER',nama:f.scope.nama},{periode:'01-01-2027 s/d 31-01-2027'}]) {
      const empty=f.call({action:'list_pendukung',modul,...absent});
      assert.equal(empty.status,'success');assert.equal(empty.requiresTab2,true);
      assert.deepEqual(empty.documents,[]);assert.equal(empty.savedResult,undefined);
    }
    for(const action of ['proses_bukti','simpan_rekap_final','upload_pendukung_lain','hapus_pendukung'])assert.equal(f.rawCall({action,modul}).status,'error');
    assert.equal(snapshot(),before);
  }
});
test('period status cannot be changed by a forged admin role from employee session',()=>{
  const f=profileFixture(),session=f.call({action:'login_pegawai',pin:'012345'});
  const command={action:'set_periode_submisi',year:2027,month:1,periodStatus:'DIBUKA',expectedStatus:'DITUTUP',sessionToken:session.sessionToken,role:'admin'};
  assert.match(f.call(command).message,/Hanya Admin/);
  f.master.getSheetByName('Data_Pegawai').rows[0][3]='Role';
  f.master.getSheetByName('Data_Pegawai').rows[1][3]='Admin';
  assert.equal(f.call(command).status,'success');
});
test('published leaders retain the job title from the employee master, not browser data', () => {
  const f=fixture();payrollFixture(f);confirmRecap(f);
  const people=f.master.getSheetByName('Data_Pegawai');
  const column=people.rows[0].indexOf('Jabatan');
  assert.ok(column>=0);people.rows[1][column]='Penata Kelola Perumahan Ahli Pertama';
  publishWrap(f);
  const result=f.call({action:'rekap_bulanan_publik'});
  assert.equal(result.employees[0].jabatan,'Penata Kelola Perumahan Ahli Pertama');
  people.rows[1][column]='Perubahan belum diproses';
  assert.equal(f.call({action:'rekap_bulanan_publik'}).employees[0].jabatan,result.employees[0].jabatan);
});
test('column M Jabatan is authoritative over duplicate headers and persists through publication', () => {
  const f=fixture();payrollFixture(f);confirmRecap(f);
  const people=f.master.getSheetByName('Data_Pegawai');
  people.rows[0][12]='Jabatan';people.rows[1][12]='Jabatan Resmi Kolom M';
  publishWrap(f);
  assert.equal(f.call({action:'rekap_bulanan_publik'}).employees[0].jabatan,'Jabatan Resmi Kolom M');
});
function profileFixture() {
  const f=fixture(), sheet=f.master.getSheetByName('Data_Pegawai');
  sheet.rows=[Array(44).fill(''),Array(44).fill(''),Array(44).fill('')];
  ['NIP','Nama','Jabatan','SubUnitKerja','PIN'].forEach((key,i)=>sheet.rows[0][i]=key);
  sheet.rows[0][43]='Foto_Pegawai';
  sheet.rows[1].splice(0,5,'123456','Pegawai Uji','Analis','Unit Uji','012345');
  sheet.rows[2].splice(0,5,'654321','Pegawai Lain','Analis','Unit Lain','654321');
  const folder=f.destination.constructor;
  new folder(f.context.PROFILE_PHOTO_FOLDER_ID,'Foto Profil');
  return {...f,people:sheet};
}

test('admin leave management lists every employee while personal summary and ordinary accounts remain NIP-scoped',()=>{
  const f=profileFixture(), sheet=f.master.getSheetByName('REKAP_CUTI');
  f.people.rows[0][3]='Role';f.people.rows[1][3]='Admin';
  const other=[...sheet.rows[1]];other[1]='654321';other[2]='Pegawai Lain';sheet.rows.push(other);
  const admin=f.rawCall({action:'login_pegawai',pin:'012345'}).sessionToken;
  const employee=f.rawCall({action:'login_pegawai',nip:'654321',pin:'654321'}).sessionToken;
  const request={action:'list_arsip',modul:'cuti',sessionToken:admin};
  const all=f.rawCall(request);assert.equal(all.status,'success',all.message);assert.equal(all.canDeleteAll,true);
  assert.deepEqual(all.items.map(item=>item.nip),['123456','654321']);assert.ok(all.items.every(item=>item.canDelete));
  const personal=f.rawCall({...request,scope:'pribadi'});assert.deepEqual(personal.items.map(item=>item.nip),['123456']);
  const ordinary=f.rawCall({...request,sessionToken:employee,Role:'Admin'});assert.deepEqual(ordinary.items.map(item=>item.nip),['654321']);assert.equal(ordinary.canDeleteAll,false);
  const deleted=f.rawCall({...request,action:'hapus_arsip',archiveIds:[all.items[1].archiveId]});assert.equal(deleted.status,'success',deleted.message);
  assert.equal(deleted.items.length,1);assert.equal(deleted.items[0].nip,'123456');assert.equal(f.cuti.trashed,false);
});

test('admin personal leave lists only authenticated NIP and never expands after deleting',()=>{
  const f=profileFixture(),sheet=f.master.getSheetByName('REKAP_CUTI');
  f.people.rows[0][3]='Role';f.people.rows[1][3]='Admin';
  const other=[...sheet.rows[1]];other[1]='654321';other[2]=sheet.rows[1][2];sheet.rows.push(other);
  const sessionToken=f.call({action:'login_pegawai',pin:'012345'}).sessionToken;
  const auth={modul:'cuti',scope:'pribadi',sessionToken};
  const list=f.call({...auth,action:'list_arsip',nip:'654321'});
  assert.equal(list.status,'success');assert.equal(list.items.length,1);assert.equal(list.items[0].nip,'123456');assert.equal(list.canDeleteAll,false);
  const foreign=f.context.managedArchiveId_('cuti',3,sheet.rows[2].map(String));
  assert.equal(f.call({...auth,action:'hapus_arsip',archiveIds:[foreign]}).status,'error');
  const deleted=f.call({...auth,action:'hapus_arsip',archiveIds:[list.items[0].archiveId]});
  assert.equal(deleted.status,'success');assert.equal(deleted.items.length,0);assert.equal(sheet.rows[1][1],'654321');
  assert.equal(f.call({...auth,scope:undefined,action:'list_arsip'}).items.length,1);
  assert.equal(f.rawCall({action:'list_arsip',modul:'cuti',scope:'pribadi',adminKey:wrapKey}).status,'error');
});

for (const modul of ['cuti']) {
  test(`archive ${modul}: employee deletes only own row, preserving shared file and another employee`, () => {
    const f=profileFixture(), sheet=f.master.getSheetByName(modul==='spt'?'REKAP_SPT':'REKAP_CUTI');
    const other=[...sheet.rows[1]];other[1]='654321';other[2]='Pegawai Lain';sheet.rows.push(other);
    const sessionToken=f.call({action:'login_pegawai',pin:'012345'}).sessionToken;
    const auth={modul,sessionToken};
    const list=f.call({...auth,action:'list_arsip',nip:'654321',Role:'Admin'});
    assert.equal(list.status,'success');assert.equal(list.items.length,1);assert.equal(list.canDeleteAll,false);
    const foreign=f.context.managedArchiveId_(modul,3,sheet.rows[2].map(String));
    const own=list.items[0].archiveId;
    assert.match(f.call({...auth,action:'hapus_arsip',archiveIds:[own,foreign],Role:'Admin'}).message,/miliknya sendiri/);
    assert.equal(sheet.rows.length,3);assert.equal(f.master.getSheetByName('ARSIP_TERHAPUS'),null);
    const result=f.call({...auth,action:'hapus_arsip',archiveIds:[own]});
    assert.equal(result.status,'success',result.message);assert.equal(result.deleted,1);assert.equal(result.items.length,0);
    assert.deepEqual(sheet.rows[1],other);assert.equal(sheet.rows.length,2);
    assert.equal((modul==='spt'?f.spt:f.cuti).trashed,false);
    const backup=f.master.getSheetByName('ARSIP_TERHAPUS');assert.equal(backup.rows.length,2);assert.equal(backup.hidden,true);
    assert.equal(JSON.parse(backup.rows[1][6]).source[1],'123456');
    assert.equal(f.call({...auth,action:'hapus_arsip',archiveIds:[own]}).status,'error');
  });
  test(`archive ${modul}: NIP Admin can delete selected letter for all participants`, () => {
    const f=profileFixture(), sheet=f.master.getSheetByName(modul==='spt'?'REKAP_SPT':'REKAP_CUTI');
    f.people.rows[0][3]='Role';f.people.rows[1][3]='Admin';
    const other=[...sheet.rows[1]];other[1]='654321';sheet.rows.push(other);
    const sessionToken=f.call({action:'login_pegawai',pin:'012345'}).sessionToken;
    const auth={modul,sessionToken};const list=f.call({...auth,action:'list_arsip'});
    assert.equal(list.canDeleteAll,true);assert.equal(list.items.length,2);
    const result=f.call({...auth,action:'hapus_arsip',archiveIds:list.items.map(i=>i.archiveId)});
    assert.equal(result.status,'success',result.message);assert.equal(result.deleted,2);assert.equal(sheet.rows.length,1);
    assert.equal(f.master.getSheetByName(modul==='spt'?'REKAP_CUTI':'REKAP_SPT').rows.length,2);
  });
}

test('archive deletion denies missing/expired credentials, spoofed admin, stale rows and invalid targets',()=>{
  const f=profileFixture(), sheet=f.master.getSheetByName('REKAP_SPT');f.properties.set('WRAP_ADMIN_KEY',wrapKey);
  const list=f.call({action:'list_arsip',modul:'spt',adminKey:wrapKey});assert.equal(list.status,'success');
  const command={action:'hapus_arsip',modul:'spt',archiveIds:[list.items[0].archiveId]};
  for (const extra of [{},{Role:'Admin'},{sessionToken:'expired',adminKey:wrapKey},{adminKey:'incorrect'},{modul:'uang-makan',adminKey:wrapKey}]) assert.equal(f.call({...command,...extra}).status,'error');
  const sessionToken=f.call({action:'login_pegawai',pin:'012345'}).sessionToken;
  assert.equal(f.call({action:'list_arsip',modul:'spt',sessionToken,adminKey:wrapKey}).canDeleteAll,false);
  for (const archiveIds of [[],[command.archiveIds[0],command.archiveIds[0]],['1:fake'],['not-a-row']]) assert.equal(f.call({...command,adminKey:wrapKey,archiveIds}).status,'error');
  sheet.rows[1][3]='Changed';
  assert.match(f.call({...command,adminKey:wrapKey}).message,/sudah berubah/);assert.equal(sheet.rows.length,2);
  assert.equal(f.master.getSheetByName('ARSIP_TERHAPUS'),null);
});

test('archive deletion requires verified backup before removing any row',()=>{
  const f=profileFixture();f.properties.set('WRAP_ADMIN_KEY',wrapKey);
  f.context.recordArchiveUploader_(f.spt.id,'Admin');
  const history=f.master.insertSheet('ARSIP_TERHAPUS');history.appendRow(['header']);
  history.getRange=()=>({setNumberFormat(){return this;},setValues(){throw Error('Backup write failed');}});
  const list=f.call({action:'list_arsip',modul:'spt',adminKey:wrapKey});
  assert.match(f.call({action:'hapus_arsip',modul:'spt',adminKey:wrapKey,archiveIds:[list.items[0].archiveId]}).message,/Backup write failed/);
  assert.equal(f.master.getSheetByName('REKAP_SPT').rows.length,2);
});

test('deleted archive keeps existing claim calculation unchanged but rejects new claims',()=>{
  for(const modul of ['spt','cuti']) {
    const f=profileFixture();f.properties.set('WRAP_ADMIN_KEY',wrapKey);
    if(modul==='spt')f.context.recordArchiveUploader_(f.spt.id,'Admin');
    const file=modul==='spt'?f.spt:f.cuti;
    const claim=f.call({action:'klaim_dokumen',jenisDokumen:modul,sourceUrl:file.getUrl()});
    assert.equal(claim.status,'success',claim.message);
    const before=f.context.finalState_(f.scope);const values=JSON.stringify(f.working.rows);
    const list=f.call({action:'list_arsip',modul,adminKey:wrapKey});
    const deleted=f.call({action:'hapus_arsip',modul,adminKey:wrapKey,archiveIds:[list.items[0].archiveId]});
    assert.equal(deleted.status,'success',deleted.message);
    const after=f.context.finalState_(f.scope);
    assert.equal(JSON.stringify(after.rows),JSON.stringify(before.rows));assert.equal(after.revision,before.revision);
    assert.equal(JSON.stringify(f.working.rows),values);assert.equal(file.trashed,false);
    assert.equal(f.call({action:'klaim_dokumen',jenisDokumen:modul,sourceUrl:file.getUrl()}).status,'error');
  }
});

test('SPT deletion supports legacy sheet and invalid dates; admin role alone never grants ownership',()=>{
  const f=profileFixture(), sheet=f.master.getSheetByName('REKAP_SPT');sheet.setName('REKAP _SPT');
  const other=[...sheet.rows[1]];other[1]='654321';other[4]='Tanggal salah';sheet.rows.push(other);
  f.people.rows[0][3]='Role';f.people.rows[1][3]='Admin';
  const sessionToken=f.call({action:'login_pegawai',pin:'012345'}).sessionToken;
  const auth={modul:'spt',sessionToken};const items=f.call({...auth,action:'list_arsip'}).items;
  f.people.rows[1][3]='pegawai';
  assert.match(f.call({...auth,action:'hapus_arsip',archiveIds:[items[1].archiveId]}).message,/pengunggah/);
  f.people.rows[1][3]='Admin';
  assert.match(f.call({...auth,action:'hapus_arsip',archiveIds:[items[1].archiveId]}).message,/pengunggah/);
  f.context.recordArchiveUploader_(f.spt.id,'123456');
  assert.equal(f.call({...auth,action:'hapus_arsip',archiveIds:[items[1].archiveId]}).status,'success');
  assert.equal(sheet.rows.length,2);
});

test('SPT lists everyone for any authenticated role, but only verified file uploader can delete even with forged role/NIP',()=>{
  const f=profileFixture(), sheet=f.master.getSheetByName('REKAP_SPT');
  sheet.rows.push(['today','654321','Other','Other task','6 Juli 2026','8 Juli 2026',3,'Juli',2026,'https://drive.google.com/file/d/foreign_archive_file/view']);
  const token=f.rawCall({action:'login_pegawai',pin:'012345'}).sessionToken;
  f.context.recordArchiveUploader_(f.spt.id,'654321');
  f.context.recordArchiveUploader_('foreign_archive_file','123456');
  for(const role of ['pegawai','Admin']) {
    f.people.rows[0][3]='Role'; f.people.rows[1][3]=role;
    const auth={modul:'spt',sessionToken:token};
    const list=f.rawCall({...auth,action:'list_arsip'});
    assert.equal(list.status,'success',list.message);assert.equal(list.items.length,2);
    assert.deepEqual(list.items.map(item=>item.canDelete),[false,true]);assert.equal(list.canDeleteAll,false);
    const before=JSON.stringify(sheet.rows);
    assert.match(f.rawCall({...auth,action:'hapus_arsip',archiveIds:list.items.map(item=>item.archiveId),nip:'654321',uploadedBy:'123456',Role:'Admin'}).message,/pengunggah/);
    assert.equal(JSON.stringify(sheet.rows),before);
  }
  const list=f.rawCall({modul:'spt',sessionToken:token,action:'list_arsip'});
  assert.equal(f.rawCall({modul:'spt',sessionToken:token,action:'hapus_arsip',archiveIds:[list.items[1].archiveId]}).status,'success');
  assert.equal(sheet.rows.length,2);assert.equal(f.spt.trashed,false);
  assert.equal(f.rawCall({action:'list_arsip',modul:'spt'}).status,'error');
});

test('SPT upload records authenticated uploader rather than participants and cannot replace someone else\'s matching letter',()=>{
  const f=profileFixture(), sheet=f.master.getSheetByName('REKAP_SPT');
  const token=f.rawCall({action:'login_pegawai',nip:'654321',pin:'654321'}).sessionToken;
  const request={modul:'spt',sessionToken:token,fileName:'Surat.pdf',fileBase64:Buffer.from('%PDF-test').toString('base64'),
    nip:'123456',uploadedBy:'123456',sptData:[{nip:'123456',nama:'Participant',tujuan:'Kota Serang',tanggalBerangkat:'6 Juli 2026',tanggalPulang:'8 Juli 2026',bulan:'Juli',tahun:'2026'}]};
  const original=[...sheet.rows[1]], count=f.files.size;
  assert.equal(f.rawCall({...request,sessionToken:undefined}).status,'error');assert.equal(f.files.size,count);
  const saved=f.rawCall(request);assert.equal(saved.status,'success',saved.message);
  assert.equal(f.context.archiveUploaders_()[saved.fileId],'654321');assert.deepEqual(sheet.rows[1],original);
  assert.equal(sheet.rows.length,3);
  const listing=f.rawCall({action:'list_arsip',modul:'spt',sessionToken:token});
  assert.deepEqual(listing.items.map(item=>item.canDelete),[false,true]);
  const again=f.rawCall(request);assert.equal(again.status,'success');assert.equal(sheet.rows.length,3);
  assert.equal(f.context.archiveUploaders_()[again.fileId],'654321');
});

test('legacy admin SPT ownership is verified by session, while unknown historical ownership stays read-only',()=>{
  const f=fixture();f.properties.set('LEGACY_ADMIN_PIN','062419');
  const adminSessionToken=f.rawCall({action:'login_admin',pin:'062419'}).adminSessionToken;
  const auth={modul:'spt',adminSessionToken};
  const list=f.rawCall({...auth,action:'list_arsip'});assert.equal(list.status,'success');assert.equal(list.items[0].canDelete,false);
  assert.match(f.rawCall({...auth,action:'hapus_arsip',archiveIds:[list.items[0].archiveId]}).message,/pengunggah/);
  f.context.recordArchiveUploader_(f.spt.id,'Admin');
  assert.equal(f.rawCall({...auth,action:'list_arsip'}).items[0].canDelete,true);
  assert.equal(f.rawCall({...auth,action:'hapus_arsip',archiveIds:[list.items[0].archiveId]}).status,'success');
  assert.equal(f.rawCall({...auth,adminSessionToken:'expired',action:'list_arsip'}).status,'error');
});

test('uploader registry preserves long NIP text; ambiguous metadata never grants deletion',()=>{
  const f=profileFixture(), nip='001234567890123456';
  f.people.rows[1][0]=nip;
  const token=f.rawCall({action:'login_pegawai',nip,pin:'012345'}).sessionToken;
  f.context.recordArchiveUploader_(f.spt.id,nip);
  assert.equal(f.context.archiveUploaders_()[f.spt.id],nip);
  const auth={action:'list_arsip',modul:'spt',sessionToken:token};
  assert.equal(f.rawCall(auth).items[0].canDelete,true);
  f.master.getSheetByName('PENGUNGGAH_ARSIP').appendRow([f.spt.id,nip,'duplicate']);
  const result=f.rawCall(auth);assert.equal(result.items[0].canDelete,false);
  assert.match(f.rawCall({...auth,action:'hapus_arsip',archiveIds:[result.items[0].archiveId]}).message,/pengunggah/);
});

test('SPT metadata write failure does not create deletable or published archive rows',()=>{
  const f=profileFixture(), token=f.rawCall({action:'login_pegawai',pin:'012345'}).sessionToken;
  const metadata=f.master.insertSheet('PENGUNGGAH_ARSIP');metadata.appendRow(['FileId','Pengunggah','Diunggah']);
  metadata.getRange=()=>({setNumberFormat(){return this;},setValues(){throw Error('Owner write failed');}});
  const before=JSON.stringify(f.master.getSheetByName('REKAP_SPT').rows), active=[...f.files.values()].filter(file=>!file.trashed).length;
  const result=f.rawCall({modul:'spt',sessionToken:token,fileName:'New.pdf',fileBase64:Buffer.from('%PDF-test').toString('base64'),sptData:[{nip:'123456',tanggalBerangkat:'6 Juli 2026',tanggalPulang:'8 Juli 2026'}]});
  assert.equal(result.status,'error');assert.match(result.message,/Owner write failed/);
  assert.equal(JSON.stringify(f.master.getSheetByName('REKAP_SPT').rows),before);
  assert.equal([...f.files.values()].filter(file=>!file.trashed).length,active);
});
test('login uses authoritative Role D and Jabatan M rather than conflicting earlier aliases',()=>{
  const f=profileFixture();
  f.people.rows[0][3]='Role';f.people.rows[1][3]='pegawai';
  f.people.rows[0][6]='Akun_Role';f.people.rows[1][6]='admin';
  f.people.rows[0][12]='Jabatan';f.people.rows[1][12]='Jabatan Kolom M';
  const result=f.call({action:'login_pegawai',nip:'123456',pin:'012345'});
  assert.equal(result.user.Akun_Role,'pegawai');assert.equal(result.user.Jabatan,'Jabatan Kolom M');
  f.people.rows[1][3]='Admin';
  assert.equal(f.call({action:'login_pegawai',nip:'123456',pin:'012345'}).user.Akun_Role,'Admin');
});
test('activation writes only E for an existing unactivated NIP, preserving leading zeros and role',()=>{
  const f=profileFixture(), nip='000000000000000001';
  f.people.rows[1][0]=nip;f.people.rows[1][4]='';
  const before=f.people.rows.map(row=>[...row]);
  const input={action:'aktivasi_akun',nip,newPin:'001234',confirmPin:'001234',role:'superadmin'};
  assert.equal(f.call({...input,nip:'000000000000000099'}).status,'error');
  assert.equal(f.call({...input,newPin:'123'}).status,'error');
  assert.equal(f.call({...input,confirmPin:'000000'}).status,'error');
  assert.deepEqual(f.people.rows,before);
  const result=f.call(input);assert.equal(result.activated,true);assert.equal(result.sessionToken,undefined);
  before[1][4]='001234';assert.deepEqual(f.people.rows,before);
  assert.equal(f.call({action:'login_pegawai',nip,pin:'001234'}).status,'success');
  const repeat=f.call({...input,newPin:'999999',confirmPin:'999999'});
  assert.equal(repeat.alreadyActive,true);assert.equal(repeat.message,'Akun Sudah Aktif, Konfirmasi kepada Admin untuk akses login');
  assert.equal(f.people.rows[1][4],'001234');
});
test('activation never treats an invalid nonempty PIN as permission to reset it',()=>{
  const f=profileFixture(), nip='000000000000000001';f.people.rows[1][0]=nip;
  for(const existing of ['123456','invalid','0',0]){
    f.people.rows[1][4]=existing;
    assert.equal(f.call({action:'aktivasi_akun',nip,newPin:'222222',confirmPin:'222222'}).alreadyActive,true);
    assert.equal(f.people.rows[1][4],existing);
  }
});

test('profile login verifies server PIN, never returns PIN, and rejects a forged identity',()=>{
  const f=profileFixture();
  assert.equal(f.call({action:'login_pegawai',nip:'123456',pin:'123456'}).status,'error');
  const login=f.call({action:'login_pegawai',nip:'123456',pin:'012345'});
  assert.equal(login.status,'success',login.message);assert.ok(login.sessionToken);assert.equal(login.user.PIN,undefined);
  assert.equal(JSON.stringify(JSON.parse(f.context.doGet({parameter:{}}).getContent())).includes('012345'),false);
  assert.equal(f.call({action:'profil_saya',sessionToken:login.sessionToken,nip:'654321'}).status,'error');
  assert.equal(f.call({action:'ubah_pin',nip:'123456',oldPin:'012345',newPin:'222222',confirmPin:'222222'}).status,'error');
});
test('PIN change validates old PIN and confirmation, preserves leading zeros, invalidates other sessions',()=>{
  const f=profileFixture(), login=()=>f.call({action:'login_pegawai',nip:'123456',pin:'012345'});
  const a=login(),b=login(), payload={action:'ubah_pin',sessionToken:a.sessionToken,oldPin:'012345',newPin:'001234',confirmPin:'001234'};
  assert.equal(f.call({...payload,oldPin:'111111'}).status,'error');
  assert.equal(f.call({...payload,confirmPin:'999999'}).status,'error');
  assert.equal(f.people.rows[1][4],'012345');
  assert.equal(f.call(payload).status,'success');assert.equal(f.people.rows[1][4],'001234');assert.equal(f.people.rows[2][4],'654321');
  assert.equal(f.call({action:'profil_saya',sessionToken:b.sessionToken}).status,'error');
  assert.equal(login().status,'error');
  assert.equal(f.call({action:'login_pegawai',nip:'123456',pin:'001234'}).status,'success');
});
test('profile brute-force attempts are limited and no invalid upload can modify a photo',()=>{
  const f=profileFixture();
  for(let i=0;i<5;i++)assert.equal(f.call({action:'login_pegawai',nip:'123456',pin:'000000'}).status,'error');
  assert.match(f.call({action:'login_pegawai',nip:'123456',pin:'012345'}).message,/15 menit/);
  const token=f.call({action:'login_pegawai',nip:'654321',pin:'654321'}).sessionToken, before=f.files.size;
  for(const fileBase64 of ['PHN2Zz48L3N2Zz4=','!', 'A'.repeat(2800001)])assert.equal(f.call({action:'ubah_foto_profil',sessionToken:token,fileBase64}).status,'error');
  assert.equal(f.files.size,before);assert.equal(f.people.rows[2][43],'');
});
test('photo upload writes only authenticated employee AR and the configured folder, preserving prior files',()=>{
  const f=profileFixture(), sessionToken=f.call({action:'login_pegawai',nip:'123456',pin:'012345'}).sessionToken;
  const fileBase64=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]).toString('base64');
  const before=f.people.rows[1].slice(0,43), result=f.call({action:'ubah_foto_profil',sessionToken,fileBase64});
  assert.equal(result.status,'success',result.message);assert.equal(result.user.Foto_Pegawai,f.people.rows[1][43]);
  assert.deepEqual(f.people.rows[1].slice(0,43),before);assert.equal(f.people.rows[2][43],'');
  const uploaded=[...f.files.values()].find(file=>file.getUrl()===result.user.Foto_Pegawai);
  assert.equal(uploaded.parent.id,f.context.PROFILE_PHOTO_FOLDER_ID);
  f.call({action:'ubah_foto_profil',sessionToken,fileBase64});assert.equal(uploaded.trashed,false);
});

test('manual wrap process updates one month, cleans orphan duplicate chunks and does not auto publish',()=>{
  const f=fixture();payrollFixture(f);confirmRecap(f);f.properties.set('WRAP_ADMIN_KEY',wrapKey);
  const input={action:'proses_wrap_bulanan',month:'2026-07',adminKey:wrapKey};
  const first=f.call(input);assert.equal(first.status,'success',first.message);
  const sheet=f.master.getSheetByName('REKAP_WRAP_SNAPSHOT');sheet.appendRow([...sheet.rows[1]]);
  f.master.getSheetByName('Data_Pegawai').rows[1][1]='Nama Baru';
  const next=f.call(input);assert.equal(next.status,'success',next.message);
  assert.equal(sheet.rows.slice(1).filter(row=>row[1]==='2026-07').length,1);
  assert.equal(next.publication.drafts.length,1);assert.equal(next.data.employees[0].nama,'Nama Baru');
  f.context.monthlyRecap_=()=>{throw Error('Cannot scan on page load');};
  assert.equal(f.call({action:'rekap_bulanan_tersimpan',month:'2026-07'}).employees[0].nama,'Nama Baru');
  assert.equal(f.call({action:'rekap_bulanan_publik'}).published,false);
});
test('legacy date-coerced snapshot months are readable; new writes remain text',()=>{
  const f=fixture();payrollFixture(f);confirmRecap(f);const saved=saveWrap(f);
  const sheet=f.master.getSheetByName('REKAP_WRAP_SNAPSHOT');sheet.rows[1][1]=new Date('2026-06-30T17:00:00Z');
  assert.equal(f.call({action:'rekap_bulanan_tersimpan',month:'2026-07'}).status,'success');
  assert.equal(f.call({action:'publikasikan_wrap_bulanan',month:'2026-07',snapshotId:saved.draft.snapshotId,confirmed:true,adminKey:wrapKey}).status,'success');
  f.master.getSheetByName('Data_Pegawai').rows[1][1]='Baru';
  assert.equal(saveWrap(f).status,'success');assert.equal(sheet.rows[1][1],'2026-07');
  assert.equal(f.call({action:'rekap_bulanan_publik'}).employees[0].nama,f.scope.nama);
});
test('unreadable draft can be manually repaired even when source revision is unchanged',()=>{
  const f=fixture();payrollFixture(f);confirmRecap(f);saveWrap(f);
  f.master.getSheetByName('REKAP_WRAP_SNAPSHOT').rows[1][5]='broken';
  const loaded=f.call({action:'rekap_bulanan_tersimpan',month:'2026-07'});
  assert.equal(loaded.status,'success');assert.equal(loaded.processed,false);assert.match(loaded.warning,/Proses Rekap/);assert.equal(loaded.publication.version,1);
  const repaired=f.call({action:'proses_wrap_bulanan',month:'2026-07',adminKey:wrapKey});
  assert.equal(repaired.status,'success',repaired.message);assert.equal(repaired.data.processed,true);
});
function saveWrap(f, month='2026-07') {
  f.properties.set('WRAP_ADMIN_KEY',wrapKey);
  const preview=f.call({action:'rekap_bulanan',month});
  assert.equal(preview.status,'success',preview.message);
  return f.call({action:'simpan_wrap_bulanan',month,adminKey:wrapKey,previewRevision:preview.previewRevision});
}
function publishWrap(f, month='2026-07') {
  const saved=saveWrap(f,month);
  assert.equal(saved.status,'success',saved.message);
  const published=f.call({action:'publikasikan_wrap_bulanan',month,adminKey:wrapKey,snapshotId:saved.draft.snapshotId,confirmed:true});
  assert.equal(published.status,'success',published.message);
  return saved;
}

test('health probe returns deployment version without reading employee data or changing files', () => {
  const f=fixture(), count=f.files.size;
  const response=JSON.parse(f.context.doGet({parameter:{action:'health'}}).getContent());
  assert.equal(response.status,'success');
  assert.equal(response.backendVersion,'2026-09-26-published-wrap');
  assert.equal(response.nip,undefined); assert.equal(f.files.size,count);
});

test('live existence checks require exact module/NIP/period, current row and generated Drive recap', () => {
  for (const modul of ['uang-makan','tukin']) {
    const f = fixture(), check = extra => f.call({action:'check_status',modul,...extra});
    assert.equal(check().exists, true);
    assert.equal(check().checkedLive, true);
    assert.equal(check({nip:'999999'}).exists, false);
    assert.equal(check({periode:'01-08-2026 s/d 31-08-2026'}).exists, false);
    f.presensi.trashed = true; // Original PDF is not the generated recap.
    assert.equal(check().exists, true);
    f.spreadsheet.trashed = true;
    assert.equal(check().exists, false);
    f.spreadsheet.trashed = false;
    assert.equal(check().exists, true);
    f.master.getSheetByName(modul === 'tukin' ? 'REKAP_TUKIN' : 'REKAP_UANG_MAKAN').rows.splice(1,1);
    assert.equal(check().exists, false); // No browser/server history may override this.
    const get = JSON.parse(f.context.doGet({parameter:{action:'checkExisting',modul,nip:f.scope.nip,periodeEvent:f.scope.periode}}).getContent());
    assert.equal(get.exists, false);
  }
});

test('deleted/moved/wrong-type Drive recaps never count as existing', () => {
  const f = fixture(), check = () => f.call({action:'check_status'});
  f.spreadsheet.parent = f.otherDestination;
  assert.equal(check().exists, false);
  f.spreadsheet.parent = f.destination;
  f.spreadsheet.mime = 'application/pdf';
  assert.equal(check().exists, false);
  f.files.delete(f.spreadsheet.id);
  assert.equal(check().exists, false);
});

test('Drive service errors are surfaced, never reported as a missing recap', () => {
  const f = fixture();
  f.spreadsheet.getMimeType = () => { throw Error('Service invoked too many times'); };
  const result = f.call({action:'check_status'});
  assert.equal(result.status,'error');
  assert.match(result.message,/Service invoked/);
});

test('saving after manual recap removal repairs master row without duplicating it or deleting evidence', () => {
  for (const permanent of [false,true]) {
    const f = fixture();
    const evidence = f.call({action:'klaim_spt',sourceUrl:f.spt.getUrl()}).document;
    if (permanent) f.files.delete(f.spreadsheet.id); else f.spreadsheet.trashed = true;
    assert.equal(f.call({action:'check_status'}).exists, false);
    const result = f.call({sheetData:fullJulyAttendance(f.working.rows.slice(5,-1)),ringkasan:{}});
    assert.equal(result.status,'success',result.message);
    assert.equal(result.folderId,f.destination.id);
    assert.equal(f.master.getSheetByName('REKAP_UANG_MAKAN').rows.length,2);
    assert.equal(f.files.get(evidence.fileId).trashed,false);
    assert.equal(f.call({action:'check_status'}).exists,true);
  }
});

test('SPT and Cuti claims copy to exact tab 2 folder, preserve source, deduplicate and persist list', () => {
  const f = fixture();
  for (const [type, file] of [['spt', f.spt], ['cuti', f.cuti]]) {
    const request = { action: 'klaim_dokumen', jenisDokumen: type, sourceUrl: file.getUrl() };
    const result = f.call(request);
    assert.equal(result.status, 'success', result.message);
    assert.notEqual(result.document.fileId, file.id);
    assert.equal(f.files.get(result.document.fileId).parent, f.destination);
    assert.equal(file.trashed, false);
    assert.equal(f.call(request).document.fileId, result.document.fileId);
    if (type === 'cuti') assert.match(result.document.fileName, /\.png$/);
  }
  assert.equal(f.call({ action: 'list_pendukung' }).documents.length, 2);
  assert.equal(f.presensi.trashed, false);
  assert.equal(f.spreadsheet.trashed, false);
});

test('multiple SPT/Cuti claims keep separate registry rows, dates and copies under the write lock', () => {
  const f = fixture();
  let locked = false, flushes = 0;
  f.context.LockService.getScriptLock = () => ({
    waitLock() { assert.equal(locked, false); locked = true; },
    hasLock: () => locked, releaseLock() { locked = false; },
  });
  f.context.SpreadsheetApp.flush = () => { assert.equal(locked, true); flushes++; };
  const requests = [];
  for (const [type, source] of [['spt', f.spt], ['cuti', f.cuti]]) {
    const archive = f.master.getSheetByName(type === 'spt' ? 'REKAP_SPT' : 'REKAP_CUTI');
    for (let i = 0; i < 3; i++) {
      const file = i ? new f.File(`batch_${type}_${i}`, source.name, source.parent, source.mime) : source;
      if (i) { const row = [...archive.rows[1]]; row[4] = row[5] = `${6+i} Juli 2026`; row[6] = 1; row[9] = file.getUrl(); archive.appendRow(row); }
      requests.push({ action: 'klaim_dokumen', jenisDokumen: type, sourceUrl: file.getUrl(), requestId: `batch-${type}-${i}` });
    }
  }
  const documents = requests.map(request => {
    const result = f.call(request); assert.equal(result.status, 'success', result.message);
    assert.equal(locked, false); return result.document;
  });
  assert.equal(flushes, 6);
  assert.equal(new Set(documents.map(doc => doc.fileId)).size, 6);
  const registry = f.master.getSheetByName(f.context.ATTACHMENT_SHEET);
  const before = registry.rows.slice(1).map(row => JSON.stringify(row.slice(1)));
  assert.equal(before.length, 6);
  for (let i = 0; i < requests.length; i++) {
    assert.equal(registry.rows[i+1][9], documents[i].sourceFileId);
    assert.equal(registry.rows[i+1][8], requests[i].jenisDokumen);
    assert.equal(registry.rows[i+1].slice(14).filter(Boolean).length, i % 3 === 0 ? 3 : 1);
    const retry = f.call({ ...requests[i], requestId: `retry-${i}`, sourceUrl: `https://drive.google.com/open?id=${documents[i].sourceFileId}` });
    assert.equal(retry.document.fileId, documents[i].fileId);
  }
  assert.deepEqual(registry.rows.slice(1).map(row => JSON.stringify(row.slice(1))), before);
  assert.equal(f.call({ action: 'list_pendukung' }).documents.length, 6);
  const processed = f.call({ action: 'proses_bukti' });
  assert.equal(processed.status, 'success', processed.message);
  assert.equal(processed.rows.length, 6); // Multiple letters never add duplicate attendance dates.
  assert.equal(new Set(processed.rows.map(row => row.tanggal)).size, 6);
  assert.equal(processed.rows.filter(row => row.konflik).length, 3);
});

test('claim lock contention fails without appending rows or making copies', () => {
  const f = fixture(), filesBefore = f.files.size;
  f.context.LockService.getScriptLock = () => ({ waitLock() { throw new Error('Penulisan lain sedang berjalan'); }, hasLock: () => false, releaseLock() { assert.fail('must not release another writer lock'); } });
  const result = f.call({ action: 'klaim_spt', sourceUrl: f.spt.getUrl() });
  assert.equal(result.status, 'error');
  assert.equal(f.files.size, filesBefore);
  assert.equal(f.master.getSheetByName(f.context.ATTACHMENT_SHEET), null);
});

test('deletion trashes only registered copy, not source, rows or other documents; claim again works', () => {
  const f = fixture();
  const request = { action: 'klaim_dokumen', jenisDokumen: 'spt', sourceUrl: f.spt.getUrl() };
  const copy = f.call(request).document;
  const rowsBefore = JSON.stringify(f.master.getSheetByName('REKAP_SPT').rows);
  assert.equal(f.call({ action: 'hapus_pendukung', fileId: copy.fileId }).status, 'success');
  assert.equal(f.files.get(copy.fileId).trashed, true);
  assert.equal(f.spt.trashed, false); assert.equal(f.untouched.trashed, false);
  assert.equal(JSON.stringify(f.master.getSheetByName('REKAP_SPT').rows), rowsBefore);
  assert.equal(f.call({ action: 'list_pendukung' }).documents.length, 0);
  assert.notEqual(f.call(request).document.fileId, copy.fileId);
});

test('rejects deletion by name, source id, presensi id, another scope, or moved copy', () => {
  const f = fixture();
  for (const payload of [{ fileName: 'Presensi.pdf' }, { fileId: f.spt.id }, { fileId: f.presensi.id }, { fileId: f.spreadsheet.id }]) assert.equal(f.call({ action: 'hapus_pendukung', ...payload }).status, 'error');
  const copy = f.call({ action: 'klaim_dokumen', jenisDokumen: 'cuti', sourceUrl: f.cuti.getUrl() }).document;
  assert.equal(f.call({ action: 'hapus_pendukung', fileId: copy.fileId, modul: 'tukin' }).status, 'error');
  f.files.get(copy.fileId).parent = f.otherDestination;
  assert.equal(f.call({ action: 'hapus_pendukung', fileId: copy.fileId }).status, 'error');
  assert.equal(f.files.get(copy.fileId).trashed, false);
});

test('unknown action and claims without tab 2 fail before modifying any Drive file', () => {
  const f = fixture(), count = f.files.size;
  assert.equal(f.call({ action: 'unknown' }).status, 'error');
  assert.equal(f.call({ action: 'klaim_spt', periode: '01-08-2026 s/d 31-08-2026', sourceUrl: f.spt.getUrl() }).status, 'error');
  assert.equal(f.files.size, count);
  assert.ok([...f.files.values()].every(file => !file.trashed));
});

test('rejects source of wrong type, employee, or date range', () => {
  const f = fixture();
  assert.equal(f.call({ action: 'klaim_dokumen', jenisDokumen: 'cuti', sourceUrl: f.spt.getUrl() }).status, 'error');
  f.master.getSheetByName('REKAP_SPT').rows[1][1] = '999999';
  assert.equal(f.call({ action: 'klaim_spt', sourceUrl: f.spt.getUrl() }).status, 'error');
  f.master.getSheetByName('REKAP_SPT').rows[1][1] = '123456';
  f.master.getSheetByName('REKAP_SPT').rows[1][4] = '6 Agustus 2026';
  f.master.getSheetByName('REKAP_SPT').rows[1][5] = '8 Agustus 2026';
  assert.equal(f.call({ action: 'klaim_spt', sourceUrl: f.spt.getUrl() }).status, 'error');
});

test('direct upload retains archive and rekap after event copy is deleted; retry does not duplicate', () => {
  const f = fixture();
  const request = { action:'upload_pendukung', jenisDokumen:'cuti', requestId:'cuti-new-1', fileName:'Cuti Baru.png', fileBase64:'dGVzdA==', sptData:[{ nip:'123456', nama:f.scope.nama, tanggalBerangkat:'20 Juli 2026', tanggalPulang:'21 Juli 2026', tujuan:'Cuti Tahunan', jumlahHariDinas:2 }] };
  const result = f.call(request);
  assert.equal(result.status, 'success', result.message);
  const count = f.files.size;
  assert.equal(f.call(request).document.fileId, result.document.fileId);
  assert.equal(f.files.size, count);
  const source = f.files.get(result.document.sourceFileId);
  assert.equal(source.mime, 'image/png');
  assert.equal(f.call({action:'hapus_pendukung',fileId:result.document.fileId}).status, 'success');
  assert.equal(source.trashed, false);
  assert.ok(f.master.getSheetByName('REKAP_CUTI').rows.some(row => row[9] === source.getUrl()));
});

test('tab 2 creates only a recap, replaces old recap and preserves legacy original/evidence', () => {
  const f = fixture();
  const copy = f.call({action:'klaim_spt',sourceUrl:f.spt.getUrl()}).document;
  const result = f.call({sheetData:fullJulyAttendance(f.working.rows.slice(5,-1)),ringkasan:{}});
  assert.equal(result.status, 'success', result.message);
  assert.equal(result.folderId, f.destination.id);
  assert.equal(f.files.get(copy.fileId).trashed, false);
  assert.equal(f.untouched.trashed, false);
  assert.equal(f.spt.trashed, false);
  assert.equal(f.presensi.trashed, false);
  assert.equal([...f.files.values()].filter(file => file.id.startsWith('upload_document_')).length, 0);
  assert.equal(f.spreadsheet.trashed, true);
  assert.equal(f.call({action:'list_pendukung'}).documents.length, 1);
});

test('Tukin uses recorded spreadsheet folder, not month inferred from archive date', () => {
  const f = fixture();
  const result = f.call({modul:'tukin',action:'klaim_spt',sourceUrl:f.spt.getUrl(),bulanTahun:'Agustus 2026'});
  assert.equal(result.status, 'success', result.message);
  assert.equal(result.document.folderId, f.destination.id);
});

test('reclaim reuses deleted registry row and writes horizontal dates, isolated by module', () => {
  const f = fixture(), request = { action:'klaim_spt', sourceUrl:f.spt.getUrl() };
  const first = f.call(request); assert.equal(first.status, 'success', first.message);
  const registry = f.master.getSheetByName('DOKUMEN_PENDUKUNG');
  assert.deepEqual(registry.rows[0].slice(14), ['Tanggal_1','Tanggal_2','Tanggal_3']);
  assert.equal(f.context.isoDate_(registry.rows[1][14]), '2026-07-06');
  assert.equal(f.master.getSheetByName('REKAP_SPT').rows[0][10], 'Tanggal_1');
  f.call({action:'hapus_pendukung',fileId:first.document.fileId});
  const second = f.call(request); assert.equal(second.status, 'success', second.message);
  assert.equal(registry.rows.length, 2);
  assert.equal(registry.rows[1][12], 'active');
  assert.notEqual(second.document.fileId, first.document.fileId);
  assert.equal(f.call({action:'hapus_pendukung',fileId:first.document.fileId}).status, 'error');
  assert.equal(f.files.get(second.document.fileId).trashed, false);
  f.call({...request, modul:'tukin'});
  assert.equal(registry.rows.length, 3);
});

test('process applies SPT to same recap; subsequent preview is read-only, protects times and holidays', () => {
  const f = fixture();
  f.master.getSheetByName('REKAP_SPT').rows[1][4] = '4 Juli 2026';
  f.master.getSheetByName('REKAP_SPT').rows[1][5] = '9 Juli 2026';
  f.call({action:'klaim_spt',sourceUrl:f.spt.getUrl()});
  const before = JSON.stringify(f.working.rows);
  const preview = f.call({action:'proses_bukti'});
  assert.equal(preview.status, 'success', preview.message);
  assert.equal(preview.rows[0].keterangan, 'Libur');
  assert.equal(preview.rows[1].keterangan, 'Libur');
  assert.equal(preview.rows[2].keterangan, 'Dinas');
  assert.equal(preview.rows[5].keterangan, 'Libur');
  assert.equal(f.working.rows[7][21], 'Dinas');
  const untouchedColumns = row => row.slice(0,21).filter((_, i) => ![5,10,12,13,14,15].includes(i));
  assert.deepEqual(f.working.rows.slice(5,11).map(untouchedColumns), JSON.parse(before).slice(5,11).map(untouchedColumns));
  const processed = JSON.stringify(f.working.rows);
  assert.equal(f.call({action:'preview_rekap_final'}).status, 'success');
  assert.equal(JSON.stringify(f.working.rows), processed);
  assert.ok(f.recapBook.getSheetByName('_PRESENSI_TAB2'));
  assert.ok(preview.rows.every(row => row.datang === '08:10' && row.pulang === '17:00'));
});

test('unresolved conflicts and missing confirmation cannot overwrite recap', () => {
  const f = fixture();
  f.call({action:'klaim_spt',sourceUrl:f.spt.getUrl()});
  f.call({action:'klaim_cuti',sourceUrl:f.cuti.getUrl()});
  const preview = f.call({action:'proses_bukti'});
  const before = JSON.stringify(f.working.rows);
  assert.equal(preview.rows.filter(row => row.konflik).length, 3);
  assert.equal(f.call({action:'simpan_rekap_final',revision:preview.revision}).status, 'error');
  assert.equal(f.call({action:'simpan_rekap_final',revision:preview.revision,confirmed:true}).status, 'error');
  assert.equal(JSON.stringify(f.working.rows), before);
  const resolutions = {'2026-07-06':'Dinas','2026-07-07':'Cuti','2026-07-08':'Cuti'};
  const result = f.call({action:'simpan_rekap_final',revision:preview.revision,confirmed:true,resolutions});
  assert.equal(result.status, 'success', result.message);
  assert.equal(result.spreadsheetId, f.spreadsheet.id);
  assert.equal(result.revision, f.call({action:'preview_rekap_final'}).revision);
  assert.equal(f.working.rows[7][21], 'Dinas');
  assert.equal(f.working.rows[8][21], 'Cuti');
  const untouchedColumns = row => row.slice(0,21).filter((_, i) => ![5,10,12,13,14,15].includes(i));
  assert.deepEqual(f.working.rows.slice(5,11).map(untouchedColumns), JSON.parse(before).slice(5,11).map(untouchedColumns));
  assert.equal(f.working.backgrounds[2][0], '#c9efbc');
  assert.equal(f.working.backgrounds[3][0], '#affdfd');
  assert.equal(f.working.backgrounds[5][0], '#f4cccc');
});

test('deleted claims are removed from re-preview after final save, original data survives', () => {
  const f = fixture();
  const claim = f.call({action:'klaim_spt',sourceUrl:f.spt.getUrl()});
  let preview = f.call({action:'proses_bukti'});
  assert.equal(f.call({action:'simpan_rekap_final',revision:preview.revision,confirmed:true}).status, 'success');
  assert.equal(f.recapBook.getSheetByName('_PRESENSI_TAB2').rows[7][21], 'WFO');
  f.call({action:'hapus_pendukung',fileId:claim.document.fileId});
  preview = f.call({action:'proses_bukti'});
  assert.equal(preview.status, 'success', preview.message);
  assert.equal(preview.rows[2].keterangan, 'WFO');
  assert.equal(f.call({action:'simpan_rekap_final',revision:preview.revision,confirmed:true}).status, 'success');
  assert.equal(f.working.rows[7][21], 'WFO');
});

test('rejects stale preview after claim mutation, external change, or different submission', () => {
  const f = fixture();
  let preview = f.call({action:'proses_bukti'});
  f.call({action:'klaim_spt',sourceUrl:f.spt.getUrl()});
  assert.match(f.call({action:'simpan_rekap_final',revision:preview.revision,confirmed:true}).message, /perubahan|berubah/);
  preview = f.call({action:'proses_bukti'});
  f.working.rows[7][21] = 'WFH';
  assert.equal(f.call({action:'simpan_rekap_final',revision:preview.revision,confirmed:true}).status, 'error');
  assert.equal(f.call({action:'simpan_rekap_final',revision:preview.revision,confirmed:true,modul:'tukin'}).status, 'error');
});

test('legacy claims resolve dates from archive; unavailable copies cannot silently vanish', () => {
  const f = fixture();
  const claim = f.call({action:'klaim_spt',sourceUrl:f.spt.getUrl()});
  f.master.getSheetByName('DOKUMEN_PENDUKUNG').rows[1].length = 14;
  const preview = f.call({action:'proses_bukti'});
  assert.equal(preview.status, 'success', preview.message);
  assert.equal(preview.rows[2].keterangan, 'Dinas');
  f.files.get(claim.document.fileId).trashed = true;
  assert.equal(f.call({action:'preview_rekap_final'}).status, 'error');
});

test('baseline Libur is excluded from effective Cuti; forged holiday edits fail', () => {
  const f = fixture();
  for (const type of ['SPT','CUTI']) {
    f.master.getSheetByName('REKAP_' + type).rows[1][4] = '9 Juli 2026';
    f.master.getSheetByName('REKAP_' + type).rows[1][5] = '9 Juli 2026';
    f.master.getSheetByName('REKAP_' + type).rows[1][6] = 1;
  }
  f.call({action:'klaim_spt',sourceUrl:f.spt.getUrl()});
  f.call({action:'klaim_cuti',sourceUrl:f.cuti.getUrl()});
  const preview = f.call({action:'proses_bukti'});
  assert.equal(preview.rows[5].konflik, false);
  assert.equal(preview.rows[5].keterangan, 'Libur');
  assert.equal(f.call({action:'simpan_rekap_final',revision:preview.revision,confirmed:true,resolutions:{'2026-07-09':'Cuti'}}).status, 'error');
  assert.equal(f.call({action:'simpan_rekap_final',revision:preview.revision,confirmed:true}).status, 'success');
});

test('tab 4 stays open without changes, locks after claim/delete, and reprocess restores baseline', () => {
  for (const modul of ['uang-makan','tukin']) {
    const f = fixture(), call = payload => f.call({modul,...payload});
    assert.equal(call({action:'list_pendukung'}).processed, false);
    assert.equal(call({action:'preview_rekap_final'}).status, 'error');
    assert.equal(call({action:'proses_bukti'}).status, 'success');
    assert.equal(call({action:'list_pendukung'}).processed, true);
    assert.equal(call({action:'preview_rekap_final'}).status, 'success');
    const claim = call({action:'klaim_spt',sourceUrl:f.spt.getUrl()});
    assert.equal(call({action:'list_pendukung'}).processed, false);
    assert.equal(call({action:'preview_rekap_final'}).status, 'error');
    assert.equal(call({action:'proses_bukti'}).rows[2].keterangan, 'Dinas');
    assert.equal(call({action:'list_pendukung'}).processed, true);
    call({action:'klaim_spt',sourceUrl:f.spt.getUrl()}); // A duplicate is not a change.
    assert.equal(call({action:'list_pendukung'}).processed, true);
    assert.equal(call({action:'hapus_pendukung',fileId:claim.document.fileId}).status, 'success');
    assert.equal(call({action:'list_pendukung'}).processed, false);
    assert.equal(call({action:'preview_rekap_final'}).status, 'error');
    assert.equal(call({action:'proses_bukti'}).rows[2].keterangan, 'WFO');
    assert.equal(f.working.rows[7][21], 'WFO');
  }
});

test('re-entering and reprocessing unchanged conflict decisions preserves the selection', () => {
  const f = fixture();
  f.call({action:'klaim_spt',sourceUrl:f.spt.getUrl()});
  f.call({action:'klaim_cuti',sourceUrl:f.cuti.getUrl()});
  const preview = f.call({action:'proses_bukti'});
  assert.equal(preview.rows[2].keterangan, 'WFO'); // Conflict not decided automatically.
  const resolutions = {'2026-07-06':'Cuti','2026-07-07':'Dinas','2026-07-08':'Cuti'};
  assert.equal(f.call({action:'simpan_rekap_final',confirmed:true,revision:preview.revision,resolutions}).status, 'success');
  for (const action of ['preview_rekap_final','proses_bukti']) {
    const result = f.call({action});
    assert.equal(result.rows[2].keterangan, 'Cuti');
    assert.equal(result.rows[2].penyelesaian, 'Cuti');
    assert.equal(f.call({action:'list_pendukung'}).processed, true);
  }
});

test('new direct upload invalidates gate; invalid tab 2 data cannot change Drive', () => {
  const f = fixture();
  f.call({action:'proses_bukti'});
  assert.equal(f.call({action:'upload_pendukung',jenisDokumen:'cuti',requestId:'direct-test',fileName:'Cuti.png',fileBase64:'dGVzdA==',sptData:[{nip:f.scope.nip,nama:f.scope.nama,tanggalBerangkat:'6 Juli 2026',tanggalPulang:'8 Juli 2026',tujuan:'Cuti Tahunan',jumlahHariDinas:3}]}).status, 'success');
  assert.equal(f.call({action:'list_pendukung'}).processed, false);
  assert.equal(f.call({action:'proses_bukti'}).rows[2].keterangan, 'Cuti');
  const count = f.files.size;
  assert.equal(f.call({sheetData:[]}).status, 'error');
  assert.equal(f.files.size, count);
});

test('processing scans full claim state once and repeating unchanged process preserves data', () => {
  const f = fixture();
  f.call({action:'klaim_spt',sourceUrl:f.spt.getUrl()});
  const original=f.context.finalState_;
  let scans=0;
  f.context.finalState_=payload=>{scans++;return original(payload);};
  const first=f.call({action:'proses_bukti',requestId:'diagnostic-test'});
  assert.equal(first.status,'success',first.message); assert.equal(scans,1);
  const before=JSON.stringify(f.working.rows);
  const second=f.call({action:'proses_bukti',requestId:'diagnostic-test'});
  assert.equal(second.status,'success',second.message); assert.equal(scans,2);
  assert.equal(second.revision,first.revision);
  assert.equal(JSON.stringify(f.working.rows),before);
  assert.equal(f.call({action:'preview_rekap_final'}).revision,first.revision);
});

test('date columns store integer serials: 25 August stays 25 August, no hours', () => {
  const f = fixture(), sheet = f.master.getSheetByName('REKAP_SPT');
  f.context.writeDateColumns_(sheet, 2, 11, ['2026-08-25','2026-08-26']);
  const serial = sheet.rows[1][10];
  assert.equal(Number.isInteger(serial), true);
  assert.equal(new Date(Date.UTC(1899,11,30)+serial*86400000).toISOString(), '2026-08-25T00:00:00.000Z');
  assert.equal(f.context.isoDate_(serial), '2026-08-25');
  assert.deepEqual(Array.from(f.context.dateRange_('25 Agustus 2026','28 Agustus 2026')), ['2026-08-25','2026-08-26','2026-08-27','2026-08-28']);
});

test('native sheet dates use sheet timezone even when script/process timezone differs', () => {
  const f = fixture();
  f.master.timeZone = 'Pacific/Auckland';
  const atSheetMidnight = new Date('2026-08-24T12:00:00Z');
  assert.equal(f.context.isoDate_(atSheetMidnight), '2026-08-25');
  f.master.timeZone = 'America/Los_Angeles';
  assert.equal(f.context.isoDate_(new Date('2026-08-25T07:00:00Z')), '2026-08-25');
});

test('Cuti excludes weekends, configured holidays and extra HARI_LIBUR; SPT does not', () => {
  const f = fixture();
  assert.deepEqual(Array.from(f.context.archiveDateList_('14 Agustus 2026','18 Agustus 2026','cuti')), ['2026-08-14','2026-08-18']);
  assert.equal(f.context.archiveDateList_('14 Agustus 2026','18 Agustus 2026','spt').length, 5);
  f.master.insertSheet('HARI_LIBUR').rows = [['Tanggal','Keterangan'],['2026-08-18','Libur tambahan organisasi']];
  assert.deepEqual(Array.from(f.context.archiveDateList_('14 Agustus 2026','18 Agustus 2026','cuti')), ['2026-08-14']);
  assert.deepEqual(Array.from(f.context.archiveDateList_('18 Mei 2026','20 Mei 2026','cuti')), ['2026-05-18','2026-05-19','2026-05-20']);
});

test('public cuti calendar returns only deduplicated dates from the fixed master without mutating records',()=>{
  const f=fixture();
  f.master.insertSheet('HARI_LIBUR').rows=[['Tanggal','Catatan'],['2026-05-29','PRIVATE NOTE'],['2026-05-28','PRIVATE NOTE']];
  const before=JSON.stringify(f.master.getSheetByName('HARI_LIBUR').rows), files=f.files.size;
  const result=f.call({action:'kalender_cuti',spreadsheetId:'untrusted-other-book'});
  assert.equal(result.status,'success');
  assert.equal(result.calendarVersion,1);
  assert.ok(result.dates.includes('2026-05-29'));
  assert.equal(result.dates.filter(date=>date==='2026-05-28').length,1);
  assert.deepEqual(result.dates,[...result.dates].sort());
  assert.deepEqual(Object.keys(result).sort(),['calendarVersion','dates','status']);
  assert.doesNotMatch(JSON.stringify(result),/PRIVATE|Pegawai|123456/);
  assert.equal(JSON.stringify(f.master.getSheetByName('HARI_LIBUR').rows),before);
  assert.equal(f.files.size,files);
  f.master.getSheetByName('HARI_LIBUR').rows[0][0]='Wrong header';
  assert.equal(f.call({action:'kalender_cuti'}).status,'error');
});

test('manual and OCR leave count the May/June 2026 range as three working days, with matching frontend/backend calendars', () => {
  const f=fixture();
  const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  const count=vm.runInNewContext(app.slice(app.indexOf('const DAFTAR_LIBUR_NASIONAL ='),app.indexOf('const removeTitlesFromName ='))+'\nhitungHariKerjaAktif;');
  assert.equal(count('2026-05-26','2026-06-02'),3);
  assert.equal(count('2026-05-26','2026-06-02',[...f.context.CUTI_HOLIDAYS,'2026-05-29']),2,'preview honors server-provided extra holidays');
  assert.deepEqual(Array.from(f.context.archiveDateList_('26 Mei 2026','2 Juni 2026','cuti')),['2026-05-26','2026-05-29','2026-06-02']);
  const parsed=extractCutiPeriod('IV. LAMANYA CUTI Selama 4 hari Mulai Tanggal 26 Mei 2026 sampai dengan 2 Juni 2026 V. ALAMAT');
  assert.equal(parsed.duration,4,'raw letter duration is preserved for review, not used as the saved count');
  assert.equal(f.context.archiveDateList_(parsed.berangkat,parsed.pulang,'cuti').length,3);
  for(const date of ['2026-02-16','2026-03-18','2026-03-20','2026-03-23','2026-03-24','2026-05-15','2026-05-28','2026-12-24']) {
    assert.equal(count(date,date),0,date);
    assert.equal(f.context.archiveDateList_(date,date,'cuti').length,0,date);
  }
  assert.equal(count('2026-05-30','2026-06-01'),0);
  assert.equal(count('2026-12-31','2027-01-04'),2);
  for(const pair of [['2026-02-30','2026-03-02'],['2026-06-02','2026-05-26'],['','2026-05-26']])assert.equal(count(...pair),0);
  assert.equal(f.context.archiveDateList_('26 Mei 2026','2 Juni 2026','spt').length,8);
  assert.doesNotMatch(app,/const jumlahHari = documentModule === 'cuti' \? \(fObj\.parsedData\.arsipJumlahHariCuti/);
});

test('archive upload recalculates stored leave days and date columns instead of trusting manual/OCR totals',()=>{
  for(const inputDays of [4,8,99,0]) {
    const f=fixture(), sheet=f.master.getSheetByName('REKAP_CUTI'), original=JSON.stringify(sheet.rows[1]);
    const result=f.context.saveArchive_({modul:'cuti',fileName:'Cuti.png',fileBase64:'dGVzdA==',sptData:[{nip:'199001012020011001',nama:'Pegawai Uji',tanggalBerangkat:'26 Mei 2026',tanggalPulang:'2 Juni 2026',tujuan:'Cuti Tahunan',jumlahHariDinas:inputDays}]});
    assert.equal(result.status,'success',result.message);
    const row=sheet.rows.find(row=>row[9]===result.fileUrl);
    assert.equal(row[6],3);
    assert.deepEqual(row.slice(10,13).map(value=>f.context.isoDate_(value)),['2026-05-26','2026-05-29','2026-06-02']);
    assert.equal(JSON.stringify(sheet.rows[1]),original,'unrelated historical leave is unchanged');
  }
});

test('zero-working-day cuti fails before creating files, and additional HARI_LIBUR affects stored counts',()=>{
  const f=fixture(), initial=f.files.size, snapshot=JSON.stringify(f.master.getSheetByName('REKAP_CUTI').rows);
  const payload={modul:'cuti',fileName:'Cuti.png',fileBase64:'dGVzdA==',sptData:[{nip:'199001012020011001',nama:'Uji',tanggalBerangkat:'27 Mei 2026',tanggalPulang:'28 Mei 2026',tujuan:'Cuti Tahunan',jumlahHariDinas:2}]};
  assert.throws(()=>f.context.saveArchive_(payload),/tidak memiliki hari kerja/);
  assert.equal(f.files.size,initial);
  assert.equal(JSON.stringify(f.master.getSheetByName('REKAP_CUTI').rows),snapshot);
  f.master.insertSheet('HARI_LIBUR').rows=[['Tanggal'],['2026-05-29']];
  payload.sptData[0].tanggalBerangkat='26 Mei 2026';payload.sptData[0].tanggalPulang='2 Juni 2026';
  const result=f.context.saveArchive_(payload);
  assert.equal(result.status,'success',result.message);
  assert.equal(f.master.getSheetByName('REKAP_CUTI').rows.find(row=>row[9]===result.fileUrl)[6],2);
});

test('2027 PDF dates match frontend and backend, including collective leave on page 5', () => {
  const f=fixture();
  const expected=[
    '2027-01-01','2027-01-05','2027-02-05','2027-02-06',
    '2027-03-08','2027-03-09','2027-03-10','2027-03-11','2027-03-12','2027-03-15','2027-03-25','2027-03-26','2027-03-28',
    '2027-05-01','2027-05-06','2027-05-17','2027-05-18','2027-05-19','2027-05-20',
    '2027-06-01','2027-06-06','2027-08-15','2027-08-17','2027-12-24','2027-12-25','2027-12-26'
  ];
  const backend=Array.from(f.context.CUTI_HOLIDAYS);
  assert.deepEqual(backend.filter(date=>date.startsWith('2027-')),expected);
  assert.equal(new Set(backend).size,backend.length);
  const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  const frontend=vm.runInNewContext(app.slice(app.indexOf('const DAFTAR_LIBUR_NASIONAL ='),app.indexOf('const hitungHariKerjaAktif ='))+'\nDAFTAR_LIBUR_NASIONAL;');
  assert.deepEqual(Array.from(frontend),backend);
  assert.deepEqual(Array.from(f.context.archiveDateList_('8 Maret 2027','16 Maret 2027','cuti')),['2027-03-16']);
  assert.equal(f.context.archiveDateList_('8 Maret 2027','16 Maret 2027','spt').length,9);
  for(const modul of ['uang-makan','tukin']) {
    const result=f.context.calculateAttendance_(expected.map(tanggal=>({tanggal,keterangan:'WFO',datang:'-',pulang:'-'})),employeeRate,modul);
    assert.equal(result.totals.libur,26);
    for(const key of ['hariKerja','masuk','cuti','unadjusted','menitTanpaPresensi','potonganAbsensi']) assert.equal(result.totals[key],0,key);
  }
});

test('backend final preview recognizes 2027 holidays even when the uploaded sheet says WFO', () => {
  const f=fixture();
  f.scope.periode='01-03-2027 s/d 31-03-2027';
  f.master.getSheetByName('REKAP_UANG_MAKAN').rows[1][3]=f.scope.periode;
  const dates=['2027-03-08','2027-03-09','2027-03-10','2027-03-11','2027-03-12','2027-03-16'];
  f.working.rows.slice(5,-1).forEach((row,i)=>{row[1]='';row[2]=dates[i];row[3]='-';row[4]='-';row[21]='WFO';});
  const result=f.context.finalState_(f.scope);
  assert.ok(result.rows.slice(0,5).every(row=>row.libur&&row.keterangan==='Libur'));
  assert.equal(result.rows[5].libur,false);
  assert.equal(result.rows[5].keterangan,'WFO');
});

test('migration overwrites shifted dates and clears surplus columns, safe to rerun', () => {
  const f = fixture(), cuti = f.master.getSheetByName('REKAP_CUTI');
  cuti.rows[1][4]='10 Juli 2026'; cuti.rows[1][5]='13 Juli 2026'; cuti.rows[1][6]=2;
  cuti.rows[0].push('Tanggal_1','Tanggal_2','Tanggal_3','Tanggal_4');
  cuti.rows[1].push('2026-07-09','2026-07-10','2026-07-11','2026-07-12');
  const report = f.context.isiTanggalArsipDanKlaimLama();
  assert.equal(report.skipped.length, 0); assert.equal(report.warnings.length, 0);
  assert.equal(f.context.isoDate_(cuti.rows[1][10]), '2026-07-10');
  assert.equal(f.context.isoDate_(cuti.rows[1][11]), '2026-07-13');
  assert.deepEqual(cuti.rows[1].slice(12), ['','']);
  const before = JSON.stringify(cuti.rows);
  f.context.isiTanggalArsipDanKlaimLama();
  assert.equal(JSON.stringify(cuti.rows), before);
});

test('Cuti count mismatch is reported, not silently truncated or used in preview', () => {
  const f = fixture(), cuti = f.master.getSheetByName('REKAP_CUTI');
  cuti.rows[1][6] = 2; // Range contains 3 workdays.
  const report = f.context.isiTanggalArsipDanKlaimLama();
  assert.equal(report.warnings.length, 1);
  const claim = f.call({action:'klaim_cuti',sourceUrl:f.cuti.getUrl()});
  assert.equal(claim.status, 'error'); assert.match(claim.message,/Jumlah Hari Cuti/);
  assert.equal(cuti.rows[1][6], 2);
});

test('preview recomputes original dates rather than using shifted legacy date columns', () => {
  const f = fixture();
  f.call({action:'klaim_spt',sourceUrl:f.spt.getUrl()});
  f.master.getSheetByName('DOKUMEN_PENDUKUNG').rows[1].splice(14,3,'2026-07-05','2026-07-06','2026-07-07');
  const preview = f.call({action:'proses_bukti'});
  assert.equal(preview.status, 'success', preview.message);
  assert.equal(preview.rows.find(row=>row.tanggal==='2026-07-08').keterangan,'Dinas');
});

const employeeRate = { uangMakan:37000, pajak:5, tukin:6349000, skp:100, jabatan:'Analis', golongan:'III', warnings:[] };
test('saved final result and legacy summaries reopen read-only even if master rates change', () => {
  for(const modul of ['uang-makan','tukin'])for(const legacy of [false,true]){
    const f=fixture(); f.scope.modul=modul;
    if(modul==='tukin'){
      f.scope.periode='11-06-2026 s/d 10-07-2026';
      f.master.getSheetByName('REKAP_TUKIN').rows[1][3]=f.scope.periode;
    }
    payrollFixture(f);
    const people=f.master.getSheetByName('Data_Pegawai');
    people.rows[0][4]='PIN'; people.rows[1][4]='012345';
    const sessionToken=f.rawCall({action:'login_pegawai',pin:'012345'}).sessionToken;
    assert.ok(sessionToken);
    const saved=confirmRecap(f);assert.equal(saved.status,'success');
    if(legacy)f.recapBook.sheets.delete('_HASIL_PERHITUNGAN');
    people.rows[1][19]=999999; people.rows[1][16]=99999999; people.rows[1][18]='10%'; people.rows[1][20]='30%';
    const before=JSON.stringify([...f.books].map(([id,book])=>[id,[...book.sheets].map(([name,sheet])=>[name,sheet.rows])]));
    const auth={sessionToken,employeeReadOnly:true};
    const result=f.rawCall({...auth,action:'preview_rekap_final'});
    assert.equal(result.savedResult.calculation.amount.netto,saved.calculation.amount.netto);
    assert.equal(result.savedResult.calculation.amount.tarif,saved.calculation.amount.tarif);
    assert.equal(f.rawCall({...auth,action:'list_pendukung'}).savedResult.calculation.amount.netto,saved.calculation.amount.netto);
    const annual=f.rawCall({action:'rekap_pegawai_tahunan',sessionToken,year:2026});
    assert.equal(annual.status,'success',annual.message);
    assert.equal(annual.months[modul==='tukin'?7:6].netto,saved.calculation.amount.netto);
    assert.equal(JSON.stringify([...f.books].map(([id,book])=>[id,[...book.sheets].map(([name,sheet])=>[name,sheet.rows])])),before);
    f.working.rows[7][3]='09:01';
    assert.equal(f.call({action:'preview_rekap_final'}).status,'error');
  }
});
test('legacy unpadded clocks normalize through processing and saving without confusing adjustments', () => {
  const f=fixture();payrollFixture(f);f.working.rows[7][3]='7:30';
  const saved=confirmRecap(f);assert.equal(saved.status,'success',saved.message);
  assert.equal(saved.rows[2].datang,'07:30');assert.equal(f.working.rows[7][3],'07:30');
  assert.equal(f.call({action:'preview_rekap_final'}).savedResult.rows[2].datang,'07:30');
});
test('personal archives are filtered server-side by authenticated NIP, not names or forged payload', () => {
  const f=profileFixture(), session=f.call({action:'login_pegawai',pin:'012345'});
  f.master.getSheetByName('REKAP_SPT').rows.push(['today','654321','Pegawai Uji','Other']);
  const result=f.call({action:'arsip_saya',modul:'spt',sessionToken:session.sessionToken});
  assert.equal(result.status,'success');assert.equal(result.items.length,1);assert.equal(result.items[0].NIP,'123456');
  assert.equal(f.call({action:'arsip_saya',modul:'spt',sessionToken:session.sessionToken,nip:'654321'}).status,'error');
  assert.equal(f.call({action:'arsip_saya',modul:'cuti'}).status,'error');
});

function consolidatedFixture() {
  const f=fixture(), id='199001012025011001';f.scope.nip=id;
  for(const name of ['REKAP_UANG_MAKAN','REKAP_TUKIN','REKAP_SPT','REKAP_CUTI'])f.master.getSheetByName(name).rows[1][1]=id;
  payrollFixture(f);const people=f.master.getSheetByName('Data_Pegawai');people.rows[0][7]='Jenis_ASN';people.rows[1][7]='PNS';people.rows[0][6]='SubUnitKerja';people.rows[1][6]='Subbagian Tata Usaha';
  const Folder=f.destination.constructor, period=new Folder('period_folder','Uang Makan_07_Juli',f.folders.get(f.context.ROOT_FOLDER_ID)), pns=new Folder('pns_folder','PNS',period);f.destination.moveTo(pns);
  f.properties.set('WRAP_ADMIN_KEY',wrapKey);
  for(const modul of ['uang-makan','tukin'])for(const type of ['PNS','PPPK']){
    const templateId=f.context.SUBMISSION_TEMPLATES[modul][type], book=new f.Book(), sheet=book.insertSheet(modul==='uang-makan'?'UM_BULAN':'TUKIN_BULAN');
    new f.File(templateId,'Template '+type,null,'application/vnd.google-apps.spreadsheet');f.books.set(templateId,book);
    const meal=modul==='uang-makan', first=meal?5:10;
    sheet.rows=Array.from({length:first+1},()=>Array(meal?39:15).fill(''));
    if(meal){sheet.rows[3]=['No','NIP','Nama',...Array.from({length:31},(_,i)=>i+1),'Jumlah'];sheet.rows[4]=[1,type==='PNS'?id:'199001012025011002',type==='PNS'?f.scope.nama:'Belum dihitung',...Array(31).fill(''), '=SUM(D5:AH5)'];sheet.rows[5]=[2,'199001012025011003','Belum ada data',...Array(31).fill(''), '=SUM(D6:AH6)'];}
    else{sheet.rows[8]=['No','','','','','NIP','','','','','','','','Nama'];sheet.rows[9]=[1,'','','','',type==='PNS'?id:'199001012025011002',100,'',9,'=100-G10','=I10*30%+J10*70%','','',type==='PNS'?f.scope.nama:'Belum dihitung'];}
  }
  assert.equal(confirmRecap(f).status,'success');
  return {...f,period};
}
test('submission list is complete-only and uses latest row, authoritative ASN and subunit', () => {
  const f=consolidatedFixture();
  assert.equal(f.call({action:'list_submisi_terhitung'}).status,'error');
  f.properties.set('LEGACY_ADMIN_PIN','062419');
  const adminSessionToken=f.call({action:'login_admin',pin:'062419'}).adminSessionToken;
  const payload={action:'list_submisi_terhitung',adminSessionToken};
  const result=f.call(payload);assert.equal(result.employees.length,1);assert.equal(result.employees[0].jenisAsn,'PNS');assert.equal(result.employees[0].unit,'Subbagian Tata Usaha');
  const sheet=f.master.getSheetByName('REKAP_UANG_MAKAN');const last=[...sheet.rows[1]];last[sheet.rows[0].indexOf('Hitung_Status')]='Menunggu perhitungan ulang';sheet.rows.push(last);
  assert.equal(f.call(payload).employees.length,0);
});
test('meal recap generates PNS and PPPK siblings and overwrites owned cells with stable file IDs', () => {
  const f=consolidatedFixture(), payload=recapRequest(f);
  const result=f.call(payload);assert.equal(result.status,'success',result.message);assert.equal(result.files.length,2);
  const pns=result.files[0], file=f.files.get(pns.fileId), sheet=f.books.get(pns.fileId).getSheetByName('Uang Makan_Juli');
  for(const output of result.files){
    const tab=f.books.get(output.fileId).getSheetByName('Uang Makan_Juli');
    assert.equal(tab.rows[1][1],2026);assert.equal(tab.rows[2][1],'Juli');assert.equal(tab.rows[1][2],'Uang Makan Juli 2026');
    assert.equal(f.books.get(output.fileId).getSheetByName('UM_BULAN'),null);
  }
  assert.equal(file.parent.getName(),'REKAP');assert.equal(file.parent.parent.getId(),f.period.getId());
  assert.equal(pns.name,'Rekap Uang Makan Juli 2026 PNS Dit Bangdes');
  assert.equal(sheet.rows[4][8],1); // July 6 attendance
  assert.equal(sheet.rows[5][8],''); // unknown employee
  assert.equal(sheet.cellBackgrounds[5][6],'#f4cccc'); // July 4 weekend, including unknown employee
  assert.equal(sheet.rows[4][34],'=SUM(D5:AH5)');
  sheet.rows[4][8]=99;
  const again=f.call(payload);assert.equal(again.status,'success',again.message);assert.equal(again.files[0].fileId,pns.fileId);assert.equal(sheet.rows[4][8],1);
  assert.equal([...f.files.values()].filter(file=>file.parent?.getName()==='REKAP'&&!file.trashed).length,2);
});
test('template plan handles holiday, approved dinas/cuti, missing punches and month boundaries', () => {
  const f=consolidatedFixture(), sheet=f.books.get(f.context.SUBMISSION_TEMPLATES['uang-makan'].PNS).getSheetByName('UM_BULAN');
  const period=f.context.submissionPeriod_({modul:'uang-makan',periode:'01-02-2024 s/d 29-02-2024'});
  const person={nip:f.scope.nip,nama:f.scope.nama,days:{'2024-02-01':{status:'Dinas'},'2024-02-02':{status:'Cuti'},'2024-02-05':{status:'WFO',datang:'-',pulang:'-'},'2024-02-06':{status:'WFO',datang:'-',pulang:'16:00'}}};
  const plan=f.context.templateRecapPlan_(sheet,[person],{modul:'uang-makan'},period,['2024-02-07']);
  const cell=(row,col)=>plan.find(x=>x.row===row&&x.col===col);
  assert.equal(cell(5,4).background,'#c9efbc');assert.equal(cell(5,5).background,'#affdfd');
  assert.equal(cell(5,8).value,'');assert.equal(cell(5,9).value,1);assert.equal(cell(6,10).background,'#f4cccc');
  assert.equal(cell(5,33).background,'#eeeeee');assert.equal(cell(5,33).value,'');
  assert.ok(f.context.recapWriteBlocks_(plan).length<10);
  person.presenceByStatus=true;
  const directorPlan=f.context.templateRecapPlan_(sheet,[person],{modul:'uang-makan'},period,['2024-02-07']);
  assert.equal(directorPlan.find(x=>x.row===5&&x.col===8).value,1);
  assert.equal(directorPlan.find(x=>x.row===5&&x.col===4).value,''); // Dinas never paid
});

test('meal headers migrate legacy sheets without changing IDs and roll back names on failure', () => {
  const f=consolidatedFixture(), payload=recapRequest(f);
  const first=f.call(payload);assert.equal(first.status,'success',first.message);
  const tabs=first.files.map(file=>f.books.get(file.fileId).getSheetByName('Uang Makan_Juli'));
  tabs.forEach(tab=>{tab.setName('UM_BULAN');tab.getRange(1,3).setValue('Uang Makan Juli 2026');tab.getRange(2,3).setValue('Judul lama');tab.getRange(3,2).setValue(7);});
  const ids=tabs.map(tab=>tab.getSheetId()), before=tabs.map(tab=>JSON.stringify(tab.rows));
  const original=tabs[1].getRange.bind(tabs[1]);let fail=true;
  tabs[1].getRange=(...args)=>{const range=original(...args), write=range.setValues;range.setValues=values=>{if(fail){fail=false;throw Error('Injected title failure');}return write(values);};return range;};
  assert.equal(f.call(payload).status,'error');
  tabs.forEach((tab,i)=>{assert.equal(tab.getName(),'UM_BULAN');assert.equal(JSON.stringify(tab.rows),before[i]);});
  const again=f.call(payload);assert.equal(again.status,'success',again.message);
  tabs.forEach((tab,i)=>{assert.equal(tab.getSheetId(),ids[i]);assert.equal(tab.getName(),'Uang Makan_Juli');assert.equal(tab.rows[0][2],'');assert.equal(tab.rows[1][2],'Uang Makan Juli 2026');assert.equal(tab.rows[2][1],'Juli');assert.equal(again.files[i].fileId,first.files[i].fileId);});
  for(const type of ['PNS','PPPK'])assert.ok(f.books.get(f.context.SUBMISSION_TEMPLATES['uang-makan'][type]).getSheetByName('UM_BULAN'));
});
test('tukin template uses percentage points in I, preserves formulas and rolls payment year', () => {
  const f=consolidatedFixture(), sheet=f.books.get(f.context.SUBMISSION_TEMPLATES.tukin.PNS).getSheetByName('TUKIN_BULAN');
  const payload={modul:'tukin',periode:'11-11-2026 s/d 10-12-2026'}, period=f.context.submissionPeriod_(payload);
  assert.equal(period.label,'Januari 2027');
  const plan=f.context.templateRecapPlan_(sheet,[{nip:f.scope.nip,nama:f.scope.nama,potonganAbsensi:2.5,besaranTukin:6349000,persenPotongan:0.75,nominalPotongan:47618}],payload,period,[],46305);
  assert.equal(plan.find(x=>x.row===10&&x.col===9).value,2.5);
  assert.equal(plan.find(x=>x.row===10&&x.col===12).value,6349000);
  assert.equal(plan.find(x=>x.row===10&&x.col===8).value,46305);
  assert.equal(plan.find(x=>x.row===9&&x.col===8).value,'Tanggal');
  assert.equal(plan.some(x=>x.col===10||x.col===11),false);
  assert.equal(plan.find(x=>x.row===10&&x.col===5).value,2027);
  assert.equal(plan.find(x=>x.row===10&&x.col===4).value,'Januari');
  assert.equal(plan.find(x=>x.row===3&&x.col===4).value,'Januari 2027');
  assert.equal(plan.find(x=>x.row===4&&x.col===4).value,payload.periode);
  assert.equal(f.context.templateRecapPlan_(sheet,[],payload,period,[]).find(x=>x.row===10&&x.col===9).value,'');
  assert.throws(()=>f.context.submissionPeriod_({modul:'tukin',periode:'01-11-2026 s/d 30-11-2026'}),/11 sampai 10/);
  const director={nip:f.scope.nip,nama:f.scope.nama,potonganAbsensi:0,potonganSkp:0,besaranTukin:6349000,directorExempt:true};
  sheet.rows[9][10]='=IF(N("PKP_DIREKTUR_TUKIN")=0,0,(I10*30%+J10*70%))';
  sheet.rows[9][12]='=IF(N("PKP_DIREKTUR_NETTO")=0,L10,(L10*K10/100))';
  const directorPlan=f.context.templateRecapPlan_(sheet,[director],payload,period,[],46305);
  assert.equal(directorPlan.find(x=>x.row===10&&x.col===9).value,0);
  assert.equal(directorPlan.find(x=>x.row===10&&x.col===10).value,0);
  assert.equal(directorPlan.find(x=>x.row===10&&x.col===11).value,'=I10*30%+J10*70%');
  const exemption=directorPlan.find(x=>x.row===10&&x.col===13);
  assert.equal(exemption.value,'=L10*K10/100');
  sheet.rows[9][12]=0;
  assert.equal(f.context.templateRecapPlan_(sheet,[director],payload,period,[],46305).find(x=>x.row===10&&x.col===13).value,exemption.value);
  director.directorExempt=false;
  assert.equal(f.context.templateRecapPlan_(sheet,[director],payload,period,[],46305).find(x=>x.row===10&&x.col===11).value,'=I10*30%+J10*70%');
  assert.equal(f.context.templateRecapPlan_(sheet,[director],payload,period,[],46305).find(x=>x.row===10&&x.col===13).value,'=L10*K10/100');
});
test('aggregate export restores existing spreadsheets after a second-file write failure', () => {
  const f=consolidatedFixture(), payload=recapRequest(f);
  const first=f.call(payload);assert.equal(first.status,'success');
  const firstSheet=f.books.get(first.files[0].fileId).getSheetByName('Uang Makan_Juli');
  firstSheet.rows[4][8]=88;
  const before=JSON.stringify(firstSheet.rows), secondSheet=f.books.get(first.files[1].fileId).getSheetByName('Uang Makan_Juli');
  const original=secondSheet.getRange.bind(secondSheet);let fail=true;
  secondSheet.getRange=(...args)=>{const range=original(...args), write=range.setValues;range.setValues=values=>{if(fail){fail=false;throw Error('Injected second-file write failure');}return write(values);};return range;};
  assert.equal(f.call(payload).status,'error');assert.equal(JSON.stringify(firstSheet.rows),before);
  assert.equal(f.files.get(first.files[0].fileId).trashed,false);
});

test('restored Tukin formulas follow the employee row and preserve ordinary formulas',()=>{
  const f=consolidatedFixture(), sheet=f.books.get(f.context.SUBMISSION_TEMPLATES.tukin.PNS).getSheetByName('TUKIN_BULAN');
  const payload={modul:'tukin',periode:'11-11-2026 s/d 10-12-2026'}, period=f.context.submissionPeriod_(payload);
  sheet.rows[10]=[...sheet.rows[9]];sheet.rows[9]=Array(14).fill('');
  sheet.rows[10][10]=0;sheet.rows[10][12]=0;
  const person={nip:f.scope.nip,nama:f.scope.nama,potonganAbsensi:0,potonganSkp:0,besaranTukin:6349000,directorExempt:true};
  const plan=f.context.templateRecapPlan_(sheet,[person],payload,period,[],46305);
  assert.equal(plan.find(x=>x.row===11&&x.col===10).value,0);
  assert.equal(plan.find(x=>x.row===11&&x.col===11).value,'=I11*30%+J11*70%');
  assert.equal(plan.find(x=>x.row===11&&x.col===13).value,'=L11*K11/100');
  sheet.rows[10][9]='=100-G11';sheet.rows[10][10]='=((I11*30%)+(J11*70%))';sheet.rows[10][12]='=(K11/100)*L11';
  person.directorExempt=false;person.potonganAbsensi=2.5;
  const ordinary=f.context.templateRecapPlan_(sheet,[person],payload,period,[],46305);
  assert.equal(ordinary.some(x=>[10,11,13].includes(x.col)),false);
  person.directorExempt=true;person.potonganAbsensi=0;
  const director=f.context.templateRecapPlan_(sheet,[person],payload,period,[],46305);
  assert.equal(director.find(x=>x.row===11&&x.col===10).value,0);
  assert.equal(director.some(x=>[11,13].includes(x.col)),false);
});
test('aggregate generation refuses stale sources and ambiguous template identities without writes', () => {
  const f=consolidatedFixture(), sheet=f.books.get(f.context.SUBMISSION_TEMPLATES['uang-makan'].PNS).getSheetByName('UM_BULAN');
  sheet.rows[5][1]=f.scope.nip;
  const payload=recapRequest(f);
  assert.match(f.call(payload).message,/duplikat/);
  assert.equal([...f.folders.values()].some(folder=>folder.name==='REKAP'),false);
  sheet.rows[5][1]='199001012025011003';f.working.rows[7][3]='12:00';
  assert.equal(f.call(payload).status,'error');
});
test('non-admin employee session cannot access the all-employee submission list', () => {
  const f=profileFixture(), session=f.call({action:'login_pegawai',pin:'012345'});
  assert.match(f.call({action:'list_submisi_terhitung',sessionToken:session.sessionToken,role:'admin'}).message,/Hanya Admin/);
});

test('legacy Admin session reads saved employee recap but cannot generate without confirmation', () => {
  const f=consolidatedFixture();
  assert.match(f.call({action:'login_admin',pin:'062419'}).message,/LEGACY_ADMIN_PIN/);
  f.properties.set('LEGACY_ADMIN_PIN','062419');
  assert.equal(f.call({action:'login_admin',pin:'111111'}).status,'error');
  const login=f.call({action:'login_admin',pin:'062419'});
  assert.equal(login.status,'success');assert.ok(login.adminSessionToken);assert.equal(login.user.PIN,undefined);
  const auth={adminSessionToken:login.adminSessionToken};
  assert.equal(f.call({action:'list_submisi_terhitung',...auth}).employees.length,1);
  assert.equal(f.call({action:'list_submisi_terhitung',adminKey:wrapKey}).status,'error');
  const before=JSON.stringify([...f.books].map(([id,book])=>[id,[...book.sheets].map(([name,sheet])=>[name,sheet.rows])]));
  for(const action of ['list_pendukung','preview_rekap_final']) {
    const result=f.call({action,...auth,adminReadOnly:true});
    assert.equal(result.status,'success',result.message);
    assert.equal((result.savedResult||result).nip,f.scope.nip);
  }
  for(const action of ['proses_bukti','simpan_rekap_final','hapus_pendukung','upload_pendukung','buat_rekap_submisi']) {
    assert.equal(f.call({action,...auth,adminReadOnly:true,adminKey:wrapKey}).status,'error');
  }
  assert.equal(f.call({action:'buat_rekap_submisi',...auth}).status,'error');
  assert.equal(JSON.stringify([...f.books].map(([id,book])=>[id,[...book.sheets].map(([name,sheet])=>[name,sheet.rows])])),before);
  f.properties.set('LEGACY_ADMIN_PIN','962410');
  assert.equal(f.call({action:'list_submisi_terhitung',...auth}).status,'error');
});

test('NIP Admin list uses existing login session and rejects revoked role', () => {
  const f=profileFixture();
  f.people.rows[0][3]='Role';f.people.rows[1][3]='Admin';
  const sessionToken=f.call({action:'login_pegawai',pin:'012345'}).sessionToken;
  assert.equal(f.call({action:'list_submisi_terhitung',sessionToken}).status,'success');
  f.properties.set('WRAP_ADMIN_KEY',wrapKey);
  assert.match(f.call({action:'buat_rekap_submisi',sessionToken}).message,/Belum ada pegawai|belum dikonfirmasi/);
  assert.equal(f.call({action:'list_pendukung',sessionToken,adminReadOnly:true}).status,'success');
  f.people.rows[1][3]='pegawai';
  assert.match(f.call({action:'list_submisi_terhitung',sessionToken,role:'admin'}).message,/Hanya Admin/);
  assert.equal(f.call({action:'list_pendukung',sessionToken,adminReadOnly:true}).status,'error');
  assert.equal(f.call({action:'list_submisi_terhitung',sessionToken:'forged'}).status,'error');
});

test('legacy Admin PIN attempts are rate limited and expired sessions fail closed', () => {
  const f=fixture();f.properties.set('LEGACY_ADMIN_PIN','062419');
  const login=f.call({action:'login_admin',pin:'062419'});
  const key=f.context.activitySessionKey_('admin',login.adminSessionToken);
  f.properties.set(key,JSON.stringify({pinHash:f.context.digest_('062419'),expires:0}));
  assert.throws(()=>f.context.requireSubmissionReader_({adminSessionToken:login.adminSessionToken}),/Sesi berakhir/);
  for(let i=0;i<5;i++)assert.match(f.call({action:'login_admin',pin:'wrong'}).message,/PIN salah/);
  assert.match(f.call({action:'login_admin',pin:'062419'}).message,/Terlalu banyak/);
});
test('Tukin export writes saved deduction to I and retains K formula on repeated generation', () => {
  const f=consolidatedFixture();f.scope.modul='tukin';f.scope.periode='11-06-2026 s/d 10-07-2026';
  f.master.getSheetByName('REKAP_TUKIN').rows[1][3]=f.scope.periode;
  const saved=confirmRecap(f);assert.equal(saved.status,'success',saved.message);
  const payload=recapRequest(f);
  const result=f.call(payload);assert.equal(result.status,'success',result.message);
  assert.equal(result.files[0].name,'Rekap Potongan Tunjangan Kinerja Agustus 2026 PNS Dit Bangdes');
  const sheet=f.books.get(result.files[0].fileId).getSheetByName('Tukin_Agustus');
  assert.equal(sheet.rows[9][8],saved.calculation.totals.potonganAbsensi);
  assert.equal(sheet.rows[9][11],saved.calculation.amount.tarif);
  assert.equal(typeof sheet.rows[9][11],'number');
  assert.equal(sheet.rows[8][7],'Tanggal');
  assert.equal(sheet.rows[9][10],'=I10*30%+J10*70%');
  for(const output of result.files){
    const tab=f.books.get(output.fileId).getSheetByName('Tukin_Agustus');
    assert.equal(tab.rows[2][3],'Agustus 2026');assert.equal(tab.rows[3][3],f.scope.periode);
    assert.equal(tab.rows[9][3],'Agustus');assert.equal(tab.rows[9][4],2026);
  }
  assert.equal(f.books.get(result.files[1].fileId).getSheetByName('Tukin_Agustus').rows[9][8],'');
  assert.equal(f.call(payload).files[0].fileId,result.files[0].fileId);
});

test('Director uses ordinary K/M formulas with saved zero I/J inputs and repairs old wrappers or literal zeros',()=>{
  const f=consolidatedFixture();f.scope.modul='tukin';f.scope.periode='11-06-2026 s/d 10-07-2026';
  f.master.getSheetByName('REKAP_TUKIN').rows[1][3]=f.scope.periode;
  const employee=f.master.getSheetByName('Data_Pegawai').rows[1];employee[13]='Direktur Pembangunan';employee[18]='70%';
  f.working.rows[7][3]='11:00';f.recapBook.getSheetByName(f.context.BASELINE_SHEET).rows[7][3]='11:00';
  const saved=confirmRecap(f);assert.equal(saved.status,'success',saved.message);
  assert.equal(saved.calculation.totals.potonganAbsensi,0);assert.equal(saved.calculation.amount.persenPotongan,0);assert.equal(saved.calculation.amount.potongan,0);
  const template=f.books.get(f.context.SUBMISSION_TEMPLATES.tukin.PNS).getSheetByName('TUKIN_BULAN');template.rows[9][12]='=L10*K10/100';
  template.rows[9][6]=70; // Even a non-100 SKP must not penalize an exempt Director.
  const request=recapRequest(f), first=f.call(request);assert.equal(first.status,'success',first.message);
  const book=f.books.get(first.files[0].fileId), tab=book.getSheetByName('Tukin_Agustus'), id=tab.getSheetId();
  assert.equal(tab.rows[9][8],0);assert.equal(typeof tab.rows[9][8],'number');
  assert.equal(tab.rows[9][9],0);
  assert.equal(tab.rows[9][10],template.rows[9][10]);
  assert.equal(tab.rows[9][12],template.rows[9][12]);
  tab.setName('TUKIN_BULAN');tab.rows[9][10]='=IF(N("PKP_DIREKTUR_TUKIN")=0,0,(I10*30%+J10*70%))';
  employee[13]='Analis';employee[16]=9999999;
  const again=f.call(request);assert.equal(again.status,'success',again.message);
  assert.equal(again.files[0].fileId,first.files[0].fileId);assert.equal(tab.getSheetId(),id);assert.equal(tab.getName(),'Tukin_Agustus');
  assert.equal(tab.rows[9][11],saved.calculation.amount.tarif);assert.equal(tab.rows[9][12],'=L10*K10/100');
  assert.equal(tab.rows[9][10],'=I10*30%+J10*70%');
  // Repair either old wrapper separator and the previous literal-zero export.
  for(const separator of [',',';',null]) {
    tab.rows[9][10]='=IF(N("PKP_DIREKTUR_TUKIN")=0'+separator+'0'+separator+'(I10*30%+J10*70%))';
    tab.rows[9][12]='=IF(N("PKP_DIREKTUR_NETTO")=0'+separator+'L10'+separator+'(L10*K10/100))';
    if(separator===null){tab.rows[9][10]=0;tab.rows[9][12]=0;}
    const repaired=f.call(request);assert.equal(repaired.status,'success',repaired.message);
    assert.equal(repaired.files[0].fileId,first.files[0].fileId);
    assert.equal(tab.getSheetId(),id);
    assert.equal(tab.rows[9][8],0);assert.equal(tab.rows[9][9],0);
    assert.equal(tab.rows[9][11],saved.calculation.amount.tarif);
    assert.equal(tab.getRange(10,11).getFormulas()[0][0],'=I10*30%+J10*70%');
    assert.equal(tab.getRange(10,13).getFormulas()[0][0],'=L10*K10/100');
    const percentage=tab.rows[9][8]*0.3+tab.rows[9][9]*0.7;
    assert.equal(percentage,0);assert.equal(tab.rows[9][11]*percentage/100,0);
  }
  assert.equal(template.rows[9][10],'=I10*30%+J10*70%');
  assert.equal(template.rows[9][12],'=L10*K10/100');
  assert.equal(template.rows[9][9],'=100-G10');
  const resubmitted=confirmRecap(f);assert.equal(resubmitted.status,'success',resubmitted.message);
  assert.equal(f.call(request).status,'success');assert.equal(tab.rows[9][12],'=L10*K10/100');
  assert.equal(tab.rows[9][10],'=I10*30%+J10*70%');
  assert.equal(tab.rows[9][9],resubmitted.calculation.amount.potonganSkp);
  assert.equal(tab.rows[9][8],resubmitted.calculation.totals.potonganAbsensi);
  assert.ok(tab.rows[9][9]>0);
  const percentage=tab.rows[9][8]*0.3+tab.rows[9][9]*0.7;
  assert.ok(Math.abs(percentage-resubmitted.calculation.amount.persenPotongan)<0.0001);
});

test('Director zero percentage survives six-step submit, personal recap, legacy reload and aggregate generation',()=>{
  const f=consolidatedFixture();f.scope.modul='tukin';f.scope.periode='11-06-2026 s/d 10-07-2026';
  f.master.getSheetByName('REKAP_TUKIN').rows[1][3]=f.scope.periode;
  const people=f.master.getSheetByName('Data_Pegawai');
  people.rows[0][4]='PIN';people.rows[1][4]='012345';people.rows[1][13]='Direktur Pembangunan Perumahan Perdesaan';people.rows[1][18]='';
  const sheetData=Array.from({length:30},(_,i)=>{
    const day=new Date(Date.UTC(2026,5,11+i)), row=Array(22).fill('');
    row[0]=i+1;row[1]='Hari';row[2]=day.toISOString().slice(0,10);row[3]='-';row[4]='-';row[21]=[0,6].includes(day.getUTCDay())?'Libur':'WFO';return row;
  });
  const auth={adminKey:wrapKey};
  assert.equal(f.rawCall({...auth,sheetData,ringkasan:{}}).status,'success');
  const preview=f.rawCall({...auth,action:'proses_bukti'});assert.equal(preview.status,'success',preview.message);
  const saved=f.rawCall({...auth,action:'simpan_rekap_final',sixStep:true,confirmed:true,revision:preview.revision,adjustments:{invalid:'ignored for director'}});
  assert.equal(saved.status,'success',saved.message);assert.equal(saved.calculation.complete,true);assert.deepEqual(saved.adjustments,{});
  assert.equal(saved.calculation.amount.persenPotongan,0);assert.equal(saved.calculation.amount.netto,6349000);
  assert.equal(f.rawCall({...auth,action:'submit_rekap_final',confirmed:true,revision:saved.revision}).submitted,true);
  const request=recapRequest(f), roster=f.rawCall({...request,action:'list_pegawai_submisi'});
  assert.equal(roster.employees[0].submitted,true);
  const token=f.rawCall({action:'login_pegawai',pin:'012345'}).sessionToken;
  const annual=f.rawCall({action:'rekap_pegawai_tahunan',sessionToken:token,year:2026});
  assert.equal(annual.months.find(month=>month.month===8).netto,6349000);
  f.recapBook.sheets.delete('_HASIL_PERHITUNGAN');
  const restored=f.context.readSavedFinalResult_(f.context.finalState_(f.scope));
  assert.equal(restored.calculation.amount.persenPotongan,0);assert.equal(restored.calculation.amount.potonganSkp,0);
  const exported=f.rawCall(request);assert.equal(exported.status,'success',exported.message);assert.equal(exported.employees,1);
  const tab=f.books.get(exported.files[0].fileId).getSheetByName('Tukin_Agustus');
  assert.equal(tab.rows[9][8],0);assert.equal(tab.rows[9][9],0);assert.equal(tab.rows[9][10],'=I10*30%+J10*70%');assert.equal(tab.rows[9][12],'=L10*K10/100');assert.equal(tab.rows[9][11],6349000);
});

test('explicit Director resubmit repairs old snapshot and notes without changing historical pay, attendance or evidence',()=>{
  const f=consolidatedFixture();f.scope.modul='tukin';f.scope.periode='11-06-2026 s/d 10-07-2026';
  f.master.getSheetByName('REKAP_TUKIN').rows[1][3]=f.scope.periode;
  const people=f.master.getSheetByName('Data_Pegawai');people.rows[0][4]='PIN';people.rows[1][4]='012345';people.rows[1][13]='Direktur Pembangunan';
  const rows=Array.from({length:30},(_,i)=>{const row=Array(22).fill('');row[0]=i+1;row[1]='Hari';row[2]=new Date(Date.UTC(2026,5,11+i)).toISOString().slice(0,10);row[3]='09:00';row[4]='15:00';row[21]='WFO';return row;});
  assert.equal(f.rawCall({adminKey:wrapKey,sheetData:rows}).status,'success');
  const saved=confirmRecap(f), old=JSON.parse(JSON.stringify(saved));
  old.calculation.version='2026-10-10-director-percent';
  Object.assign(old.calculation.totals,{flexi:2,terlambat:11,psw:7,unadjusted:17,menitTelat:640,menitTanpaPresensi:4080,totalMenit:4720,potonganAbsensi:22.5,adjustmentMonths:{'2026-07':2}});
  old.calculation.amount.persenPotongan=6.75;
  Object.assign(old.calculation.days[0],{tl:3,psw:4,menitTelat:640,menitTanpaPresensi:480,potongan:2.5});
  const state=f.context.finalState_(f.scope);
  f.context.storeFinalResult_(state.saved.book,old);
  f.context.writeCalculationMaster_(state.record,old.calculation,old.note);
  const file=f.files.get(old.note.fileId);file.content='Catatan lama: 4720 menit, 6.75%';
  const unchangedRows=JSON.stringify(state.saved.working.rows), count=f.files.size, attendance={...old.calculation.totals};
  people.rows[1][16]=99999999;people.rows[1][13]='Analis'; // Do not re-read current tariff/title.
  const login=f.rawCall({action:'login_pegawai',pin:'012345'});
  const request={action:'submit_rekap_final',adminKey:wrapKey,revision:old.revision,confirmed:true,applyDirectorZero:true};
  for(const extra of [{adminKey:undefined},{sessionToken:login.sessionToken},{employeeReadOnly:true,sessionToken:login.sessionToken},{confirmed:false},{revision:'stale'}]) assert.equal(f.rawCall({...request,...extra}).status,'error');
  assert.equal(file.content,'Catatan lama: 4720 menit, 6.75%');
  const read=f.context.readSavedFinalResult_(f.context.finalState_(f.scope));assert.equal(read.calculation.amount.persenPotongan,6.75);
  const result=f.rawCall(request);assert.equal(result.status,'success',result.message);assert.equal(result.submitted,true);
  assert.equal(result.savedResult.note.fileId,old.note.fileId);assert.equal(f.files.size,count);
  assert.equal(JSON.stringify(state.saved.working.rows),unchangedRows);
  assert.equal(result.savedResult.calculation.amount.tarif,6349000);assert.equal(result.savedResult.calculation.amount.netto,6349000);
  for(const key of ['masuk','hariKerja','dinas','cuti','tb','libur']) assert.equal(result.savedResult.calculation.totals[key],attendance[key]);
  for(const key of ['flexi','terlambat','psw','unadjusted','totalMenit','potonganAbsensi']) assert.equal(result.savedResult.calculation.totals[key],0);
  assert.equal(result.savedResult.calculation.amount.persenPotongan,0);
  assert.doesNotMatch(file.content,/4720|6\.75|Pada tanggal|Flexi maksimal|TL: 0,5|tetap dihitung adjustment/);
  assert.match(file.content,/Catatan perbaikan diri: 0\. Kekurangan jam kerja: 0 menit/);
  const master=f.master.getSheetByName('REKAP_TUKIN');assert.equal(master.rows[1][master.rows[0].indexOf('Hitung_Potongan_Persen')],0);
  const repaired=f.context.readSavedFinalResult_(f.context.finalState_(f.scope));assert.equal(repaired.calculation.totals.totalMenit,0);
  assert.equal(f.rawCall(request).status,'success');assert.equal(f.files.size,count);
  assert.equal(f.rawCall(recapRequest(f)).status,'success');
  for(const wrong of [{...old,calculation:{...old.calculation,modul:'uang-makan'}},{...old,calculation:{...old.calculation,directorExempt:false}},{...old,calculation:{...old.calculation,amount:{...old.calculation.amount,netto:1}}}])assert.throws(()=>f.context.directorZeroSavedResult_(wrong));
});

test('meal regeneration migrates previous long tab names and rejects ambiguous target sheets',()=>{
  const f=consolidatedFixture(), request=recapRequest(f), first=f.call(request);
  assert.equal(first.status,'success',first.message);
  const book=f.books.get(first.files[0].fileId), tab=book.getSheetByName('Uang Makan_Juli'), id=tab.getSheetId();
  tab.setName('Uang Makan Juli 2026');
  assert.equal(f.call(request).status,'success');assert.equal(tab.getSheetId(),id);assert.equal(tab.getName(),'Uang Makan_Juli');
  book.insertSheet('UM_BULAN');const before=JSON.stringify(tab.rows);
  assert.match(f.call(request).message,/dua sheet/);assert.equal(JSON.stringify(tab.rows),before);
});

test('Tukin regeneration pins submitted rates, uses Jakarta generation date and preserves template formulas', () => {
  for (const legacy of [false,true]) {
    const f=consolidatedFixture(); f.scope.modul='tukin'; f.scope.periode='11-06-2026 s/d 10-07-2026';
    f.master.getSheetByName('REKAP_TUKIN').rows[1][3]=f.scope.periode;
    const saved=confirmRecap(f); assert.equal(saved.status,'success',saved.message);
    if(legacy)f.recapBook.sheets.delete('_HASIL_PERHITUNGAN');
    const clock=sessionClock(f); clock.advance(16*3600000+59*60000);
    const request=recapRequest(f);
    f.master.getSheetByName('Data_Pegawai').rows[1][16]=99999999;
    const first=f.call(request); assert.equal(first.status,'success',first.message);
    const sheet=f.books.get(first.files[0].fileId).getSheetByName('Tukin_Agustus');
    assert.equal(sheet.rows[9][11],saved.calculation.amount.tarif);
    assert.equal(f.context.isoDate_(sheet.rows[9][7]),'2026-10-10');
    const empty=f.books.get(first.files[1].fileId).getSheetByName('Tukin_Agustus');
    assert.equal(empty.rows[9][11],''); assert.equal(empty.rows[9][7],'');
    sheet.rows[8][7]='TGL.'; sheet.rows[9][7]=1; sheet.rows[9][11]=123;
    sheet.rows[9][12]='=L10*(100-K10)/100';
    clock.advance(2*60000); // Already 11 October in Jakarta.
    const again=f.call(request); assert.equal(again.status,'success',again.message);
    assert.equal(again.files[0].fileId,first.files[0].fileId);
    assert.equal(f.context.isoDate_(sheet.rows[9][7]),'2026-10-11');
    assert.equal(sheet.rows[9][11],saved.calculation.amount.tarif);
    assert.equal(sheet.rows[8][7],'Tanggal');
    assert.equal(sheet.rows[9][12],'=L10*(100-K10)/100');
    assert.equal(sheet.rows[9][10],'=I10*30%+J10*70%');
    assert.equal(f.books.get(f.context.SUBMISSION_TEMPLATES.tukin.PNS).getSheetByName('TUKIN_BULAN').rows[9][11],'');
  }
});

test('Tukin export refuses missing saved rate rather than substituting live master rates', () => {
  const f=consolidatedFixture(); f.scope.modul='tukin'; f.scope.periode='11-06-2026 s/d 10-07-2026';
  const master=f.master.getSheetByName('REKAP_TUKIN'); master.rows[1][3]=f.scope.periode;
  assert.equal(confirmRecap(f).status,'success');
  f.recapBook.sheets.delete('_HASIL_PERHITUNGAN');
  master.rows[1][master.rows[0].indexOf('Hitung_Tarif')]='';
  const count=f.files.size, result=f.call(recapRequest(f));
  assert.equal(result.status,'error'); assert.match(result.message,/Besaran Tukin saat submit/);
  assert.equal(f.files.size,count);
});
test('normalizing presentation does not invalidate a legacy saved revision with unpadded clocks', () => {
  const f=fixture();payrollFixture(f);assert.equal(confirmRecap(f).status,'success');
  f.recapBook.sheets.delete('_HASIL_PERHITUNGAN');
  const baseline=f.recapBook.getSheetByName(f.context.BASELINE_SHEET);
  f.working.rows[7][3]='8:10';baseline.rows[7][3]='8:10';
  const legacyState=f.context.finalState_(f.scope);baseline.getRange(1,2).setValue(legacyState.revision);
  const result=f.call({action:'preview_rekap_final'});
  assert.equal(result.status,'success',result.message);assert.equal(result.rows[2].datang,'08:10');assert.ok(result.savedResult);
});
const attendanceDay = extra => ({tanggal:'2026-07-06',keterangan:'WFO',datang:'07:30',pulang:'16:00',jamKerja:'biasa',...extra});
function payrollFixture(f) {
  const headers=Array(21).fill(''), row=Array(21).fill('');
  headers[0]='NIP'; headers[1]='Nama'; headers[13]='Jabatan'; headers[16]='Besaran Tunjangan Kinerja'; headers[17]='Nilai SKP'; headers[18]='Persentase SKP'; headers[19]='Besaran Uang Makan'; headers[20]='Potongan Uang Makan';
  row[0]=f.scope.nip; row[1]=f.scope.nama; row[13]='Analis'; row[16]=6349000; row[17]=17; row[18]='100%'; row[19]=37000; row[20]='5.00%';
  f.master.getSheetByName('Data_Pegawai').rows=[headers,row];
}
test('Director title words exempt only Tukin deductions, preserving final claim status counts',()=>{
  const f=fixture();
  const rows=[attendanceDay({datang:'11:00',pulang:'12:00'}),attendanceDay({datang:'-',pulang:'-',adjusted:1,adjustments:{datang:{fileId:'x',time:'09:00'}}}),
    ...['Dinas','Cuti','Libur','TB','WFA','WFH'].map(keterangan=>attendanceDay({keterangan,datang:'-',pulang:'-'}))];
  for(const jabatan of ['Direktur','DIREKTUR PEMBANGUNAN PERUMAHAN PERDESAAN','Plt. Direktur Pembangunan',' direktur ']) for(const skp of [null,70,100]) {
    const calc=f.context.calculateAttendance_(rows,{...employeeRate,jabatan,skp},'tukin');
    f.context.addAdjustmentEvidenceCounts_(calc,[{jenisDokumen:'lupa_absen',fileId:'x'}]);
    assert.equal(calc.directorExempt,true);assert.equal(calc.complete,true);
    assert.equal(calc.totals.masuk,4);assert.equal(calc.totals.dinas,1);assert.equal(calc.totals.cuti,1);assert.equal(calc.totals.tb,1);assert.equal(calc.totals.libur,1);
    for(const key of ['flexi','terlambat','psw','tidakMasuk','menitTelat','menitPsw','menitTanpaPresensi','totalMenit','potonganAbsensi','lupaAbsen','adjusted','unadjusted','adjustmentReported','adjustmentDocuments']) assert.equal(calc.totals[key],0,key);
    assert.equal(calc.amount.persenPotongan,0);assert.equal(calc.amount.netto,employeeRate.tukin);assert.equal(calc.amount.potongan,0);assert.equal(calc.amount.potonganSkp,0);
    assert.ok(calc.days.every(day=>day.flexiMenit===0&&day.tl===0&&day.psw===0&&day.potongan===0));
  }
  for(const jabatan of ['Analis Direktorat','Direktural','Admin','']) {
    const calc=f.context.calculateAttendance_([rows[0]],{...employeeRate,jabatan},'tukin');
    assert.equal(calc.directorExempt,false);assert.ok(calc.amount.potongan>0);
  }
  const missing=f.context.calculateAttendance_([rows[0]],{...employeeRate,jabatan:'Direktur',tukin:null},'tukin');
  assert.equal(missing.complete,false);assert.equal(missing.amount.netto,null);
  const noSkp=f.context.calculateAttendance_([rows[0]],{...employeeRate,jabatan:'Direktur',skp:null},'tukin');
  assert.equal(noSkp.complete,true);assert.equal(noSkp.amount.persenPotongan,0);
});

test('Director meal pay uses WFO/WFA status without clocks, excludes Dinas and retains tax',()=>{
  const f=fixture(),rows=['WFO','WFA','Dinas','Cuti','Libur'].map(keterangan=>attendanceDay({keterangan,datang:'-',pulang:'-'}));
  const director=f.context.calculateAttendance_(rows,{...employeeRate,jabatan:'Direktur Pembangunan'},'uang-makan');
  assert.equal(director.directorExempt,false);assert.equal(director.totals.masuk,2);assert.equal(director.totals.dinas,1);
  assert.equal(director.amount.bruto,74000);assert.equal(director.amount.potongan,3700);assert.equal(director.amount.netto,70300);
  const regular=f.context.calculateAttendance_(rows,employeeRate,'uang-makan');
  assert.equal(regular.totals.masuk,0);assert.equal(regular.amount.netto,0);
});

test('Director rules are server-derived, survive save/reload, and honor SPT claims in both modules',()=>{
  for(const modul of ['tukin','uang-makan']) {
    const f=fixture();payrollFixture(f);
    const person=f.master.getSheetByName('Data_Pegawai').rows[1];person[13]='Direktur Pembangunan Perumahan Perdesaan';person[18]='70%';
    f.working.rows.slice(5,-1).forEach(row=>{row[3]='-';row[4]='-';});
    const spt=f.master.getSheetByName('REKAP_SPT').rows[1];spt[4]='6 Juli 2026';spt[5]='6 Juli 2026';
    const call=p=>f.call({modul,...p});
    assert.equal(call({action:'klaim_spt',sourceUrl:f.spt.getUrl()}).status,'success');
    const preview=call({action:'proses_bukti'});
    assert.equal(preview.presenceByStatus,true);assert.equal(preview.directorExempt,modul==='tukin');
    const saved=call({action:'simpan_rekap_final',revision:preview.revision,confirmed:true});
    assert.equal(saved.status,'success',saved.message);assert.equal(saved.calculation.totals.masuk,2);assert.equal(saved.calculation.totals.dinas,1);
    assert.equal(saved.calculation.amount.netto,modul==='tukin'?6349000:70300);
    if(modul==='tukin') {
      assert.deepEqual(saved.adjustments,{});
      const note=f.files.get(saved.note.fileId).content;assert.match(note,/Rumus Direktur/);assert.match(note,/potongan rupiah Rp0/);
      assert.equal(saved.calculation.amount.persenPotongan,0);assert.equal(saved.calculation.totals.potonganAbsensi,0);
      const master=f.master.getSheetByName('REKAP_TUKIN');
      for(const key of ['Hitung_Potongan_Absensi_Persen','Hitung_Potongan_Persen','Hitung_Potongan_Rp','Hitung_Hari_Flexi','Hitung_Hari_Terlambat','Hitung_Hari_PSW','Hitung_Tidak_Absen']) assert.equal(master.rows[1][master.rows[0].indexOf(key)],0,key);
    }
    person[13]='Analis';person[16]=9999999;
    const reopened=call({action:'preview_rekap_final'}).savedResult;
    assert.equal(reopened.calculation.amount.netto,saved.calculation.amount.netto);
    assert.equal(reopened.calculation.directorExempt,modul==='tukin');
    assert.equal(reopened.calculation.presenceByStatus,true);
    if(modul==='tukin') {
      const spoof=call({action:'simpan_rekap_final',revision:reopened.revision,confirmed:true,directorExempt:true,presenceByStatus:true,jabatan:'Direktur'});
      assert.equal(spoof.calculation.directorExempt,false);assert.ok(spoof.calculation.amount.potongan>0);
    }
  }
});

test('regular and Ramadan lateness boundaries, flexi and Friday departure are exact', () => {
  const f=fixture(), run=extra=>f.context.calculateAttendance_([attendanceDay(extra)],employeeRate,'tukin');
  for (const [jamKerja, start] of [['biasa',450],['ramadan',480]]) {
    for (const [delay,level] of [[0,0],[1,0],[60,0],[61,1],[90,1],[91,2],[120,2],[121,3]]) {
      const datang=f.context.attendanceClock_(start+delay);
      const result=run({jamKerja,datang,pulang:'23:59'});
      assert.equal(result.days[0].tl,level,`${jamKerja} ${datang}`);
      assert.equal(result.totals.flexi,delay>0&&delay<=60?1:0);
      assert.equal(result.days[0].flexiMenit,Math.min(60,delay));
    }
  }
  assert.equal(run({datang:'09:00',pulang:'17:00'}).days[0].wajibPulang,'17:00');
  assert.equal(run({tanggal:'2026-07-10',datang:'08:30',pulang:'17:30'}).days[0].wajibPulang,'17:30');
  assert.equal(run({tanggal:'2026-07-10',jamKerja:'ramadan',datang:'09:00',pulang:'16:30'}).days[0].wajibPulang,'16:30');
  assert.equal(run({datang:'07:00'}).totals.potonganAbsensi,0);
});
test('PSW boundaries apply to flexi-adjusted end without double-counting missing punches', () => {
  const f=fixture();
  for (const [early,level,rate] of [[0,0,0],[1,1,.5],[30,1,.5],[31,2,.75],[60,2,.75],[61,3,1],[90,3,1],[91,4,1.25]]) {
    const calc=f.context.calculateAttendance_([attendanceDay({datang:'08:00',pulang:f.context.attendanceClock_(990-early)})],employeeRate,'tukin');
    assert.equal(calc.days[0].psw,level); assert.equal(calc.totals.potonganAbsensi,rate);
  }
  const both=f.context.calculateAttendance_([attendanceDay({datang:'-',pulang:'-'})],employeeRate,'uang-makan');
  assert.equal(both.totals.masuk,0); assert.equal(both.totals.tidakMasuk,1);
  assert.equal(both.totals.potonganAbsensi,2.5); assert.equal(both.totals.menitTanpaPresensi,480);
  assert.equal(both.totals.totalMenit,480); assert.equal(both.amount.netto,0);
  for (const times of [{datang:'-',pulang:'16:00'},{datang:'07:30',pulang:'-'}]) {
    const one=f.context.calculateAttendance_([attendanceDay(times)],employeeRate,'tukin');
    assert.equal(one.totals.potonganAbsensi,1.25); assert.equal(one.totals.totalMenit,240); assert.equal(one.totals.masuk,1);
  }
});
test('exempt statuses, WFH eligibility, money formula and missing rates', () => {
  const f=fixture();
  const rows=['Dinas','Cuti Tahunan','TB','Tugas Belajar','Libur'].map(keterangan=>attendanceDay({keterangan,datang:'-',pulang:'-'}));
  rows.push(attendanceDay({keterangan:'WFH'}),attendanceDay({keterangan:'WFA'}));
  const meal=f.context.calculateAttendance_(rows,employeeRate,'uang-makan');
  assert.equal(meal.totals.hariKerja,6); assert.equal(meal.totals.masuk,2); assert.equal(meal.totals.tb,2);
  assert.equal(meal.totals.potonganAbsensi,0); assert.equal(meal.totals.totalMenit,0);
  assert.equal(meal.amount.bruto,74000); assert.equal(meal.amount.potongan,3700); assert.equal(meal.amount.netto,70300);
  const tukin=f.context.calculateAttendance_([attendanceDay({datang:'-',pulang:'-'})],{...employeeRate,skp:90},'tukin');
  assert.equal(tukin.amount.persenPotongan,7.75); assert.equal(tukin.amount.potongan,492048); assert.equal(tukin.amount.netto,5856952);
  const missing=f.context.calculateAttendance_([attendanceDay()],{...employeeRate,uangMakan:null},'uang-makan');
  assert.equal(missing.amount.netto,null); assert.equal(missing.complete,false);
  assert.equal(f.context.calculateAttendance_([attendanceDay({keterangan:'Izin'})],employeeRate,'tukin').complete,false);
  assert.throws(()=>f.context.calculateAttendance_([attendanceDay({datang:'25:00'})],employeeRate,'tukin'),/tidak valid/);
});
test('Data_Pegawai selects S percentage not R score, handles number formats and duplicate NIP safely', () => {
  const f=fixture(); payrollFixture(f);
  let employee=f.context.payrollEmployee_(f.scope);
  assert.equal(employee.skp,100); assert.equal(employee.tukin,6349000); assert.equal(employee.uangMakan,37000); assert.equal(employee.pajak,5);
  assert.equal(f.context.payrollNumber_(.15,'15.00%',true),15);
  assert.equal(f.context.payrollNumber_('15,00%','15,00%',true),15);
  assert.equal(f.context.payrollNumber_(1,'100%',true),100);
  assert.equal(f.context.payrollNumber_('41,000','41,000',false),41000);
  assert.equal(f.context.payrollNumber_('Rp 6.349.000','',false),6349000);
  assert.equal(f.context.payrollNumber_('','',true),null);
  f.master.getSheetByName('Data_Pegawai').rows.push([...f.master.getSheetByName('Data_Pegawai').rows[1]]);
  assert.throws(()=>f.context.payrollEmployee_(f.scope),/tepat satu/);
});
test('final confirmation persists schedule, flags, master results and a single tracked note per module', () => {
  for (const modul of ['uang-makan','tukin']) {
    const f=fixture(); payrollFixture(f);
    const call=payload=>f.call({modul,...payload});
    const preview=call({action:'proses_bukti'});
    const save=call({action:'simpan_rekap_final',revision:preview.revision,confirmed:true,schedules:{'2026-07-06':'ramadan'}});
    assert.equal(save.status,'success',save.message); assert.equal(save.calculation.complete,true);
    assert.equal(save.rows[2].jamKerja,'ramadan');
    assert.equal(call({action:'preview_rekap_final'}).rows[2].jamKerja,'ramadan');
    assert.equal(f.working.rows[7][5],'v'); assert.equal(f.working.rows[7][15],'v');
    assert.equal(f.working.rows[5][14],'v'); assert.equal(f.working.rows[5][15],'');
    const note=f.files.get(save.note.fileId); assert.equal(note.parent,f.destination); assert.doesNotMatch(note.content,/Pada tanggal 2026-07-06/);
    const master=f.master.getSheetByName(modul==='tukin'?'REKAP_TUKIN':'REKAP_UANG_MAKAN');
    assert.equal(master.rows[1][master.rows[0].indexOf('Hitung_Hari_Masuk')],3);
    const count=f.files.size;
    const retry=call({action:'simpan_rekap_final',revision:save.revision,confirmed:true,schedules:{'2026-07-06':'biasa'}});
    assert.equal(retry.status,'success',retry.message); assert.equal(retry.note.fileId,save.note.fileId); assert.equal(f.files.size,count);
    assert.match(note.content,/jam biasa/);
    const before=JSON.stringify(f.working.rows);
    assert.equal(call({action:'simpan_rekap_final',revision:retry.revision,confirmed:true,schedules:{'2026-07-06':'bad'}}).status,'error');
    assert.equal(call({action:'simpan_rekap_final',revision:retry.revision,confirmed:true,schedules:{'2027-01-01':'biasa'}}).status,'error');
    assert.equal(JSON.stringify(f.working.rows),before);
    call({action:'klaim_spt',sourceUrl:f.spt.getUrl()});
    assert.equal(master.rows[1][master.rows[0].indexOf('Hitung_Status')],'Menunggu perhitungan ulang');
    assert.equal(master.rows[1][master.rows[0].indexOf('Hitung_Netto')],'');
  }
});
test('all requested tick columns are mapped, times and unrelated formulas survive', () => {
  const f=fixture(), statuses=['WFO','WFA','WFH','Dinas','Cuti','TB','Tugas Belajar','Libur'];
  f.context.writeAttendanceFlags_(f.working,statuses.map(keterangan=>attendanceDay({keterangan})));
  const flags=f.working.rows.slice(5,13).map(row=>[5,10,12,13,14,15].map(i=>row[i]));
  assert.deepEqual(flags,[['v','','','','','v'],['v','','','','','v'],['v','','','','','v'],['','v','','','','v'],['','','','v','','v'],['','','v','','','v'],['','','v','','','v'],['','','','','v','']]);
});

test('missing or zero rates are distinct and client monetary payload cannot override Data_Pegawai', () => {
  const f=fixture(); payrollFixture(f);
  let preview=f.call({action:'proses_bukti'});
  let result=f.call({action:'simpan_rekap_final',revision:preview.revision,confirmed:true,calculation:{netto:999999999},uangMakan:999999999});
  assert.equal(result.calculation.amount.tarif,37000);
  const pegawai=f.master.getSheetByName('Data_Pegawai').rows[1];
  pegawai[19]=0; pegawai[20]='0%';
  result=f.call({action:'simpan_rekap_final',revision:result.revision,confirmed:true});
  assert.equal(result.calculation.complete,true); assert.equal(result.calculation.amount.netto,0);
  pegawai[19]='';
  result=f.call({action:'simpan_rekap_final',revision:result.revision,confirmed:true});
  assert.equal(result.calculation.complete,false); assert.equal(result.calculation.amount.netto,null);
});
test('note is reused after tab 2 replacement, but moved note and service failures cannot overwrite other files', () => {
  const f=fixture(); payrollFixture(f);
  f.working.rows = [...f.working.rows.slice(0,5), ...fullJulyAttendance(f.working.rows.slice(5,-1)), ['TOTAL']];
  let preview=f.call({action:'proses_bukti'});
  const result=f.call({action:'simpan_rekap_final',revision:preview.revision,confirmed:true});
  const note=f.files.get(result.note.fileId), originalContent=note.content;
  assert.equal(f.call({sheetData:f.recapBook.getSheetByName('_PRESENSI_TAB2').rows.slice(5),ringkasan:{}}).status,'success');
  preview=f.call({action:'proses_bukti'});
  const updated=f.call({action:'simpan_rekap_final',revision:preview.revision,confirmed:true});
  assert.equal(updated.status,'success',updated.message); assert.equal(updated.note.fileId,note.id);
  assert.equal([...f.files.values()].filter(file=>file.mime==='text/plain').length,1);
  note.parent=f.otherDestination;
  const invalid=f.call({action:'simpan_rekap_final',revision:updated.revision,confirmed:true});
  assert.equal(invalid.status,'error'); assert.match(invalid.message,/Lokasi\/jenis/); assert.equal(note.content,originalContent);
  assert.equal(f.spt.trashed,false); assert.equal(f.cuti.trashed,false); assert.equal(f.untouched.trashed,false);
});
test('new summary columns append without overwriting custom formulas/headers', () => {
  const f=fixture(); payrollFixture(f);
  const sheet=f.master.getSheetByName('REKAP_UANG_MAKAN');
  sheet.rows[0].push('Hitung_Lainnya','Catatan Pengelola'); sheet.rows[1].push('=SUM(E2:F2)','Jangan ditimpa');
  const preview=f.call({action:'proses_bukti'});
  assert.equal(f.call({action:'simpan_rekap_final',confirmed:true,revision:preview.revision}).status,'success');
  f.call({action:'klaim_spt',sourceUrl:f.spt.getUrl()});
  assert.deepEqual(sheet.rows[1].slice(10,12),['=SUM(E2:F2)','Jangan ditimpa']);
});

const uploadExtra = (f, extra = {}) => f.call({action:'upload_pendukung_lain',jenisDokumen:'lupa_absen',fileName:'Surat.pdf',fileBase64:Buffer.from('%PDF-test').toString('base64'),requestId:'extra-1',...extra});

test('tab 3 assigns sequential names; tab 4 never renames evidence when adjustments change', () => {
  for (const modul of ['uang-makan','tukin']) {
    const f=fixture();payrollFixture(f);f.working.rows[7][3]='-';f.working.rows[8][3]='-';
    const doc=uploadExtra(f,{modul,fileName:'Surat.PNG'}).document;
    const untouched=uploadExtra(f,{modul,requestId:'unused'}).document;
    const file=f.files.get(doc.fileId), parent=file.parent, oldName=file.name, count=f.files.size;
    const preview=f.call({action:'proses_bukti',modul});
    assert.equal(file.name,oldName);assert.equal(preview.status,'success');
    const corrections={'2026-07-06':{datang:{fileId:doc.fileId,time:'07:30'}}};
    const saved=f.call({action:'simpan_rekap_final',modul,confirmed:true,revision:preview.revision,adjustments:corrections});
    assert.equal(saved.status,'success',saved.message);
    const expected=`Surat Lupa Absen_${f.scope.nama}_01_Bukti Dukung ${modul==='tukin'?'Tunjangan Kinerja':'Uang Makan'}.png`;
    assert.equal(oldName,expected);assert.equal(file.name,expected);assert.equal(file.parent,parent);assert.equal(file.trashed,false);
    assert.equal(saved.adjustmentDocuments.find(d=>d.fileId===doc.fileId).fileName,file.name);
    const listed=f.call({action:'list_pendukung',modul});
    assert.equal(listed.processed,true);assert.equal(listed.documents.find(d=>d.fileId===doc.fileId).fileUrl,doc.fileUrl);
    assert.equal(listed.documents.find(d=>d.fileId===untouched.fileId).fileName,untouched.fileName);
    assert.equal(f.call({action:'preview_rekap_final',modul}).revision,saved.revision);
    corrections['2026-07-07']={datang:{fileId:doc.fileId,time:'07:30'}};
    const multi=confirmRecap(f,corrections,{modul});assert.equal(multi.status,'success',multi.message);
    assert.equal(file.name,expected);
    const countAfterSave=f.files.size;
    assert.equal(confirmRecap(f,corrections,{modul}).status,'success');
    assert.equal(f.files.size,countAfterSave);assert.ok(f.files.size>=count); // calculation note only, no evidence copy
    assert.equal(f.context.registryRows_().find(row=>row.fileId===doc.fileId).fileName,file.name);
  }
});

test('invalid tab 4 corrections never rename evidence', () => {
  const f=fixture();payrollFixture(f);f.working.rows[7][3]='-';
  const doc=uploadExtra(f).document, file=f.files.get(doc.fileId), original=file.name;
  const preview=f.call({action:'proses_bukti'});
  for(const extra of [{confirmed:false},{revision:'stale'},{adjustments:{'2026-07-06':{datang:{fileId:'foreign',time:'07:30'}}}}]) {
    const result=f.call({action:'simpan_rekap_final',confirmed:true,revision:preview.revision,adjustments:{'2026-07-06':{datang:{fileId:doc.fileId,time:'07:30'}}},...extra});
    assert.equal(result.status,'error');assert.equal(file.name,original);
    assert.equal(f.context.registryRows_().find(row=>row.fileId===doc.fileId).fileName,original);
  }
});

test('final adjustments need no Drive rename permission and preserve all original names', () => {
  const f=fixture();payrollFixture(f);f.working.rows[7][3]='-';f.working.rows[8][3]='-';
  const a=uploadExtra(f).document,b=uploadExtra(f,{requestId:'second'}).document;
  const first=f.files.get(a.fileId), second=f.files.get(b.fileId), originalA=first.name, originalB=second.name;
  second.setName=()=>{throw Error('Simulated Drive failure');};
  const result=confirmRecap(f,{'2026-07-06':{datang:{fileId:a.fileId,time:'07:30'}},'2026-07-07':{datang:{fileId:b.fileId,time:'07:30'}}});
  assert.equal(result.status,'success',result.message);
  assert.equal(first.name,originalA);assert.equal(second.name,originalB);
  for(const doc of [a,b]){
    assert.equal(f.context.registryRows_().find(row=>row.fileId===doc.fileId).fileName,doc.fileName);
    assert.equal(f.files.get(doc.fileId).trashed,false);
  }
});
const confirmRecap = (f, adjustments = {}, extra = {}) => {
  const p=f.call({action:'proses_bukti',...extra});
  assert.equal(p.status,'success',p.message);
  return f.call({action:'simpan_rekap_final',revision:p.revision,confirmed:true,adjustments,...extra});
};

test('extra upload enforces ten active files server-side, preserves retry IDs and never reuses deleted sequence numbers', () => {
  const f=fixture(), docs=[];
  for(let i=0;i<10;i++) {
    const result=uploadExtra(f,{requestId:`batch-${i}`,jenisDokumen:i%2?'lainnya':'lupa_absen',nama:'Forged Name'});
    assert.equal(result.status,'success',result.message); docs.push(result.document);
    assert.match(result.document.fileName,new RegExp(`_${String(i+1).padStart(2,'0')}_Bukti Dukung Uang Makan\\.pdf$`));
    assert.ok(result.document.fileName.includes(f.scope.nama));assert.ok(!result.document.fileName.includes('Forged'));
  }
  const count=f.files.size;
  assert.equal(uploadExtra(f,{requestId:'batch-0'}).document.fileId,docs[0].fileId);
  assert.match(uploadExtra(f,{requestId:'eleventh'}).message,/Maksimal 10/);
  assert.equal(f.files.size,count);
  assert.equal(f.call({action:'hapus_pendukung',fileId:docs[0].fileId}).status,'success');
  const next=uploadExtra(f,{requestId:'eleventh'});assert.equal(next.status,'success');
  assert.match(next.document.fileName,/_11_Bukti Dukung/);
  assert.equal(uploadExtra(f,{modul:'tukin',requestId:'other-module'}).status,'success');
});
test('extra supporting files upload once, list, process, and safely delete without touching archives', () => {
  const f=fixture();
  for(const type of ['lupa_absen','tugas_belajar','lainnya']) {
    const a=uploadExtra(f,{jenisDokumen:type,requestId:type});
    assert.equal(a.status,'success',a.message);
    assert.equal(a.document.jenisDokumen,type);
    assert.equal(uploadExtra(f,{jenisDokumen:type,requestId:type}).document.fileId,a.document.fileId);
  }
  assert.equal(f.call({action:'list_pendukung'}).documents.length,3);
  const p=f.call({action:'proses_bukti'});
  assert.equal(p.rows[2].keterangan,'WFO'); // TB is proof only.
  assert.equal(p.adjustmentDocuments.length,1);
  assert.equal(f.call({action:'hapus_pendukung',fileId:p.adjustmentDocuments[0].fileId}).status,'success');
  assert.equal(f.call({action:'list_pendukung'}).processed,false);
  assert.equal(f.spt.trashed,false); assert.equal(f.cuti.trashed,false);
});
test('extra upload rejects invalid types/files, foreign scope, and reused removed request', () => {
  const f=fixture(), before=f.files.size;
  for(const payload of [{jenisDokumen:'spt'},{fileName:'bad.exe'},{fileBase64:'bad<>data'},{fileBase64:''},{nip:'9999'}]) assert.equal(uploadExtra(f,payload).status,'error');
  assert.equal(f.files.size,before);
  const a=uploadExtra(f); f.call({action:'hapus_pendukung',fileId:a.document.fileId});
  assert.equal(uploadExtra(f).status,'error');
});

test('letters count without clock edits in both modules, without changing attendance or payment', () => {
  for (const modul of ['uang-makan','tukin']) {
    const f=fixture(); payrollFixture(f);
    const before=confirmRecap(f,{}, {modul});
    const doc=uploadExtra(f,{modul}).document;
    uploadExtra(f,{modul,jenisDokumen:'tugas_belajar',requestId:'tb'});
    const result=confirmRecap(f,{}, {modul});
    assert.equal(result.status,'success',result.message);
    const t=result.calculation.totals;
    assert.equal(t.adjustmentDocuments,1);assert.equal(t.adjustmentDocumentsUnclaimed,1);
    assert.equal(t.adjustmentReported,1);assert.equal(t.adjusted,0);assert.equal(t.unadjusted,0);
    assert.equal(t.masuk,before.calculation.totals.masuk);
    assert.deepEqual(result.calculation.amount,before.calculation.amount);
    const master=f.master.getSheetByName(modul==='tukin'?'REKAP_TUKIN':'REKAP_UANG_MAKAN');
    assert.equal(master.rows[1][master.rows[0].indexOf('Hitung_Adjustment_Tercatat')],1);
    assert.equal(master.rows[1][master.rows[0].indexOf('Hitung_Surat_Lupa_Absen')],1);
    assert.equal(f.call({action:'hapus_pendukung',fileId:doc.fileId,modul}).status,'success');
    assert.equal(master.rows[1][master.rows[0].indexOf('Hitung_Adjustment_Tercatat')],'');
    assert.equal(confirmRecap(f,{}, {modul}).calculation.totals.adjustmentReported,0);
  }
});

test('missing punches remain penalized even when a letter is uploaded without a clock correction', () => {
  const f=fixture();payrollFixture(f);f.working.rows[7][3]='-';f.working.rows[7][4]='-';
  const before=confirmRecap(f);
  uploadExtra(f);
  const result=confirmRecap(f), t=result.calculation.totals;
  assert.equal(result.status,'success',result.message);
  assert.equal(t.adjustmentReported,1);assert.equal(t.adjusted,0);assert.equal(t.unadjusted,2);
  assert.equal(t.masuk,before.calculation.totals.masuk);
  assert.deepEqual(result.calculation.amount,before.calculation.amount);
  const day=result.calculation.days.find(row=>row.tanggal==='2026-07-06');
  assert.equal(day.potongan,2.5);assert.equal(day.menitTanpaPresensi,480);
  assert.match(f.files.get(result.note.fileId).content,/Tidak Absen datang dan pulang/);
});

test('one letter for multiple corrections is not double counted; only active scoped letters reach wrap', () => {
  const f=fixture();payrollFixture(f);f.working.rows[7][3]='-';f.working.rows[8][3]='-';
  const used=uploadExtra(f).document;
  uploadExtra(f,{requestId:'unclaimed'});
  const removed=uploadExtra(f,{requestId:'removed'}).document;
  f.call({action:'hapus_pendukung',fileId:removed.fileId});
  uploadExtra(f,{modul:'tukin',requestId:'other-module'});
  const corrections=Object.fromEntries(['2026-07-06','2026-07-07'].map(date=>[date,{datang:{fileId:used.fileId,time:'07:30'}}]));
  const result=confirmRecap(f,corrections), t=result.calculation.totals;
  assert.equal(result.status,'success',result.message);
  assert.equal(t.adjustmentDocuments,2);assert.equal(t.adjustmentDocumentsUsed,1);
  assert.equal(t.adjustmentDocumentsUnclaimed,1);assert.equal(t.adjusted,2);assert.equal(t.adjustmentReported,3);
  assert.equal(confirmRecap(f,corrections).calculation.totals.adjustmentReported,3);
  const live=f.call({action:'rekap_bulanan',month:'2026-07'});
  assert.equal(live.employees[0].adjustmentReported,3);
  assert.equal(f.call({action:'rekap_bulanan',month:'2026-08'}).employees.length,0);
  publishWrap(f);
  const published=f.call({action:'rekap_bulanan_publik'});
  assert.equal(published.employees[0].adjustmentReported,3);
  assert.equal(published.employees[0].adjustmentDocuments,2);
  assert.equal(JSON.stringify(published).includes(used.fileId),false);
});

test('calculation notes list only dates with TL, PSW or missing punches', () => {
  const f=fixture();payrollFixture(f);
  const dateRows=[
    ['2026-07-06','WFO','07:30','16:00'], ['2026-07-07','WFA','08:00','16:30'],
    ['2026-07-08','WFO','09:00','17:00'], ['2026-07-09','WFH','07:30','15:30'],
    ['2026-07-10','WFO','-','17:00'], ['2026-07-11','Libur','-','-'],
    ['2026-07-13','Dinas','-','-'], ['2026-07-14','Cuti','-','-'], ['2026-07-15','TB','-','-'],
  ];
  f.working.rows=Array.from({length:5},()=>[]).concat(dateRows.map(([date,status,arrival,departure],i)=>{
    const row=Array(22).fill('');row[0]=i+1;row[2]=date;row[3]=arrival;row[4]=departure;row[21]=status;return row;
  }),[['TOTAL']]);
  const result=confirmRecap(f);assert.equal(result.status,'success',result.message);
  const note=f.files.get(result.note.fileId).content;
  const dates=[...note.matchAll(/Pada tanggal (\d{4}-\d{2}-\d{2})/g)].map(match=>match[1]);
  assert.deepEqual(dates,['2026-07-08','2026-07-09','2026-07-10']);
  assert.match(note,/TL 1/);assert.match(note,/PSW 1/);assert.match(note,/Tidak Absen datang/);
  assert.match(note,/RINGKASAN/);assert.match(note,/Diterima:/);
});
test('one correction of two missing punches earns a meal, retains other penalty, persists audit and monthly counts', () => {
  const f=fixture(); payrollFixture(f); f.working.rows[7][3]='-'; f.working.rows[7][4]='-';
  const doc=uploadExtra(f).document;
  const adjustments={'2026-07-06':{datang:{fileId:doc.fileId,time:'07:30'}}};
  const result=confirmRecap(f,adjustments);
  assert.equal(result.status,'success',result.message);
  const day=result.calculation.days.find(d=>d.tanggal==='2026-07-06');
  assert.equal(day.lupaAbsen,2); assert.equal(day.adjusted,1); assert.equal(day.tl,0); assert.equal(day.psw,4); assert.equal(day.potongan,1.25);
  assert.equal(result.calculation.totals.masuk,3); assert.equal(result.calculation.totals.unadjusted,1);
  assert.equal(f.working.rows[7][3],'07:30');
  assert.equal(f.recapBook.getSheetByName('_PRESENSI_TAB2').rows[7][3],'-');
  const p=f.call({action:'preview_rekap_final'});
  assert.deepEqual(p.adjustments,adjustments); assert.equal(p.revision,result.revision);
  const report=f.call({action:'rekap_bulanan',month:'2026-07'});
  assert.equal(report.status,'success',report.message); assert.equal(report.employees[0].lupaAbsen,2); assert.equal(report.employees[0].adjusted,1); assert.equal(report.employees[0].unadjusted,1);
  assert.equal(report.documents.length,1);
  assert.equal(report.employees[0].tukin,undefined); assert.equal(report.employees[0].pin,undefined);
  assert.match(f.files.get(result.note.fileId).content,/adjustment datang menjadi 07:30/);
  const again=confirmRecap(f,adjustments); assert.equal(again.status,'success',again.message);
  assert.equal(f.master.getSheetByName('REKAP_HARIAN'),null);
  assert.equal(f.master.getSheetByName('ADJUSTMENT_PRESENSI').rows.length,2);
});
test('adjustments reject both punches, existing clock, holidays, invalid time or unrelated proof', () => {
  const f=fixture(); f.working.rows[7][3]='-'; f.working.rows[7][4]='-';
  const doc=uploadExtra(f).document, c={fileId:doc.fileId,time:'07:30'};
  for(const a of [
    {'2026-07-06':{datang:c,pulang:{...c,time:'16:00'}}},
    {'2026-07-07':{datang:c}}, {'2026-07-04':{datang:c}},
    {'2026-07-06':{datang:{...c,time:'24:00'}}}, {'2026-07-06':{datang:{...c,fileId:f.spt.id}}}
  ]) assert.equal(confirmRecap(f,a).status,'error');
  assert.equal(f.master.getSheetByName('ADJUSTMENT_PRESENSI'),null);
});
test('deleting proof removes correction option; reprocess and confirm restore baseline times and invalidate analytics', () => {
  const f=fixture();payrollFixture(f);f.working.rows[7][3]='-';
  const doc=uploadExtra(f).document;
  assert.equal(confirmRecap(f,{'2026-07-06':{datang:{fileId:doc.fileId,time:'07:30'}}}).status,'success');
  f.call({action:'hapus_pendukung',fileId:doc.fileId});
  assert.equal(f.call({action:'rekap_bulanan',month:'2026-07'}).employees.length,0);
  const p=f.call({action:'proses_bukti'});assert.deepEqual(p.adjustments,{});assert.equal(f.working.rows[7][3],'-');
  assert.equal(confirmRecap(f).status,'success');
  assert.equal(f.master.getSheetByName('ADJUSTMENT_PRESENSI').rows[1][8],'inactive');
});
test('quota is four distinct calendar-month events shared across modules, not number of letters', () => {
  const f=fixture(), doc=uploadExtra(f).document;
  const other=uploadExtra(f,{modul:'tukin',requestId:'tukin'}).document;
  const ledger=f.context.adjustmentSheet_(true);
  for(const date of ['2026-07-01','2026-07-02','2026-07-03','2026-07-06']) ledger.appendRow(['tukin','123456',f.scope.periode,f.spreadsheet.id,date,'datang','07:30',other.fileId,'active','2026-07-20']);
  f.working.rows[7][3]='-';f.working.rows[8][3]='-';
  // Reusing the same event in UM is not a fifth occurrence.
  assert.equal(confirmRecap(f,{'2026-07-06':{datang:{fileId:doc.fileId,time:'07:30'}}}).status,'success');
  const rejected=confirmRecap(f,{'2026-07-07':{datang:{fileId:doc.fileId,time:'07:30'}}});
  assert.equal(rejected.status,'error');assert.match(rejected.message,/Kuota 4/);
});
test('cross-module correction cannot change the approved time or correct both missing punches', () => {
  const f=fixture(), doc=uploadExtra(f).document, other=uploadExtra(f,{modul:'tukin',requestId:'tukin'}).document;
  f.working.rows[7][3]='-';f.working.rows[7][4]='-';
  f.context.adjustmentSheet_(true).appendRow(['tukin','123456',f.scope.periode,f.spreadsheet.id,'2026-07-06','datang','07:30',other.fileId,'active','2026-07-20']);
  assert.match(confirmRecap(f,{'2026-07-06':{datang:{fileId:doc.fileId,time:'08:30'}}}).message,/berbeda/);
  assert.match(confirmRecap(f,{'2026-07-06':{pulang:{fileId:doc.fileId,time:'16:00'}}}).message,/hanya satu/);
});
test('monthly report uses calendar dates, current saved results, employee unit, and source module only', () => {
  const f=fixture();payrollFixture(f);
  const people=f.master.getSheetByName('Data_Pegawai');people.rows[0][14]='SubUnitKerja';people.rows[1][14]='Subbagian Tata Usaha';
  assert.equal(confirmRecap(f).status,'success');
  const report=f.call({action:'rekap_bulanan',month:'2026-07'});
  assert.equal(report.employees.length,1);assert.equal(report.employees[0].unit,'Subbagian Tata Usaha');assert.equal(report.daily.length,6);
  assert.equal(f.call({action:'rekap_bulanan',modul:'tukin',month:'2026-07'}).status,'error');
  assert.equal(f.call({action:'rekap_bulanan',month:'2026-08'}).employees.length,0);
  f.master.getSheetByName('REKAP_UANG_MAKAN').rows.splice(1,1);
  assert.equal(f.call({action:'rekap_bulanan',month:'2026-07'}).employees.length,0);
});

test('Tukin allows eight adjustments split four per month, but not five in one calendar month', () => {
  const f=fixture(), doc=uploadExtra(f,{modul:'tukin'}).document;
  const state={record:{...f.scope,modul:'tukin',folderId:f.destination.id,spreadsheetId:f.spreadsheet.id},documents:[doc]};
  const dates=['2026-06-22','2026-06-23','2026-06-24','2026-06-25','2026-07-01','2026-07-02','2026-07-03','2026-07-06'];
  const rows=dates.map(tanggal=>({tanggal,keterangan:'WFO',datang:'-',pulang:'16:00',libur:false}));
  const adjustments=Object.fromEntries(dates.map(date=>[date,{datang:{fileId:doc.fileId,time:'07:30'}}]));
  assert.equal(Object.keys(f.context.validateAdjustments_(state,rows,adjustments)).length,8);
  const calc=f.context.calculateAttendance_(f.context.applyAdjustments_(rows,adjustments),{uangMakan:37000,pajak:5,tukin:6349000,skp:100,warnings:[]},'tukin');
  assert.equal(calc.totals.adjusted,8);assert.equal(calc.totals.adjustmentMonths['2026-06'],4);assert.equal(calc.totals.adjustmentMonths['2026-07'],4);
  rows.push({tanggal:'2026-07-07',keterangan:'WFO',datang:'-',pulang:'16:00'});
  adjustments['2026-07-07']={datang:{fileId:doc.fileId,time:'07:30'}};
  assert.throws(()=>f.context.validateAdjustments_(state,rows,adjustments),/Kuota 4/);
});
test('wrap excludes partial-month records even when they have a newer calculation', () => {
  const f=fixture();payrollFixture(f);assert.equal(confirmRecap(f).status,'success');
  const copyBook=new f.Book(), copyFile=new f.File('overlap_spreadsheet', 'Second recap',f.destination,'application/vnd.google-apps.spreadsheet');
  f.books.set(copyFile.id,copyBook);
  const copySheet=copyBook.insertSheet('Rekap'); copySheet.rows=f.working.rows.map(r=>[...r]);
  copySheet.rows[7][3]='07:00';
  const master=f.master.getSheetByName('REKAP_UANG_MAKAN'), copy=[...master.rows[1]];
  copy[3]='02-07-2026 s/d 31-07-2026'; copy[9]=copyFile.id; master.appendRow(copy);
  const scope={...f.scope,periode:copy[3]};
  const preview=f.call({...scope,action:'proses_bukti'});
  assert.equal(f.call({...scope,action:'simpan_rekap_final',confirmed:true,revision:preview.revision}).status,'success');
  copyBook.getSheetByName('_PRESENSI_TAB2').getRange(1,3).setValue('2099-01-01T00:00:00Z');
  const report=f.call({action:'rekap_bulanan',month:'2026-07'});
  assert.equal(report.status,'success',report.message);
  assert.equal(report.daily.length,6);
  assert.equal(report.daily.find(r=>r.tanggal==='2026-07-06').arrival,490);
  assert.equal(report.coverage.submitted,1);
  assert.equal(f.master.getSheetByName('REKAP_HARIAN'),null);
});

test('legacy daily sheet is neither read nor changed and monthly reports survive its removal', () => {
  const f=fixture();payrollFixture(f);
  const legacy=f.master.insertSheet('REKAP_HARIAN');legacy.appendRow(['Old data, unrelated headers']);
  const before=JSON.stringify(legacy.rows);
  legacy.getDataRange=()=>{throw new Error('Legacy sheet must not be read');};
  assert.equal(confirmRecap(f).status,'success');
  assert.equal(f.call({action:'rekap_bulanan',month:'2026-07'}).daily.length,6);
  assert.equal(JSON.stringify(legacy.rows),before);
  f.master.sheets.delete('REKAP_HARIAN');
  assert.equal(f.call({action:'rekap_bulanan_publik',month:'2026-07'}).status,'success');
  assert.equal(f.master.getSheetByName('REKAP_HARIAN'),null);
});

test('monthly reads only selected month and reports unavailable source instead of silently zeroing attendance', () => {
  const f=fixture();payrollFixture(f);assert.equal(confirmRecap(f).status,'success');
  f.books.delete(f.spreadsheet.id);
  assert.equal(f.call({action:'rekap_bulanan',month:'2026-08'}).status,'success');
  const result=f.call({action:'rekap_bulanan',month:'2026-07'});
  assert.equal(result.status,'success');assert.equal(result.coverage.unavailable,1);
  assert.equal(result.employees.length,0);assert.match(result.issues[0].message,/belum dapat dibaca/);
});
test('manual clock tampering remains rejected even when a valid correction exists', () => {
  const f=fixture();f.working.rows[7][3]='-';const doc=uploadExtra(f).document;
  assert.equal(confirmRecap(f,{'2026-07-06':{datang:{fileId:doc.fileId,time:'07:30'}}}).status,'success');
  f.working.rows[7][3]='05:00';
  assert.match(f.call({action:'preview_rekap_final'}).message,/Tanggal\/jam/);
});

test('published recap is read-only and excludes NIP, payroll, source IDs, and individual daily records', () => {
  const f=fixture();payrollFixture(f);
  f.call({action:'klaim_spt',sourceUrl:f.spt.getUrl()});
  assert.equal(confirmRecap(f).status,'success');
  publishWrap(f);
  const before=JSON.stringify([...f.master.sheets].map(([name,sheet])=>[name,sheet.rows])), files=f.files.size;
  const report=f.call({action:'rekap_bulanan_publik',month:'2026-07'});
  assert.equal(report.status,'success',report.message);assert.equal(report.publicView,true);
  assert.equal(report.employees[0].nama,f.scope.nama);assert.equal(report.employees[0].nip,'public-0');
  assert.ok(report.daily.every(row=>!('nip' in row)&&row.count>0&&typeof row.unit==='string'));
  assert.ok(report.documents.every(row=>!('id' in row)&&!('nip' in row)&&row.count>0));
  for(const privateValue of [f.scope.nip,f.spt.id,f.spreadsheet.id,f.destination.id,'6349000']) assert.equal(JSON.stringify(report).includes(privateValue),false);
  assert.equal(JSON.stringify([...f.master.sheets].map(([name,sheet])=>[name,sheet.rows])),before);
  assert.equal(f.files.size,files);
});
test('public recap is unpublished without creating sheets and ignores caller month/module', () => {
  const f=fixture(), count=f.master.sheets.size;
  const result=f.call({action:'rekap_bulanan_publik',month:'2026-08'});
  assert.equal(result.status,'success');assert.deepEqual(result.employees,[]);assert.deepEqual(result.daily,[]);
  assert.equal(f.master.sheets.size,count);
  assert.equal(result.published,false);assert.equal(result.publicationVersion,1);
  assert.deepEqual(f.call({action:'rekap_bulanan_publik',modul:'invalid'}),result);
  assert.deepEqual(f.call({action:'rekap_bulanan_publik',month:'2026-99'}),result);
});

test('wrap reads actual clocks, all work modes, flexi boundaries and full calendar coverage', () => {
  const f=fixture();payrollFixture(f);
  f.working.rows=Array.from({length:5},()=>[]);
  for(let day=1;day<=31;day++){
    const date=`2026-07-${String(day).padStart(2,'0')}`, weekday=new Date(date+'T12:00:00Z').getUTCDay();
    const row=Array(22).fill('');row[0]=day;row[1]='Hari';row[2]=date;row[3]='07:30';row[4]='18:00';row[21]=[0,6].includes(weekday)?'Libur':'WFO';
    if(day===1)row[3]='05:45';
    if(day===6){row[3]='07:45';row[21]='WFA';}
    if(day===7){row[3]='08:30';row[21]='WFH';}
    if(day===8)row[3]='08:31';
    if(day===9)row[3]='-';
    f.working.rows.push(row);
  }
  f.working.rows.push(['TOTAL']);
  assert.equal(confirmRecap(f).status,'success');
  // Reading wrap must not revalidate claims or use master summary clock guesses.
  f.context.finalState_=()=>{throw Error('Should read the saved recap directly');};
  const result=f.call({action:'rekap_bulanan',month:'2026-07'}), person=result.employees[0];
  assert.equal(result.wrapVersion,2);assert.equal(person.completeMonth,true);assert.equal(person.recordedDays,31);
  assert.equal(person.masuk,23);assert.equal(person.hariKerja,23);assert.equal(person.assessed,23);
  assert.equal(person.flexi,2);assert.equal(person.flexiMinutes,75);assert.equal(person.terlambat,2);
  assert.equal(Math.min(...result.daily.filter(r=>r.arrival!==null).map(r=>r.arrival)),345);
  assert.equal(result.daily.find(r=>r.tanggal==='2026-07-09').arrival,null);
  assert.equal(result.daily.find(r=>r.tanggal==='2026-07-09').hadir,true);
  assert.equal(result.coverage.incomplete,0);
});

test('wrap keeps healthy employees while another source fails; retry includes newly available data', () => {
  const f=fixture();payrollFixture(f);assert.equal(confirmRecap(f).status,'success');
  const sheet=f.master.getSheetByName('REKAP_UANG_MAKAN'), other=[...sheet.rows[1]];
  other[1]='999999';other[2]='Pegawai Baru';other[9]='missing_file_999';sheet.appendRow(other);
  let result=f.call({action:'rekap_bulanan',month:'2026-07'});
  assert.equal(result.employees.length,1);assert.equal(result.coverage.unavailable,1);assert.equal(result.coverage.submitted,2);
  publishWrap(f);
  const pub=f.call({action:'rekap_bulanan_publik',month:'2026-07'});
  assert.equal(pub.coverage.unavailable,1);assert.equal(pub.issues,undefined);assert.equal(JSON.stringify(pub).includes('999999'),false);
  sheet.rows[2][9]=f.spreadsheet.id;
  result=f.call({action:'rekap_bulanan',month:'2026-07'});
  assert.equal(result.employees.length,2);assert.equal(result.coverage.unavailable,0);
  // Newest record suppresses the old completed record, not a fallback to stale data.
  const pending=[...sheet.rows[1]];pending[sheet.rows[0].indexOf('Hitung_Status')]='Perlu hitung ulang';sheet.appendRow(pending);
  result=f.call({action:'rekap_bulanan',month:'2026-07'});
  assert.equal(result.employees.length,1);assert.equal(result.coverage.pending,1);assert.equal(result.coverage.submitted,2);
});

test('wrap validates full-month ranges including leap years and gets SubUnit options from employee master', () => {
  const f=fixture();
  assert.equal(f.context.recapCalendarMonth_('01-02-2024 s/d 29-02-2024'),'2024-02');
  assert.equal(f.context.recapCalendarMonth_('01-02-2026 s/d 28-02-2026'),'2026-02');
  assert.equal(f.context.recapCalendarMonth_('11-07-2026 s/d 10-08-2026'),'');
  assert.equal(f.context.recapCalendarMonth_('01-07-2026 s/d 30-07-2026'),'');
  f.master.getSheetByName('Data_Pegawai').rows=[['NIP','Nama','SubUnitKerja'],['123456','Pegawai','Unit A'],['999','Belum Upload','Unit B']];
  const result=f.call({action:'rekap_bulanan',month:'2026-07'});
  assert.deepEqual(result.units,['Unit A','Unit B']);assert.equal(result.coverage.pending,1);
  assert.equal(f.master.getSheetByName('REKAP_HARIAN'),null);
});

test('snapshot writes require a configured secret, never a browser role or login PIN', () => {
  const f=fixture();payrollFixture(f);confirmRecap(f);
  const before=JSON.stringify([...f.master.sheets].map(([name,sheet])=>[name,sheet.rows]));
  for(const action of ['simpan_wrap_bulanan','publikasikan_wrap_bulanan']) {
    assert.match(f.call({action,month:'2026-07',role:'super_admin',confirmed:true}).message,/WRAP_ADMIN_KEY/);
    f.properties.set('WRAP_ADMIN_KEY',wrapKey);
    assert.match(f.call({action,month:'2026-07',role:'super_admin',adminKey:'wrong',confirmed:true}).message,/tidak valid/);
    f.properties.delete('WRAP_ADMIN_KEY');
  }
  assert.equal(JSON.stringify([...f.master.sheets].map(([name,sheet])=>[name,sheet.rows])),before);
});

test('saving is idempotent, stores only server data, and does not publish a draft', () => {
  const f=fixture();payrollFixture(f);confirmRecap(f);
  const a=saveWrap(f);assert.equal(a.status,'success',a.message);
  const snapshot=f.master.getSheetByName('REKAP_WRAP_SNAPSHOT'), count=snapshot.rows.length;
  const b=saveWrap(f);assert.equal(b.draft.snapshotId,a.draft.snapshotId);assert.equal(snapshot.rows.length,count);
  assert.equal(f.call({action:'rekap_bulanan_publik'}).published,false);
  const preview=f.call({action:'rekap_bulanan',month:'2026-07'});
  const c=f.call({action:'simpan_wrap_bulanan',month:'2026-07',adminKey:wrapKey,previewRevision:preview.previewRevision,employees:[{nama:'FORGED'}]});
  assert.equal(c.status,'success');assert.equal(JSON.stringify(snapshot.rows).includes('FORGED'),false);
  assert.equal(JSON.stringify(snapshot.rows).includes('6349000'),false);
  assert.equal(JSON.stringify(preview).includes(wrapKey),false);
  assert.equal(a.publication.drafts.length,1);assert.equal(a.publication.published,null);
});

test('stale preview and empty month cannot overwrite a saved snapshot', () => {
  const f=fixture();payrollFixture(f);confirmRecap(f);const saved=saveWrap(f);
  const preview=f.call({action:'rekap_bulanan',month:'2026-07'});
  f.master.getSheetByName('Data_Pegawai').rows[1][1]='Nama Baru';
  assert.match(f.call({action:'simpan_wrap_bulanan',month:'2026-07',adminKey:wrapKey,previewRevision:preview.previewRevision}).message,/berubah sejak preview/);
  assert.match(saveWrap(f,'2026-08').message,/Belum ada rekap/);
  assert.equal(f.context.wrapCatalog_().drafts[0].snapshotId,saved.draft.snapshotId);
});

test('published snapshot is pinned across fresh source data, later drafts and public month arguments', () => {
  const f=fixture();payrollFixture(f);confirmRecap(f);const first=publishWrap(f);
  const original=f.call({action:'rekap_bulanan_publik'});
  f.master.getSheetByName('Data_Pegawai').rows[1][1]='Nama Baru';
  const second=saveWrap(f);assert.notEqual(second.draft.snapshotId,first.draft.snapshotId);
  assert.deepEqual(f.call({action:'rekap_bulanan_publik',month:'2026-08'}),original);
  const publish={action:'publikasikan_wrap_bulanan',month:'2026-07',snapshotId:second.draft.snapshotId,adminKey:wrapKey};
  assert.match(f.call(publish).message,/Konfirmasi/);
  assert.match(f.call({...publish,confirmed:true,snapshotId:first.draft.snapshotId}).message,/Versi tersimpan berubah/);
  assert.equal(f.call({...publish,confirmed:true}).status,'success');
  assert.equal(f.call({action:'rekap_bulanan_publik'}).employees[0].nama,'Nama Baru');
  const active=f.properties.get('WRAP_PUBLISHED_V1');
  assert.equal(f.call({...publish,confirmed:true}).status,'success');
  assert.equal(f.properties.get('WRAP_PUBLISHED_V1'),active);
});

test('publication replaces from row 2, shrinks and grows without leading gaps', () => {
  const f=fixture();payrollFixture(f);confirmRecap(f);publishWrap(f);
  const sheet=f.master.getSheetByName('REKAP_WRAP_PUBLIK');
  for(const name of ['Changed', 'Large '.repeat(12000).trim(), 'Small']) {
    f.master.getSheetByName('Data_Pegawai').rows[1][1]=name;
    publishWrap(f);
    const meta=JSON.parse(f.properties.get('WRAP_PUBLISHED_V1'));
    assert.equal(meta.row,2);
    assert.equal(sheet.rows.filter(row=>row[0]===meta.snapshotId).length,meta.count);
    assert.ok(sheet.rows.slice(1,meta.count+1).every(row=>row[0]===meta.snapshotId));
    assert.ok(sheet.rows.slice(meta.count+1).every(row=>row.every(value=>value==='')));
    assert.equal(f.call({action:'rekap_bulanan_publik'}).employees[0].nama,name);
  }
});

test('republishing the same snapshot repairs legacy blank rows without changing drafts', () => {
  const f=fixture();payrollFixture(f);confirmRecap(f);const saved=publishWrap(f);
  const sheet=f.master.getSheetByName('REKAP_WRAP_PUBLIK');
  const draftBefore=JSON.stringify(f.master.getSheetByName('REKAP_WRAP_SNAPSHOT').rows);
  const meta=JSON.parse(f.properties.get('WRAP_PUBLISHED_V1'));
  sheet.rows.splice(1,0,...Array.from({length:6},()=>Array(6).fill('')));
  meta.row=8;f.properties.set('WRAP_PUBLISHED_V1',JSON.stringify(meta));
  const before=f.call({action:'rekap_bulanan_publik'});
  assert.equal(f.call({action:'publikasikan_wrap_bulanan',month:meta.month,snapshotId:saved.draft.snapshotId,adminKey:wrapKey,confirmed:true}).status,'success');
  assert.equal(JSON.parse(f.properties.get('WRAP_PUBLISHED_V1')).row,2);
  assert.deepEqual(f.call({action:'rekap_bulanan_publik'}),before);
  assert.equal(JSON.stringify(f.master.getSheetByName('REKAP_WRAP_SNAPSHOT').rows),draftBefore);
});

test('failed public verification restores previous rows and publication pointer', () => {
  const f=fixture();payrollFixture(f);confirmRecap(f);publishWrap(f);
  const before=f.call({action:'rekap_bulanan_publik'}), pointer=f.properties.get('WRAP_PUBLISHED_V1');
  f.master.getSheetByName('Data_Pegawai').rows[1][1]='Replacement '.repeat(5000);
  const saved=saveWrap(f);
  const original=f.context.readWrapSnapshot_;let fail=true;
  f.context.readWrapSnapshot_=meta=>{
    if(meta.sheet==='REKAP_WRAP_PUBLIK'&&fail){fail=false;throw Error('Injected verification failure');}
    return original(meta);
  };
  const result=f.call({action:'publikasikan_wrap_bulanan',month:'2026-07',snapshotId:saved.draft.snapshotId,adminKey:wrapKey,confirmed:true});
  assert.equal(result.status,'error');
  assert.equal(f.properties.get('WRAP_PUBLISHED_V1'),pointer);
  assert.deepEqual(f.call({action:'rekap_bulanan_publik'}),before);
});

test('public serving reads only persisted snapshot, never live employee data or Drive', () => {
  const f=fixture();payrollFixture(f);confirmRecap(f);publishWrap(f);
  const expected=f.call({action:'rekap_bulanan_publik'});
  f.context.monthlyRecap_=()=>{throw Error('Live scan forbidden');};
  f.context.DriveApp.getFileById=()=>{throw Error('Drive forbidden');};
  f.context.DriveApp.getFolderById=()=>{throw Error('Drive forbidden');};
  f.context.SpreadsheetApp.openById=id=>{assert.equal(id,f.context.TARGET_SPREADSHEET_ID);return {getSheetByName:name=>{assert.equal(name,'REKAP_WRAP_PUBLIK');return f.master.getSheetByName(name);}};};
  assert.deepEqual(f.call({action:'rekap_bulanan_publik'}),expected);
});

test('admin can publish an older saved month even when live source is unavailable', () => {
  const f=fixture();payrollFixture(f);confirmRecap(f);const july=publishWrap(f);
  const source=f.context.monthlyRecap_({month:'2026-07'});
  f.context.monthlyRecap_=({month})=>({...source,month,months:[month]});
  const august=publishWrap(f,'2026-08');
  assert.equal(f.call({action:'rekap_bulanan_publik'}).month,'2026-08');
  f.context.monthlyRecap_=()=>{throw Error('Live source not available');};
  assert.equal(f.call({action:'publikasikan_wrap_bulanan',month:'2026-07',adminKey:wrapKey,confirmed:true,snapshotId:july.draft.snapshotId}).status,'success');
  assert.equal(f.call({action:'rekap_bulanan_publik',month:august.draft.month}).month,'2026-07');
  assert.equal(f.context.wrapCatalog_().drafts.length,2);
});

test('snapshot chunking is formula-safe, validates checksums, and fails closed on corruption', () => {
  const f=fixture();payrollFixture(f);confirmRecap(f);
  f.master.getSheetByName('Data_Pegawai').rows[1][1]='=HYPERLINK("https://invalid.test")'.repeat(2000);
  publishWrap(f);
  const meta=JSON.parse(f.properties.get('WRAP_PUBLISHED_V1')), sheet=f.master.getSheetByName(meta.sheet);
  assert.ok(meta.count>1);
  assert.ok(sheet.rows.slice(1).every(row=>row[5].startsWith('json:')&&row[5].length<=24005));
  sheet.rows[1][5]=sheet.rows[1][5].replace('HYPERLINK','HYPERLINX');
  const result=f.call({action:'rekap_bulanan_publik'});
  assert.equal(result.status,'error');assert.equal(result.employees,undefined);assert.match(result.message,/tersimpan belum dapat dibaca/);
  const draft=f.master.getSheetByName('REKAP_WRAP_SNAPSHOT');draft.rows[1][5]=draft.rows[1][5].replace('HYPERLINK','HYPERLINX');
  assert.equal(f.call({action:'publikasikan_wrap_bulanan',month:'2026-07',adminKey:wrapKey,confirmed:true,snapshotId:meta.snapshotId}).status,'error');
});

test('failed snapshot append never changes the published or draft pointers', () => {
  const f=fixture();payrollFixture(f);confirmRecap(f);publishWrap(f);
  const before=Object.fromEntries(f.properties);
  f.master.getSheetByName('Data_Pegawai').rows[1][1]='Changed';
  f.context.SpreadsheetApp.flush=()=>{throw Error('Sheet write failure');};
  assert.equal(saveWrap(f).status,'error');
  assert.deepEqual(Object.fromEntries(f.properties),before);
  assert.equal(f.call({action:'rekap_bulanan_publik'}).employees[0].nama,f.scope.nama);
});

test('public podium accepts only the configured profile thumbnail URL, no arbitrary image source', () => {
  const f=fixture();
  const data={month:'2026-07',employees:[{nip:'private',nama:'Uji',unit:'A',photo:'https://lh3.googleusercontent.com/d/profile_test_123=s200'},{nip:'other',nama:'Other',unit:'A',photo:'javascript:alert(1)'}],daily:[],documents:[],units:['A']};
  const safe=f.context.publicWrapData_(data);
  assert.equal(safe.employees[0].photo,data.employees[0].photo);
  assert.equal(safe.employees[1].photo,'');assert.equal(safe.employees[0].nip,'public-0');
});

test('new submissions use authoritative Jenis_ASN; old registered folders keep their IDs', () => {
  for(const type of ['PNS','PPPK'])for(const modul of ['uang-makan','tukin']){
    const f=fixture(), table=f.master.getSheetByName('Data_Pegawai');
    table.rows[0]=Array.from({length:8},(_,i)=>table.rows[0][i]||'');table.rows[1]=Array.from({length:8},(_,i)=>table.rows[1][i]||'');
    table.rows[0][7]='Jenis_ASN';table.rows[1][7]=type;
    const old=f.context.resolvePresensiFolder_({...f.scope,modul});assert.equal(old.getId(),f.destination.id);
    const period=modul==='uang-makan'?'01-08-2026 s/d 31-08-2026':'11-08-2026 s/d 10-09-2026';
    const created=f.context.resolvePresensiFolder_({...f.scope,modul,periode:period,bulanTahun:'Agustus 2026',jenisAsn:type==='PNS'?'PPPK':'PNS'});
    assert.equal(created.getName(),'Nama Khusus Pegawai');assert.equal(created.parent.getName(),type);
    assert.equal(created.parent.parent.getName(),modul==='uang-makan'?'Uang Makan_08_Agustus':'Tunjangan Kinerja_10_Oktober');
  }
});

test('unknown or ambiguous Jenis_ASN fails before creating any folder', () => {
  const f=fixture(), count=f.folders.size;
  const input={...f.scope,periode:'01-08-2026 s/d 31-08-2026',bulanTahun:'Agustus 2026'};
  assert.throws(()=>f.context.resolvePresensiFolder_(input),/Jenis_ASN/);
  const sheet=f.master.getSheetByName('Data_Pegawai');sheet.rows[0][7]='Jenis_ASN';sheet.rows[1][7]='UNKNOWN';
  assert.throws(()=>f.context.resolvePresensiFolder_(input),/PNS atau PPPK/);
  sheet.rows[1][7]='PNS';sheet.rows.push([...sheet.rows[1]]);
  assert.throws(()=>f.context.resolvePresensiFolder_(input),/tepat satu/);
  assert.equal(f.folders.size,count);
});

test('future submission folders include payment year and never reuse another year employee folder',()=>{
  const f=fixture(),table=f.master.getSheetByName('Data_Pegawai');table.rows[0][7]='Jenis_ASN';table.rows[1][7]='PNS';
  const meal=year=>({...f.scope,periode:`01-08-${year} s/d 31-08-${year}`,bulanTahun:`Agustus ${year}`});
  const old=f.context.resolvePresensiFolder_(meal(2026)),future=f.context.resolvePresensiFolder_(meal(2027));
  assert.notEqual(old.getId(),future.getId());assert.equal(future.parent.parent.getName(),'Uang Makan_08_Agustus_2027');
  assert.equal(f.context.resolvePresensiFolder_(meal(2027)).getId(),future.getId());
  const tukin=f.context.resolvePresensiFolder_({...f.scope,modul:'tukin',periode:'11-11-2026 s/d 10-12-2026',bulanTahun:'Januari 2027'});
  assert.equal(tukin.parent.parent.getName(),'Tunjangan Kinerja_01_Januari_2027');
  assert.equal(f.context.resolvePresensiFolder_(f.scope).getId(),f.destination.id);
});

function legacyFolderFixture(){
  const f=fixture(), root=f.folders.get(f.context.ROOT_FOLDER_ID), records=[];
  const employee=f.master.getSheetByName('Data_Pegawai');employee.rows[0][7]='Jenis_ASN';employee.rows[1][7]='PNS';
  for(const [modul,category,periodName,period] of [
    ['uang-makan','BUKTI_UANG_MAKAN','Uang Makan_08_Agustus','01-08-2026 s/d 31-08-2026'],
    ['tukin','BUKTI_TUNJANGAN_KINERJA','Tunjangan Kinerja_10_Oktober','11-08-2026 s/d 10-09-2026'],
  ]){
    const parent=root.createFolder(category).createFolder(periodName), folder=parent.createFolder('Pegawai Contoh');
    const file=new f.File(`legacy_sheet_${modul}`, 'Rekap',folder,'application/vnd.google-apps.spreadsheet');
    const sheet=f.master.getSheetByName(modul==='tukin'?'REKAP_TUKIN':'REKAP_UANG_MAKAN');
    sheet.rows.push(['timestamp',f.scope.nip,f.scope.nama,period,'','','','',folder.getUrl(),file.id]);
    records.push({modul,folder,file,parent});
  }
  return {...f,records};
}

test('PNS migration dry run is read-only; execution preserves every existing ID, link and master row', () => {
  const f=legacyFolderFixture(), before=JSON.stringify([...f.master.sheets].map(([name,sheet])=>[name,sheet.rows])), count=f.folders.size;
  const plan=f.context.previewMigrasiFolderPNS2026();
  assert.equal(plan.ready,true,JSON.stringify(plan.errors));assert.equal(plan.items.length,2);assert.equal(f.folders.size,count);
  assert.throws(()=>f.context.jalankanMigrasiFolderPNS2026(),/MIGRASI_PNS_2026_REVISI/);
  assert.equal(f.folders.size,count);
  f.properties.set('MIGRASI_PNS_2026_REVISI',plan.revision);
  const moved=f.context.jalankanMigrasiFolderPNS2026();assert.equal(moved.moved.length,2);assert.equal(moved.failed.length,0);
  f.records.forEach(({folder,file,parent})=>{assert.equal(folder.parent.getName(),'PNS');assert.equal(folder.parent.parent,parent);assert.equal(file.parent,folder);assert.equal(file.trashed,false);});
  assert.equal(JSON.stringify([...f.master.sheets].map(([name,sheet])=>[name,sheet.rows])),before);
  assert.equal(f.context.jalankanMigrasiFolderPNS2026().already.length,2);
  assert.equal(f.call({action:'jalankanMigrasiFolderPNS2026'}).status,'error');
});

test('migration blocks PPPK, duplicate destinations, unrelated periods and foreign folders', () => {
  for(const issue of ['type','collision','shared','foreign']){
    const f=legacyFolderFixture(), record=f.records[0];
    if(issue==='type')f.master.getSheetByName('Data_Pegawai').rows[1][7]='PPPK';
    if(issue==='collision')record.parent.createFolder('PNS').createFolder(record.folder.getName());
    if(issue==='shared') {const sheet=f.master.getSheetByName('REKAP_UANG_MAKAN'), row=[...sheet.rows.at(-1)];row[3]='01-09-2026 s/d 30-09-2026';sheet.rows.push(row);}
    if(issue==='foreign')record.folder.parent=f.otherDestination;
    const plan=f.context.previewMigrasiFolderPNS2026();assert.equal(plan.ready,false,issue);assert.ok(plan.errors.length>0);
    f.properties.set('MIGRASI_PNS_2026_REVISI',plan.revision);
    assert.throws(()=>f.context.jalankanMigrasiFolderPNS2026(),/belum aman/);
    assert.equal(f.records[1].folder.parent,f.records[1].parent);
  }
});

test('partial migration can be re-previewed and resumed without duplicating moved folders', () => {
  const f=legacyFolderFixture(), failed=f.records[1].folder, normal=failed.moveTo;
  failed.moveTo=()=>{throw Error('Temporary Drive error');};
  f.properties.set('MIGRASI_PNS_2026_REVISI',f.context.previewMigrasiFolderPNS2026().revision);
  const first=f.context.jalankanMigrasiFolderPNS2026();assert.equal(first.moved.length,1);assert.equal(first.failed.length,1);
  failed.moveTo=normal;
  assert.throws(()=>f.context.jalankanMigrasiFolderPNS2026(),/MIGRASI_PNS_2026_REVISI/);
  f.properties.set('MIGRASI_PNS_2026_REVISI',f.context.previewMigrasiFolderPNS2026().revision);
  const second=f.context.jalankanMigrasiFolderPNS2026();assert.equal(second.moved.length,1);assert.equal(second.already.length,1);
});
