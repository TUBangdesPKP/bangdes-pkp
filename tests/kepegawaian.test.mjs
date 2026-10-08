import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

test('Kepegawaian navigation moves the personnel-bank entry off home without changing its route or access', async () => {
  const bundle = await build({ configFile:false, plugins:[react()], logLevel:'error', ssr:{noExternal:true},
    build:{ssr:'src/App.jsx',write:false,emptyOutDir:false,rollupOptions:{external:['react','react/jsx-runtime','lucide-react','papaparse']}} });
  const code=bundle.output.find(item=>item.type==='chunk').code.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react|papaparse)\1/g,(_,quote,specifier)=>`from ${JSON.stringify(import.meta.resolve(specifier))}`);
  const {default:App,Header,DashboardHome}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const originalWindow=globalThis.window, originalStorage=globalThis.localStorage;
  try {
    globalThis.window={location:{hash:'#/kepegawaian'}};
    for(const role of [null,'pegawai','Admin']) {
      const user=role?{NIP:'TEST',Nama:'Pegawai Uji',Akun_Role:role}:null;
      globalThis.localStorage={getItem:()=>user?JSON.stringify({user,timestamp:Date.now()}):null};
      const header=renderToStaticMarkup(React.createElement(Header,{navigate:()=>{},loggedInUser:user,currentView:'kepegawaian'}));
      assert.match(header,/Beranda<\/button><a href="#\/kepegawaian" aria-current="page"/);
      assert.ok(header.indexOf('Kepegawaian')<header.indexOf('Bantuan'));
      const page=renderToStaticMarkup(React.createElement(App));
      assert.match(page,/id="kepegawaian-title"/);assert.match(page,/href="#\/profile"/);
      assert.match(page,/Lihat Bank Data Pegawai/);assert.match(page,/Kembali ke Beranda/);
      const home=renderToStaticMarkup(React.createElement(DashboardHome,{navigate:()=>{},loggedInUser:user}));
      assert.doesNotMatch(home,/Lihat Bank Data Pegawai/);
      assert.match(home,/Upload Dokumen Pendukung/);assert.match(home,/#\/rekap-publik/);
    }
    globalThis.window.location.hash='#/profile';
    const bank=renderToStaticMarkup(React.createElement(App));
    assert.match(bank,/Bank Data Profil Pegawai/);assert.match(bank,/Kembali ke Kepegawaian/);
  } finally {
    if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
    if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;
  }
});
