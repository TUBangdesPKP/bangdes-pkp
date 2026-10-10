import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvidenceZip, collectEvidenceDownload } from '../src/evidence-download.js';

test('ZIP is a UTF-8 STORE archive with valid offsets, CRC, directories and unchanged binary content', async () => {
  const content = new TextEncoder().encode('123456789');
  const entries = [{path:'Periode/PNS/',bytes:new Uint8Array()},{path:'Periode/PNS/Ghiná.pdf',bytes:content},{path:'Periode/PPPK/Surat.png',bytes:Uint8Array.of(0,128,255)}];
  const zip = createEvidenceZip(entries), buffer = Buffer.from(await zip.arrayBuffer());
  assert.equal(zip.type,'application/zip');
  const end = buffer.length-22;
  assert.equal(buffer.readUInt32LE(end),0x06054b50);assert.equal(buffer.readUInt16LE(end+10),3);
  let central=buffer.readUInt32LE(end+16);
  for (const [index,entry] of entries.entries()) {
    assert.equal(buffer.readUInt32LE(central),0x02014b50);assert.equal(buffer.readUInt16LE(central+8),0x800);
    const size=buffer.readUInt32LE(central+24), length=buffer.readUInt16LE(central+28), local=buffer.readUInt32LE(central+42);
    assert.equal(buffer.subarray(central+46,central+46+length).toString(),entry.path);
    assert.equal(buffer.readUInt32LE(local),0x04034b50);assert.equal(buffer.readUInt16LE(local+8),0);
    assert.equal(buffer.readUInt32LE(local+18),entry.bytes.length);assert.equal(buffer.readUInt32LE(local+22),size);
    if(index===1){assert.equal(buffer.readUInt32LE(local+14),0xcbf43926);assert.equal(buffer.readUInt32LE(central+16),0xcbf43926);}
    assert.deepEqual(buffer.subarray(local+30+length,local+30+length+size),Buffer.from(entry.bytes));
    central+=46+length;
  }
  assert.equal(central,end);
  for (const path of ['../x','/abs','C:/x','ok/../x','bad\\file','a/./b','a//b','bad\0file']) assert.throws(()=>createEvidenceZip([{path,bytes:content}]),/tidak valid/);
  assert.throws(()=>createEvidenceZip([{path:'File',bytes:content},{path:'file',bytes:content}]),/ganda/);
});

function fixture() {
  const scope={modul:'tukin',periode:'11-09-2026 s/d 10-10-2026',adminSessionToken:'session'};
  const common={status:'success',downloadVersion:1,modul:scope.modul,periode:scope.periode};
  const manifest={...common,fileName:'Bukti Dukung Tukin_November 2026.zip',revision:'v1',directories:['November/'],entries:[{fileId:'pdf-id',path:'November/A.pdf',version:'file-v1'}]};
  const file={...common,fileId:'pdf-id',version:'file-v1',base64:Buffer.from('%PDF-test').toString('base64'),size:9};
  const calls=[], progress=[];
  const request=async(endpoint,payload)=>{calls.push(payload);return payload.action==='daftar_unduhan_bukti'?manifest:file;};
  return {scope,manifest,file,calls,progress,options:{request,onProgress:p=>progress.push(p)}};
}

test('folder download fetches each scoped file, validates final revision and returns one ZIP',async()=>{
  const f=fixture(), result=await collectEvidenceDownload('endpoint',f.scope,f.options);
  assert.equal(result.fileName,f.manifest.fileName);assert.equal(result.blob.type,'application/zip');
  assert.deepEqual(f.calls.map(c=>c.action),['daftar_unduhan_bukti','unduh_berkas_bukti','daftar_unduhan_bukti']);
  assert.ok(f.calls.every(c=>c.adminSessionToken==='session'&&c.modul==='tukin'&&c.periode===f.scope.periode&&!('folderId' in c)));
  assert.deepEqual(f.progress,[{done:0,total:1},{done:1,total:1}]);
});

test('wrong-period, truncated, changed, empty or cancelled downloads never produce a partial ZIP',async()=>{
  for(const change of [f=>{f.file.modul='uang-makan';},f=>{f.file.periode='wrong';},f=>{f.file.size=10;},f=>{f.file.fileId='other';},f=>{f.file.version='other';},f=>{f.file.base64='!';},f=>{f.manifest.entries=[];}]){
    const f=fixture();change(f);await assert.rejects(()=>collectEvidenceDownload('endpoint',f.scope,f.options));
  }
  const changed=fixture(), original=changed.options.request;
  changed.options.request=async(...args)=>{const result=await original(...args);return changed.calls.length===3?{...result,revision:'v2'}:result;};
  await assert.rejects(()=>collectEvidenceDownload('endpoint',changed.scope,changed.options),/folder berubah/);
  const stopped=fixture();stopped.options.cancelled=()=>stopped.calls.length>=1;
  await assert.rejects(()=>collectEvidenceDownload('endpoint',stopped.scope,stopped.options),/dibatalkan/);assert.equal(stopped.calls.length,1);
  const failed=fixture();
  // Backend failures are surfaced unchanged; there is no fallback partial archive.
  await assert.rejects(()=>collectEvidenceDownload('endpoint',failed.scope,{request:async()=>{throw Error('Sesi Admin berakhir');}}),/Sesi Admin berakhir/);
});
