import test from 'node:test';
import assert from 'node:assert/strict';
import { checkExistingSubmission } from '../src/archive-claims.js';

test('every check requests current server state, true can become false without clearing browser history', async () => {
  const context = {modul:'tukin',nip:'123456',periode:'01-07-2026 s/d 31-07-2026'};
  let exists = true, calls = 0;
  const fetchMock = async (_url, options) => {
    calls++;
    assert.equal(options.method,'POST');
    assert.deepEqual(JSON.parse(options.body),{...context,action:'check_status'});
    return Response.json({status:'success',checkedLive:true,exists});
  };
  assert.equal(await checkExistingSubmission('/mock',context,fetchMock),true);
  exists = false;
  assert.equal(await checkExistingSubmission('/mock',context,fetchMock),false);
  assert.equal(calls,2);
});

test('failed checks and old backend responses are not treated as missing or present', async () => {
  for (const response of [{status:'success',isUploaded:true},{status:'error',message:'Sheet unavailable'},{status:'success',checkedLive:true,exists:'true'}]) {
    await assert.rejects(checkExistingSubmission('/mock',{},async()=>Response.json(response)));
  }
  await assert.rejects(checkExistingSubmission('/mock',{},async()=>{throw Error('Network unavailable');}));
});
