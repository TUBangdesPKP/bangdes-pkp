import test from 'node:test';
import assert from 'node:assert/strict';
import { startActivitySession, readStoredSession, SESSION_IDLE_MS } from '../src/activity-session.js';
import { sendClaimRequest } from '../src/archive-claims.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
function fixture() {
  let time=1000000,tick;
  const user={NIP:'123',sessionToken:'test-token'}, data=new Map();
  const storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  const store=(timestamp=time,profile=user)=>storage.setItem('pkp_session',JSON.stringify({user:profile,timestamp}));store();
  class Surface {
    listeners=new Map();visibilityState='visible';
    addEventListener(name,fn){if(!this.listeners.has(name))this.listeners.set(name,new Set());this.listeners.get(name).add(fn);}
    removeEventListener(name,fn){this.listeners.get(name)?.delete(fn);}
    emit(name,event={}){for(const fn of this.listeners.get(name)||[])fn({isTrusted:true,...event});}
  }
  const win=new Surface(),doc=new Surface(),calls=[],expired=[];
  let response=()=>({status:'success',sessionVersion:2});
  const cleanup=startActivitySession({user,endpoint:'test',storage,win,doc,now:()=>time,request:async(_,body)=>{calls.push(body);return response(body);},onExpire:r=>expired.push(r),every:fn=>{tick=fn;return 1;},clearEvery:()=>{tick=()=>{};}});
  return {storage,store,user,win,doc,calls,expired,cleanup,setResponse:fn=>{response=fn;},advance:ms=>{time+=ms;},tick:()=>tick(),now:()=>time};
}

test('stored sessions expire at six hours, reject malformed/future timestamps and preserve active sessions',()=>{
  const f=fixture();
  assert.equal(readStoredSession(f.storage,f.now()).user.sessionToken,f.user.sessionToken);
  f.advance(SESSION_IDLE_MS-1);assert.ok(readStoredSession(f.storage,f.now()));
  f.advance(1);assert.equal(readStoredSession(f.storage,f.now()),null);
  f.store(f.now()+1);assert.equal(readStoredSession(f.storage,f.now()),null);
  f.storage.setItem('pkp_session','broken');assert.equal(readStoredSession(f.storage,f.now()),null);f.cleanup();
});

test('idle timers, visibility and automatic requests do not renew activity; wake-up cannot revive expired sessions',async()=>{
  const f=fixture();await settle();
  assert.equal(f.calls.length,1);
  for(let hour=0;hour<5;hour++){f.advance(3600000);f.tick();f.doc.emit('visibilitychange');await settle();}
  assert.equal(f.calls.length,1);assert.equal(f.expired.length,0);
  f.advance(3600000);f.win.emit('pointermove');await settle();
  assert.deepEqual(f.expired,['idle']);assert.equal(f.storage.getItem('pkp_session'),null);
  assert.equal(f.calls.at(-1).action,'keluar_sesi');f.cleanup();
});

test('mouse, keyboard, touch and scrolling keep active sessions beyond six hours and throttle heartbeat traffic',async()=>{
  const f=fixture();await settle();
  const inputs=['pointermove','pointerdown','keydown','wheel','touchstart','scroll'];
  for(let hour=0;hour<9;hour++){
    f.advance(3600000);f.win.emit(inputs[hour%inputs.length]);await settle();
    assert.equal(f.calls.at(-1).activityAgeMs,0);assert.equal(f.expired.length,0);
  }
  const count=f.calls.length;
  for(let i=0;i<200;i++){f.advance(10);f.win.emit('pointermove');}
  await settle();assert.equal(f.calls.length,count);
  f.advance(60000);f.tick();await settle();
  assert.equal(f.calls.at(-1).activityAgeMs,60000);
  f.advance(SESSION_IDLE_MS-60000);f.tick();assert.deepEqual(f.expired,['idle']);f.cleanup();
});

test('untrusted events and background tabs do not count; cross-tab activity extends only the same token',async()=>{
  const f=fixture();await settle();
  f.advance(3600000);f.win.emit('pointermove',{isTrusted:false});f.doc.visibilityState='hidden';f.win.emit('keydown');await settle();
  assert.equal(f.calls.length,1);
  f.store();f.win.emit('storage');await settle();assert.equal(f.calls.length,2);
  f.store(f.now(),{sessionToken:'other-account'});f.win.emit('storage');
  assert.deepEqual(f.expired,['changed']);assert.equal(JSON.parse(f.storage.getItem('pkp_session')).user.sessionToken,'other-account');
  f.cleanup();assert.equal([...f.win.listeners.values()].reduce((sum,set)=>sum+set.size,0),0);
});

test('network failures retry without logging out; confirmed server expiry clears the session',async()=>{
  const f=fixture();await settle();
  f.setResponse(()=>{throw Error('offline');});f.advance(60000);f.win.emit('keydown');await settle();
  assert.equal(f.expired.length,0);
  f.setResponse(()=>{throw Object.assign(Error('expired'),{code:'SESSION_EXPIRED'});});
  f.advance(60000);f.tick();await settle();assert.deepEqual(f.expired,['server']);assert.equal(f.storage.getItem('pkp_session'),null);f.cleanup();
});

test('shared request helper preserves structured expiry code',async()=>{
  await assert.rejects(()=>sendClaimRequest('test',{action:'profil_saya',sessionToken:'test'},async()=>({ok:true,json:async()=>({status:'error',code:'SESSION_EXPIRED',message:'Sesi berakhir'})})),error=>error.code==='SESSION_EXPIRED');
});
