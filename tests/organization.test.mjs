import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {organizationModel} from '../src/organization-model.js';

const person = (n,job,unit='') => ({NIP:`19900101202001${String(n).padStart(4,'0')}`,Nama:`Pegawai ${n}`,Jabatan:job,SubUnitKerja:unit,GolonganRuang:'III/a'});
test('organization uses explicit jobs for heads and subunits for staff without mistaking supervisor titles', () => {
  const people = [person(1,'Direktur Pembangunan Perumahan Perdesaan'),
    person(2,'Kepala Subdirektorat Perencanaan Teknis'),person(3,'Kasubdit Wilayah I'),
    person(4,'Plt. Kepala Subdirektorat Wilayah II'),person(5,'Kepala Subdirektorat Wilayah III'),
    person(6,'Kasubbag Tata Usaha'),person(7,'Analis','Wilayah III'),
    {...person(8,'Analis','Wilayah I'),JabatanAtasan:'Direktur Pembangunan Perumahan Perdesaan'},
    person(9,'Analis','Subdirektorat Perencanaan Teknis'),person(10,'Analis','Wilayah II'),
    person(11,'Analis','Tata Usaha'),person(12,'Analis','Direktorat Pembangunan Perumahan Perdesaan')];
  const model = organizationModel(people);
  assert.equal(model.total,12);
  assert.deepEqual(model.directors.map(p=>p.name),['Pegawai 1']);
  assert.deepEqual(model.units.map(u=>u.leaders.length),[1,1,1,1,0,1]);
  assert.deepEqual(model.units.map(u=>u.staff.length),[1,1,1,1,1,1]);
  assert.equal(model.unassigned.length,0);
});
test('unknown units remain visible, duplicate NIPs count once, master order is retained, and no admin account enters the chart', () => {
  const first=person(1,'Staf','Wilayah II');
  const model=organizationModel([first,person(3,'Staf','Wilayah II'),first,person(2,'Staf','Unit Baru'),
    person(4,'Kasubdit Unit Baru'),{NIP:'SUPERADMIN',Nama:'Admin'}]);
  assert.equal(model.total,4);
  assert.equal(model.duplicates,1);
  assert.deepEqual(model.units[2].staff.map(p=>p.name),['Pegawai 1','Pegawai 3']);
  assert.deepEqual(model.unassigned.map(p=>p.name),['Pegawai 2','Pegawai 4']);
  assert.deepEqual(model.directors,[]);
});
test('chart renders all branches, safe names, NIPs, and an accessible scroll region',async()=>{
  const bundle=await build({configFile:false,plugins:[react()],logLevel:'error',ssr:{noExternal:true},build:{ssr:'src/organization.jsx',write:false,rollupOptions:{external:['react','react/jsx-runtime','lucide-react']}}});
  const code=bundle.output.find(x=>x.type==='chunk').code.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g,(_,q,s)=>`from ${JSON.stringify(import.meta.resolve(s))}`);
  const {OrganizationChart,OrganizationPage}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const html=renderToStaticMarkup(React.createElement(OrganizationChart,{people:[{...person(1,'Analis','Wilayah I'),Nama:'<script>Test</script>'}]}));
  assert.match(html,/Bagan struktur unit kerja, dapat digulir/);
  assert.match(html,/tabindex="0"/);
  for(const name of ['Perencanaan Teknis','Wilayah I','Wilayah II','Wilayah III','Fungsional dan Pelaksana','Kepala Subbagian Tata Usaha'])assert.ok(html.includes(name));
  assert.match(html,/&lt;script&gt;Test&lt;\/script&gt;/);
  assert.match(html,/NIP 199001012020010001/);
  assert.match(html,/Data direktur belum tersedia/);
  assert.doesNotMatch(html,/<script>/);
  const empty=renderToStaticMarkup(React.createElement(OrganizationChart,{people:[]}));
  assert.match(empty,/Belum ada data pegawai/);
  const loading=renderToStaticMarkup(React.createElement(OrganizationPage,{loadPeople:()=>{throw Error('SSR must not fetch');}}));
  assert.match(loading,/Memuat struktur unit kerja/);
  assert.match(loading,/aria-label="Muat ulang struktur" disabled=""/);
});
