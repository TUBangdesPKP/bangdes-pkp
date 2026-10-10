import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

test('admin cards render instantly without period fetches; all twelve buttons select tab-2 periods with clean date labels',async()=>{
  const bundle=await build({configFile:false,plugins:[react()],logLevel:'error',ssr:{noExternal:true},build:{ssr:'src/submission-periods.jsx',write:false,emptyOutDir:false,rollupOptions:{external:['react','react/jsx-runtime','lucide-react']}}});
  const code=bundle.output.find(item=>item.type==='chunk').code.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g,(_,quote,specifier)=>`from ${JSON.stringify(import.meta.resolve(specifier))}`);
  const {AdminPeriodCards,SubmissionPeriods}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const props={user:{Akun_Role:'admin',NIP:'TEST'},modul:'uang-makan',onSelect:()=>{},onModuleChange:()=>{}};
  const personal=renderToStaticMarkup(React.createElement(SubmissionPeriods,{...props,adminMode:false}));
  assert.match(personal,/Rekap Pembayaran/);assert.doesNotMatch(personal,/Jenis penghitungan|Pilih &amp; Lanjut/);
  const managed=renderToStaticMarkup(React.createElement(SubmissionPeriods,{...props,adminMode:true}));
  assert.match(managed,/Jenis penghitungan/);assert.match(managed,/Pilih &amp; Lanjut/);
  for(const modul of ['uang-makan','tukin']) {
    const chosen=[],tree=AdminPeriodCards({modul,year:2026,onSelect:period=>chosen.push(period)});
    for(const section of tree.props.children)section.props.children.find(child=>child.type==='button').props.onClick();
    assert.equal(chosen.length,12);assert.ok(chosen.every(period=>period.status==='DIBUKA'));
    assert.ok(chosen.every(period=>/\d{4}$/.test(period.periodeLabel)));
    const html=renderToStaticMarkup(React.createElement(AdminPeriodCards,{modul,year:2026,onSelect:()=>{}}));
    assert.equal((html.match(/<button /g)||[]).length,12);assert.doesNotMatch(html,/disabled|Memuat|DITUTUP|2026[.·]/);
  }
  const source=fs.readFileSync(new URL('../src/submission-periods.jsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/sendClaimRequest|useEffect|addEventListener|list_periode_submisi/);
});
