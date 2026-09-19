import test from 'node:test';
import assert from 'node:assert/strict';
import { processSubmissionEvidence, sendClaimRequest } from '../src/archive-claims.js';

const context = {modul:'tukin',nip:'TEST',periode:'01-07-2026 s/d 31-07-2026'};
const success = {status:'success',spreadsheetId:'recap-test',revision:'revision-test',rows:[]};
const options = fetchRequest => ({fetchRequest,wait:async()=>{}});

test('successful process uses one POST, follows redirects, and disables response cache', async () => {
  let calls=0;
  const result=await processSubmissionEvidence('/mock',context,options(async (url, init)=>{
    calls++;
    assert.equal(url,'/mock'); assert.equal(init.method,'POST');
    assert.equal(init.redirect,'follow'); assert.equal(init.cache,'no-store'); assert.equal(init.credentials,'omit');
    const payload=JSON.parse(init.body);
    assert.equal(payload.action,'proses_bukti'); assert.ok(payload.requestId);
    return Response.json(success);
  }));
  assert.equal(calls,1); assert.equal(result.spreadsheetId,'recap-test');
});

test('404 after the write recovers through read-only preview without another process', async () => {
  const calls=[]; let recovering=false;
  const result=await processSubmissionEvidence('/mock',context,{...options(async (url,init)=>{
    calls.push(JSON.parse(init.body));
    return calls.length===1 ? new Response('Not found',{status:404}) : Response.json(success);
  }),onRecovery:()=>{recovering=true;}});
  assert.equal(recovering,true); assert.equal(result.revision,'revision-test');
  assert.deepEqual(calls.map(c=>c.action),['proses_bukti','preview_rekap_final']);
  assert.equal(calls[0].requestId,calls[1].requestId);
  assert.ok(calls.every(c=>c.nip===context.nip&&c.periode===context.periode&&c.modul===context.modul));
});

test('persistent 404 stops after two read-only checks and reports deployment diagnostic', async () => {
  const actions=[];
  await assert.rejects(processSubmissionEvidence('/mock',context,options(async (url,init)=>{
    actions.push(JSON.parse(init.body).action);
    return new Response('',{status:404});
  })),/404.*deployment.*Kode pemeriksaan/);
  assert.deepEqual(actions,['proses_bukti','preview_rekap_final','preview_rekap_final']);
});

test('business validation failure is not retried or disguised as a transport failure', async () => {
  let calls=0;
  await assert.rejects(processSubmissionEvidence('/mock',context,options(async()=>{
    calls++; return Response.json({status:'error',message:'Jumlah Hari Cuti tidak sesuai'});
  })),/Jumlah Hari Cuti/);
  assert.equal(calls,1);
});

test('invalid JSON and network failure can recover without repeating writes', async () => {
  for (const failure of ['html','network']) {
    let calls=0;
    const result=await processSubmissionEvidence('/mock',context,options(async()=>{
      calls++;
      if(calls===1) { if(failure==='network') throw new TypeError('Failed to fetch'); return new Response('<html>Error</html>'); }
      return Response.json(success);
    }));
    assert.equal(calls,2); assert.equal(result.revision,'revision-test');
  }
});

test('request timeout aborts only the client wait and recovers through preview', async () => {
  const actions=[];
  const result=await processSubmissionEvidence('/mock',context,{...options(async (url,init)=>{
    actions.push(JSON.parse(init.body).action);
    if(actions.length===1) return new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));
    return Response.json(success);
  }),timeoutMs:5});
  assert.equal(result.revision,'revision-test');
  assert.deepEqual(actions,['proses_bukti','preview_rekap_final']);
});

test('access failures and other mutation requests are never automatically retried', async () => {
  for(const status of [401,403]) {
    let calls=0;
    await assert.rejects(processSubmissionEvidence('/mock',context,options(async()=>{calls++;return new Response('',{status});})));
    assert.equal(calls,1);
  }
  for(const action of ['klaim_dokumen','upload_pendukung','hapus_pendukung']) {
    let calls=0;
    await assert.rejects(sendClaimRequest('/mock',{...context,action},async()=>{calls++;return new Response('',{status:404});}));
    assert.equal(calls,1);
  }
});

test('incomplete recovery preview is not accepted as success', async () => {
  let calls=0;
  await assert.rejects(processSubmissionEvidence('/mock',context,options(async()=>{
    calls++;
    return calls===1 ? new Response('',{status:502}) : Response.json({status:'success',rows:[]});
  })),/Pemeriksaan hasil belum berhasil/);
  assert.equal(calls,3);
});
