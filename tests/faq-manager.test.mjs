import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {findFaqManager} from '../src/faq-manager-model.js';

const employee={Nama:'Ghina Sekarsari Husanty, S.Tr.Kom',Jabatan:'Jabatan Uji dari Master',Foto_Pegawai:'https://drive.google.com/file/d/photo_pengelola_test_123456789/view',NIP:'PRIVATE_NIP',PIN:'PRIVATE_PIN',EmailDinas:'PRIVATE_EMAIL'};
test('FAQ selects Ghina Sekarsari uniquely, uses complete master profile, and excludes unrelated employee fields',()=>{
  const profile=findFaqManager([{Nama:'Ghina Salsabila, S.Ars.'},null,employee]);
  assert.deepEqual(profile,{name:employee.Nama,job:employee.Jabatan,photo:employee.Foto_Pegawai});
  assert.doesNotMatch(JSON.stringify(profile),/PRIVATE/);
  assert.equal(findFaqManager([{...employee,Nama:'  GHINA   SEKARSARY Husanty  '}]).name,'GHINA   SEKARSARY Husanty');
  for(const data of [null,[],[{Nama:'Ghina Salsabila'}],[employee,employee],[{Nama:'Ghina Sekarsarina'}]])assert.equal(findFaqManager(data),null);
});

test('FAQ opens a labelled native modal with master name/job/photo, safe fallback, and no initial data fetch',async()=>{
  const bundle=await build({configFile:false,plugins:[react()],logLevel:'error',ssr:{noExternal:true},build:{ssr:'src/faq-manager.jsx',write:false,rollupOptions:{external:['react','react/jsx-runtime','lucide-react']}}});
  const code=bundle.output.find(item=>item.type==='chunk').code.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g,(_,q,s)=>`from ${JSON.stringify(import.meta.resolve(s))}`);
  const {FaqManager,FaqManagerDialog,FaqManagerProfile}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const loadPeople=()=>assert.fail('No fetch before opening the modal');
  const button=renderToStaticMarkup(React.createElement(FaqManager,{loadPeople}));
  assert.match(button,/aria-haspopup="dialog"/);
  assert.match(button,/FAQ/);
  assert.doesNotMatch(button,/<dialog|<img/);
  const dialog=renderToStaticMarkup(React.createElement(FaqManagerDialog,{loadPeople,onClose:()=>{}}));
  assert.match(dialog,/<dialog[^>]*aria-labelledby="faq-manager-title"/);
  assert.match(dialog,/Halaman ini dikelola oleh/);
  assert.match(dialog,/Memuat profil pengelola/);
  assert.match(dialog,/aria-label="Tutup informasi pengelola"/);
  const html=renderToStaticMarkup(React.createElement(FaqManagerProfile,{person:findFaqManager([employee])}));
  assert.match(html,/Ghina Sekarsari Husanty, S.Tr.Kom/);
  assert.match(html,/Jabatan Uji dari Master/);
  assert.match(html,/alt="Foto Ghina Sekarsari Husanty, S.Tr.Kom"/);
  assert.match(html,/lh3.googleusercontent.com\/d\/photo_pengelola_test_123456789=s800/);
  assert.doesNotMatch(html,/PRIVATE/);
  const fallback=renderToStaticMarkup(React.createElement(FaqManagerProfile,{person:{name:'<script>Ghina</script>',job:'',photo:''}}));
  assert.match(fallback,/&lt;script&gt;Ghina&lt;\/script&gt;/);
  assert.match(fallback,/Jabatan belum tersedia/);
  assert.doesNotMatch(fallback,/<script>|<img/);
});

test('FAQ is wired to the existing employee source and includes Escape, backdrop close and focus restoration',()=>{
  const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  assert.match(app,/<FaqManager loadPeople=\{fetchPegawaiData\}\/>/);
  const component=fs.readFileSync(new URL('../src/faq-manager.jsx',import.meta.url),'utf8');
  assert.match(component,/dialog.showModal\(\)/);
  assert.match(component,/previousFocus\.focus\(\)/);
  assert.match(component,/onCancel=\{event => \{ event.preventDefault\(\); onClose\(\); \}\}/);
  assert.match(component,/event.target === event.currentTarget\) onClose\(\)/);
  assert.match(component,/loadPeople\(true\)/);
});
