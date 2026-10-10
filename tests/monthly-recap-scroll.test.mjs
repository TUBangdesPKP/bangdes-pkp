import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { scrollRecapSection } from '../src/monthly-recap-scroll.js';

test('section navigation scrolls only the recap body to its section start regardless of banner height or existing scroll',()=>{
  for(const id of ['ringkasan','kehadiran','unit','juara','catatan','dinas']) {
    for(const bannerHeight of [80,180,260]) for(const scrollTop of [0,500,1800]) {
      const targetOffset=1200;
      let scrolled;
      const body={scrollTop,clientTop:1,getBoundingClientRect:()=>({top:bannerHeight}),
        querySelector:selector=>{assert.equal(selector,`[id="rekap-${id}"]`);return {getBoundingClientRect:()=>({top:bannerHeight+1+targetOffset-scrollTop})};},
        scrollTo:options=>{scrolled=options;}};
      assert.equal(scrollRecapSection(body,id),true);
      assert.deepEqual(scrolled,{top:targetOffset,behavior:'smooth'});
      scrollRecapSection(body,id,'instant');assert.equal(scrolled.behavior,'instant');
    }
  }
});

test('missing sections or an unmounted recap cannot move an unrelated scroll area',()=>{
  assert.equal(scrollRecapSection(null,'unit'),false);
  assert.equal(scrollRecapSection({querySelector:()=>null,scrollTo:()=>assert.fail('Must not scroll')},'unit'),false);
});

test('admin banner and navigation are outside the scroll body while public recap keeps its sticky page header',async()=>{
  const bundle=await build({configFile:false,plugins:[react()],logLevel:'error',ssr:{noExternal:true},build:{ssr:'src/monthly-recap.jsx',write:false,emptyOutDir:false,rollupOptions:{external:['react','react/jsx-runtime','lucide-react']}}});
  const code=bundle.output.find(item=>item.type==='chunk').code.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g,(_,quote,specifier)=>`from ${JSON.stringify(import.meta.resolve(specifier))}`);
  const {MonthlyRecap}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const admin=renderToStaticMarkup(React.createElement(MonthlyRecap,{endpoint:'/mock',role:'admin'}));
  assert.match(admin,/data-testid="monthly-recap-banner" class="shrink-0 relative/);
  assert.match(admin,/<\/header><div data-testid="monthly-recap-content" class="flex-1 min-h-0 overflow-y-auto/);
  const header=admin.slice(0,admin.indexOf('</header>'));
  for(const label of ['Ringkasan','Kehadiran','Per Unit','Juara','Catatan','Dinas'])assert.ok(header.includes(label));
  assert.ok(header.includes('wrap-month'));assert.ok(header.includes('wrap-year'));
  const publicHtml=renderToStaticMarkup(React.createElement(MonthlyRecap,{endpoint:'/mock',publicView:true}));
  assert.match(publicHtml,/data-testid="monthly-recap-banner" class="sticky top-0/);
  assert.match(publicHtml,/data-testid="monthly-recap-content" class=""/);
});
