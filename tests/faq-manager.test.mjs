import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'vite';
import react from '@vitejs/plugin-react';

test('FAQ stores only the public profile and a bundled local PNG',()=>{
  const data=fs.readFileSync(new URL('../src/faq-manager-data.js',import.meta.url),'utf8');
  assert.ok(data.includes("name: 'Ghina Sekarsari Husanty, S.Tr.Kom'"));
  assert.ok(data.includes("job: 'Pranata Komputer Ahli Pertama'"));
  assert.ok(data.includes("import photo from './assets/ghina-sekarsari.png'"));
  assert.doesNotMatch(data,/https:\/\/|fetch\(|loadPeople\(/);
  const bytes=fs.readFileSync(new URL('../src/assets/ghina-sekarsari.png',import.meta.url));
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.ok(bytes.length>1000);
});

test('FAQ immediately renders the profile without loading or external images',async()=>{
  const bundle=await build({configFile:false,plugins:[react()],logLevel:'error',ssr:{noExternal:true},build:{ssr:'src/faq-manager.jsx',write:false,rollupOptions:{external:['react','react/jsx-runtime','lucide-react']}}});
  let code=bundle.output.find(item=>item.type==='chunk').code;
  for(const specifier of ['react','react/jsx-runtime','lucide-react']) {
    code=code.replaceAll('from "'+specifier+'"','from '+JSON.stringify(import.meta.resolve(specifier)));
    code=code.replaceAll("from '"+specifier+"'",'from '+JSON.stringify(import.meta.resolve(specifier)));
  }
  const {FaqManager,FaqManagerDialog}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const button=renderToStaticMarkup(React.createElement(FaqManager));
  assert.ok(button.includes('aria-haspopup="dialog"'));
  assert.ok(button.includes('rel="preload" as="image"'));
  assert.ok(button.includes('/assets/ghina-sekarsari'));
  assert.doesNotMatch(button,/<dialog|<img/);
  const dialog=renderToStaticMarkup(React.createElement(FaqManagerDialog,{onClose:()=>{}}));
  for(const text of ['aria-labelledby="faq-manager-title"','Halaman ini dikelola oleh','Tutup informasi pengelola','Ghina Sekarsari Husanty, S.Tr.Kom','Pranata Komputer Ahli Pertama','alt="Foto Ghina Sekarsari Husanty, S.Tr.Kom"','src="/assets/ghina-sekarsari','loading="eager"'])assert.ok(dialog.includes(text),text);
  assert.doesNotMatch(dialog,/Memuat profil|Muat ulang|googleusercontent|drive.google|script.google/);
});

test('FAQ no longer uses personnel fetching and retains native modal dismissal and focus restoration',()=>{
  const app=fs.readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
  assert.ok(app.includes('<FaqManager/>'));
  assert.ok(!app.includes('<FaqManager loadPeople'));
  const component=fs.readFileSync(new URL('../src/faq-manager.jsx',import.meta.url),'utf8');
  for(const text of ['dialog.showModal()','previousFocus.focus()','onCancel={event => { event.preventDefault(); onClose(); }}','event.target === event.currentTarget) onClose()'])assert.ok(component.includes(text));
  assert.doesNotMatch(component,/fetch\(|loadPeople|findFaqManager|setTimeout|localStorage|Muat ulang/);
});
