import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {PROGRAM_OBJECTIVES,DIRECTORATE_OBJECTIVES,STRATEGIC_INDICATORS} from '../src/strategic-objectives-data.js';

test('strategic diagrams retain all objectives and their indicator relationships from references',()=>{
  assert.equal(STRATEGIC_INDICATORS.length,3);
  assert.equal(PROGRAM_OBJECTIVES.length,6);
  assert.equal(DIRECTORATE_OBJECTIVES.length,6);
  assert.deepEqual(PROGRAM_OBJECTIVES.map(item=>item.indicators.length),[1,1,1,2,2,2]);
  assert.deepEqual(DIRECTORATE_OBJECTIVES.map(item=>item.indicators.length),[1,1,1,5,2,1]);
  assert.match(PROGRAM_OBJECTIVES[3].title,/Perdesaan/);
  assert.match(PROGRAM_OBJECTIVES[4].title,/Perkotaan/);
  assert.match(DIRECTORATE_OBJECTIVES[3].indicators[4].text,/hunian vertikal/);
  assert.equal(new Set([...PROGRAM_OBJECTIVES,...DIRECTORATE_OBJECTIVES].map(item=>item.id)).size,12);
});

test('Monitoring defaults to Sasaran Strategis, shows diagrams in order and leaves other panels empty',async()=>{
  const bundle=await build({configFile:false,plugins:[react()],logLevel:'error',ssr:{noExternal:true},build:{ssr:'src/monitoring-kinerja.jsx',write:false,rollupOptions:{external:['react','react/jsx-runtime','lucide-react']}}});
  const code=bundle.output.find(x=>x.type==='chunk').code.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g,(_,q,s)=>`from ${JSON.stringify(import.meta.resolve(s))}`);
  const {MonitoringKinerjaPage}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const html=renderToStaticMarkup(React.createElement(MonitoringKinerjaPage));
  assert.deepEqual([...html.matchAll(/role="tab" id="monitoring-tab-([^"]+)"/g)].map(m=>m[1]),['sasaran','perjanjian','fisik','pengendalian','risiko']);
  assert.match(html,/id="monitoring-tab-sasaran"[^>]*aria-selected="true"[^>]*tabindex="0"/);
  for(const id of ['perjanjian','fisik','pengendalian','risiko']) {
    assert.match(html,new RegExp(`id="monitoring-tab-${id}"[^>]*aria-selected="false"[^>]*tabindex="-1"`));
    assert.match(html,new RegExp(`id="monitoring-panel-${id}"[^>]*hidden=""[^>]*></div>`));
  }
  assert.ok(html.indexOf('id="strategic-ministry-title"') < html.indexOf('id="strategic-directorate-title"'));
  assert.equal((html.match(/class="strategic-objective" tabindex="0"/g)||[]).length,12);
  for(const item of [...PROGRAM_OBJECTIVES,...DIRECTORATE_OBJECTIVES]) {
    assert.ok(html.includes(`aria-describedby="${item.id}-indicators"`));
    assert.ok(html.includes(`id="${item.id}-indicators"`));
  }
  assert.match(html,/overflow-y-auto/);
});

test('hover and keyboard focus highlight only the owning objective group and its child indicators',()=>{
  const css=fs.readFileSync(new URL('../src/strategic-objectives.css',import.meta.url),'utf8');
  assert.match(css,/\.strategic-group:hover \.strategic-objective,\.strategic-group:focus-within \.strategic-objective\s*\{[^}]*background: #084c61/);
  assert.match(css,/\.strategic-group:hover \.strategic-indicator,\.strategic-group:focus-within \.strategic-indicator\s*\{[^}]*background: #d7c78b/);
  assert.match(css,/prefers-reduced-motion: reduce/);
  assert.match(css,/max-width: 440px/);
  assert.doesNotMatch(css,/\.strategic-page:hover|\.strategic-grid:hover/);
});

test('SK and IKK use equal columns and shared expanding rows without truncating long text',()=>{
  const css=fs.readFileSync(new URL('../src/strategic-objectives.css',import.meta.url),'utf8');
  assert.match(css,/\.strategic-grid-directorate\s*\{[^}]*grid-template-columns: repeat\(6,minmax\(0,1fr\)\)[^}]*grid-auto-rows: minmax\(180px,1fr\)/);
  assert.match(css,/\.strategic-grid-directorate > \.strategic-group\s*\{[^}]*grid-template-rows: subgrid[^}]*grid-row: span 6/);
  assert.match(css,/\.strategic-indicators-directorate\s*\{[^}]*grid-row: 2 \/ span 5[^}]*grid-template-rows: subgrid/);
  assert.match(css,/\.strategic-grid-directorate \.strategic-objective h4\s*\{[^}]*font-size: clamp\(12px,.85vw,14px\)/);
  assert.doesNotMatch(css,/line-clamp|text-overflow: ellipsis|overflow: hidden/);
});
