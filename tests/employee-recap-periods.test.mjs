import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

test('employee monthly cards render all twelve clickable months, saved net pay, dates and honest empty/error states', async () => {
  const bundle = await build({configFile:false, plugins:[react()], logLevel:'error', ssr:{noExternal:true},
    build:{ssr:'src/employee-recap-periods.jsx',write:false,emptyOutDir:false,rollupOptions:{external:['react','react/jsx-runtime','lucide-react']}}});
  const code=bundle.output.find(item=>item.type==='chunk').code.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g,(_,quote,specifier)=>`from ${JSON.stringify(import.meta.resolve(specifier))}`);
  const {EmployeeRecapCards}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  for(const modul of ['uang-makan','tukin']) {
    const props={modul,year:2026,onSelect:()=>{},months:[{month:1,state:'saved',netto:6349000},{month:2,state:'saved',netto:0},{month:3,state:'pending',netto:null},{month:4,state:'incomplete',netto:null}]};
    const html=renderToStaticMarkup(React.createElement(EmployeeRecapCards,props));
    assert.equal((html.match(/<button /g)||[]).length,12);
    assert.match(html,/grid-cols-4/); assert.match(html,/6\.349\.000/);assert.match(html,/Rp(?:&#xA0;| |\s)0/);
    assert.match(html,/Belum ada data/); assert.match(html,/Menunggu perhitungan/); assert.match(html,/Perlu penyesuaian/);
    assert.match(html,modul==='tukin'?/11 Sep 2026 – 10 Okt 2026/:/1 Nov 2026 – 30 Nov 2026/);
    assert.doesNotMatch(html,/disabled|DITUTUP|DIBUKA|Upload|Kunci admin/);
    for(const state of [{loading:true},{error:'Offline'}]) {
      const unavailable=renderToStaticMarkup(React.createElement(EmployeeRecapCards,{...props,...state}));
      assert.equal((unavailable.match(/<button /g)||[]).length,12);
      assert.doesNotMatch(unavailable,/disabled|6\.349\.000/);
      assert.match(unavailable,state.loading?/Memuat nominal/:/Nominal belum tersedia/);
    }
  }
});
