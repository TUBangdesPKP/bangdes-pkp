import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

test('Kepegawaian opens the organization by default for all roles and preserves the inline directory and legacy route', async () => {
  const bundle = await build({ configFile:false, plugins:[react()], logLevel:'error', ssr:{noExternal:true},
    build:{ssr:'src/App.jsx',write:false,emptyOutDir:false,rollupOptions:{external:['react','react/jsx-runtime','lucide-react','papaparse']}} });
  const code=bundle.output.find(item=>item.type==='chunk').code.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react|papaparse)\1/g,(_,quote,specifier)=>`from ${JSON.stringify(import.meta.resolve(specifier))}`);
  const {default:App,Header,DashboardHome}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const originalWindow=globalThis.window, originalStorage=globalThis.localStorage;
  try {
    globalThis.window={location:{hash:'#/kepegawaian'}};
    for(const role of [null,'pegawai','Admin']) {
      globalThis.window.location.hash='#/kepegawaian';
      const user=role?{NIP:'TEST',Nama:'Pegawai Uji',Akun_Role:role,sessionToken:'test-session'}:null;
      globalThis.localStorage={getItem:()=>user?JSON.stringify({user,timestamp:Date.now()}):null,removeItem:()=>{}};
      const header=renderToStaticMarkup(React.createElement(Header,{navigate:()=>{},loggedInUser:user,currentView:'kepegawaian'}));
      assert.match(header,/Beranda<\/button><a href="#\/monitoring-kinerja"/);
      assert.match(header,/<a href="#\/kepegawaian" aria-current="page"/);
      assert.ok(header.indexOf('Monitoring Kinerja')<header.indexOf('Kepegawaian'));
      assert.ok(header.indexOf('Kepegawaian')<header.indexOf('Bantuan'));
      const page=renderToStaticMarkup(React.createElement(App));
      assert.match(page,/id="kepegawaian-title"/);
      assert.doesNotMatch(page,/href="#\/profile"|Lihat Bank Data Pegawai|Bank Data Profil Pegawai/);
      assert.match(page,/Kembali ke Beranda/);
      assert.match(page,/role="tab" id="kepegawaian-tab-struktur"[^>]*aria-selected="true"/);
      assert.match(page,/role="tab" id="kepegawaian-tab-data"[^>]*aria-selected="false"/);
      assert.match(page,/id="kepegawaian-panel-data"[^>]*hidden=""/);
      assert.match(page,/Memuat struktur unit kerja/);
      for (const id of ['demografi', 'cuti', 'kompetensi']) {
        assert.match(page,new RegExp(`role="tab" id="kepegawaian-tab-${id}"[^>]*aria-selected="false"`));
        assert.match(page,new RegExp(`id="kepegawaian-panel-${id}"[^>]*hidden=""`));
        assert.match(page,new RegExp(`id="kepegawaian-panel-${id}"[^>]*></div>`));
      }
      assert.deepEqual([...page.matchAll(/role="tab" id="kepegawaian-tab-([^"]+)"/g)].map(match=>match[1]),['struktur','data','demografi','cuti','kompetensi']);
      assert.match(page,/Pemenuhan Kompetensi/);
      assert.doesNotMatch(page,/Angka Kredit/);
      assert.match(page,/Demografi/);
      assert.match(page,/Rekap Cuti/);
      assert.match(page,/Filter Berdasarkan Sub Unit Kerja/);
      assert.match(page,/aria-label="Cari pegawai"/);
      assert.match(page,/aria-label="Daftar pegawai"/);
      assert.match(page,/Memuat data kepegawaian/);
      assert.equal((page.match(/aria-label="Navigasi utama"/g)||[]).length,1);
      const home=renderToStaticMarkup(React.createElement(DashboardHome,{navigate:()=>{},loggedInUser:user}));
      assert.doesNotMatch(home,/Lihat Bank Data Pegawai/);
      assert.match(home,/Upload Dokumen Pendukung/);assert.match(home,/#\/rekap-publik/);
      assert.ok(home.indexOf('Upload Dokumen Pendukung')>home.indexOf('Rekap Kinerja &amp; Kedisiplinan'));
      globalThis.window.location.hash='#/monitoring-kinerja';
      const monitoring=renderToStaticMarkup(React.createElement(App));
      assert.match(monitoring,/id="monitoring-kinerja-title"/);
      assert.match(monitoring,/<a href="#\/monitoring-kinerja" aria-current="page"/);
      assert.match(monitoring,/Kembali ke Beranda/);
      assert.equal((monitoring.match(/aria-label="Navigasi utama"/g)||[]).length,1);
      assert.doesNotMatch(monitoring,/kepegawaian-panel|Memuat data kepegawaian|Dashboard Data dan Informasi/);
    }
    globalThis.window.location.hash='#/profile';
    const bank=renderToStaticMarkup(React.createElement(App));
    assert.match(bank,/Bank Data Profil Pegawai/);assert.match(bank,/Kembali ke Kepegawaian/);
  } finally {
    if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
    if(originalStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=originalStorage;
  }
});
