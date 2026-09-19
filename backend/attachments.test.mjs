import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const sourceCode = fs.readFileSync(new URL('./Code.gs', import.meta.url), 'utf8');

function fixture() {
  const files = new Map(), folders = new Map(), books = new Map();
  let sequence = 0;
  const iterator = values => { let i = 0; return { hasNext: () => i < values.length, next: () => values[i++] }; };
  class Sheet {
    constructor(rows = []) { this.rows = rows.map(row => [...row]); this.id = ++sequence; this.backgrounds = []; }
    getSheetId() { return this.id; }
    getName() { return this.name || 'Rekap'; }
    hideSheet() { this.hidden = true; return this; }
    getMaxColumns() { return 1000; }
    insertColumnsAfter() { return this; }
    getDataRange() { return { getValues: () => this.rows.map(row => [...row]) }; }
    getLastRow() { return this.rows.length; }
    getLastColumn() { return Math.max(1, ...this.rows.map(row => row.length)); }
    getMaxRows() { return Math.max(100, this.rows.length); }
    insertRowAfter() { return this; }
    appendRow(row) { this.rows.push([...row]); return this; }
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
        setNumberFormat() { return range; },
        setValues(values) { values.forEach((line, i) => line.forEach((value, j) => { sheet.rows[row - 1 + i] ||= []; sheet.rows[row - 1 + i][col - 1 + j] = value; })); return range; },
        setValue(value) { return range.setValues([[value]]); },
        setFontWeight() { return range; }, setBackground() { return range; }, setFontColor() { return range; }, setBackgrounds(values) { sheet.backgrounds = values; return range; }, sort() { return range; },
      };
      return range;
    }
  }
  class Book {
    constructor() { this.sheets = new Map(); }
    getSpreadsheetTimeZone() { return this.timeZone || 'Asia/Jakarta'; }
    getSheetByName(name) { return this.sheets.get(name) || null; }
    insertSheet(name) { const sheet = new Sheet(); sheet.name = name; this.sheets.set(name, sheet); return sheet; }
    getSheets() { return [...this.sheets.values()]; }
  }
  class File {
    constructor(id, name, parent, mime = 'application/pdf') { Object.assign(this, { id, name, parent, mime, trashed: false }); files.set(id, this); }
    getId() { return this.id; } getName() { return this.name; } getUrl() { return `https://drive.google.com/file/d/${this.id}/view`; }
    getMimeType() { return this.mime; } isTrashed() { return this.trashed; }
    getParents() { return iterator(this.parent ? [this.parent] : []); }
    setTrashed(value) { this.trashed = value; return this; } setSharing() { return this; }
    makeCopy(name, parent) {
      const copy = new File(`copy_document_${++sequence}`, name, parent, this.mime);
      if (this.mime === 'application/vnd.google-apps.spreadsheet') { const book = new Book(); book.insertSheet('Rekap'); books.set(copy.id, book); }
      return copy;
    }
  }
  class Folder {
    constructor(id, name, parent) { Object.assign(this, { id, name, parent }); folders.set(id, this); }
    getId() { return this.id; } getUrl() { return `https://drive.google.com/drive/folders/${this.id}`; } isTrashed() { return false; }
    getParents() { return iterator(this.parent ? [this.parent] : []); }
    getFoldersByName(name) { return iterator([...folders.values()].filter(f => f.parent === this && f.name === name)); }
    createFolder(name) { return new Folder(`folder_created_${++sequence}`, name, this); }
    getFiles() { return iterator([...files.values()].filter(f => f.parent === this && !f.trashed)); }
    getFilesByName(name) { return iterator([...files.values()].filter(f => f.parent === this && f.name === name && !f.trashed)); }
    createFile(blob) { return new File(`upload_document_${++sequence}`, blob.name, this, blob.mime); }
  }
  let locked = false;
  const context = vm.createContext({
    console, Logger: { log() {} },
    ContentService: { MimeType: { JSON: 'json', TEXT: 'text' }, createTextOutput: text => ({ setMimeType() { return this; }, getContent: () => text }) },
    LockService: { getScriptLock: () => ({ waitLock: () => { locked = true; }, hasLock: () => locked, releaseLock: () => { locked = false; } }) },
    DriveApp: { getFolderById: id => { if (!folders.has(id)) throw Error('No folder'); return folders.get(id); }, getFileById: id => { if (!files.has(id)) throw Error('No file'); return files.get(id); }, Access: {}, Permission: {} },
    SpreadsheetApp: { flush() {}, openById: id => { if (!books.has(id)) throw Error('No spreadsheet'); return books.get(id); } },
    Utilities: { DigestAlgorithm: {SHA_256:'sha256'}, computeDigest: (algorithm, value) => [...crypto.createHash(algorithm).update(value).digest()], getUuid: () => `uuid_${++sequence}`, formatDate: (date, timeZone, format) => format === 'yyyy-MM-dd' ? new Intl.DateTimeFormat('en-CA', {timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date) : '19/09/2026 10:00:00', base64Decode: data => Buffer.from(data, 'base64'), newBlob: (data, mime, name) => ({ data, mime, name }) },
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
  const call = payload => JSON.parse(context.doPost({ postData: { contents: JSON.stringify({ ...scope, ...payload }) } }).getContent());
  return { context, master, files, folders, destination, otherDestination, spreadsheet, presensi, untouched, spt, cuti, scope, call, recapBook, working };
}

test('health probe returns deployment version without reading employee data or changing files', () => {
  const f=fixture(), count=f.files.size;
  const response=JSON.parse(f.context.doGet({parameter:{action:'health'}}).getContent());
  assert.equal(response.status,'success');
  assert.equal(response.backendVersion,'2026-09-19-process-recovery');
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
    const result = f.call({sheetData:f.working.rows.slice(5,-1),ringkasan:{}});
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
  const result = f.call({sheetData:f.working.rows.slice(5,-1),ringkasan:{}});
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
  assert.deepEqual(f.working.rows.slice(5,11).map(row => row.slice(0,21)), JSON.parse(before).slice(5,11).map(row => row.slice(0,21)));
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
  assert.deepEqual(f.working.rows.slice(5,11).map(row => row.slice(0,21)), JSON.parse(before).slice(5,11).map(row => row.slice(0,21)));
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
