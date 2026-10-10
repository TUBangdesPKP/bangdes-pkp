import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveLeaveSummary, filterArchiveItems, personalLeaveItems } from '../src/archive-leave-summary-model.js';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

test('personal leave is NIP-scoped for all roles, never matching by name or falling back to all staff',()=>{
  const rows=[{nip:"'001",nama:'Same',jumlahHari:3,tujuan:'Cuti Tahunan'},{nip:'002',nama:'Same',jumlahHari:5,tujuan:'Cuti Tahunan'}];
  for(const Role of ['pegawai','admin','Super Administrator']) {
    const personal=personalLeaveItems(rows,{NIP:'001',Nama:'Same',Role,sessionToken:'test'});
    assert.equal(personal.length,1);assert.equal(archiveLeaveSummary(personal).rows[0].total,3);
  }
  assert.deepEqual(personalLeaveItems(rows,{NIP:'SUPERADMIN',adminSessionToken:'test'}),[]);
  assert.deepEqual(personalLeaveItems(rows,{NIP:'001'}),[]);
  assert.equal(archiveLeaveSummary(rows).rows.length,2);
});

test('leave archive summary separates identical names by NIP, combines types and preserves decimal/zero days',()=>{
  const rows=[{nip:'001',nama:'Same',tujuan:'Cuti Tahunan',jumlahHari:'2',bulan:'Mei',tahun:'2026'},
    {nip:'001',nama:'Same',tujuan:' cuti  tahunan ',jumlahHari:'1,5',bulan:'Mei',tahun:'2026'},
    {nip:'002',nama:'Same',tujuan:'Cuti Alasan Penting',jumlahHari:0,bulan:'Juni',tahun:'2026'},
    {nip:'002',nama:'Same',tujuan:'Cuti Melahirkan',jumlahHari:30,bulan:'Mei',tahun:'2025'}];
  const model=archiveLeaveSummary(rows);
  assert.equal(model.rows.length,2);assert.equal(model.rows[0].days['Cuti Tahunan'],3.5);
  assert.equal(model.rows[1].days['Cuti Karena Alasan Penting'],0);assert.ok(model.types.includes('Cuti Melahirkan'));
  const filtered=filterArchiveItems(rows,{year:'2026',month:'Mei',search:'001'});
  assert.equal(filtered.length,2);assert.equal(archiveLeaveSummary(filtered).rows.length,1);
  assert.equal(filterArchiveItems(rows,{search:'alasan'}).length,1);
  assert.equal(filterArchiveItems(rows,{year:'2024'}).length,0);
  assert.equal(rows.length,4);
});
test('invalid recorded days never become fabricated durations, and no unseen employees are added',()=>{
  const model=archiveLeaveSummary([{nip:'001',nama:'Me',jumlahHari:'',tujuan:'Cuti Sakit'}, {nip:'001',nama:'Me',jumlahHari:'-',tujuan:'Cuti Sakit'}]);
  assert.equal(model.invalid,2);assert.equal(model.rows[0].total,0);
  assert.equal(archiveLeaveSummary([]).rows.length,0);
});

test('personal leave cards ignore list filters and exclude other employees for every role',async()=>{
  const bundle=await build({configFile:false,plugins:[react()],logLevel:'error',ssr:{noExternal:true},build:{ssr:'src/archive-leave-summary.jsx',write:false,emptyOutDir:false,rollupOptions:{external:['react','react/jsx-runtime']}}});
  const code=bundle.output.find(item=>item.type==='chunk').code.replace(/from (["'])(react(?:\/jsx-runtime)?)\1/g,(_,quote,specifier)=>`from ${JSON.stringify(import.meta.resolve(specifier))}`);
  const {ArchiveLeaveSummary}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const items=[{nip:'001',nama:'Pegawai Uji',tujuan:'Cuti Tahunan',jumlahHari:3,tahun:'2025'}, {nip:'001',nama:'Pegawai Uji',tujuan:'Cuti Tahunan',jumlahHari:2,tahun:'2026'}, {nip:'002',nama:'Pegawai Lain',tujuan:'Cuti Rahasia',jumlahHari:99}];
  for(const Role of ['pegawai','admin']) {
    const html=renderToStaticMarkup(React.createElement(ArchiveLeaveSummary,{items,user:{NIP:'001',sessionToken:'test',Role},year:'2026',search:'Pegawai Lain'}));
    for(const text of ['Data Cuti Saya','Cuti Tahunan','Cuti Sakit','Cuti Karena Alasan Penting','Total Hari','>5 '])assert.ok(html.includes(text));
    assert.doesNotMatch(html,/Pegawai Lain|Cuti Rahasia|Rekap Cuti per Pegawai|<select|<input/);
  }
  assert.match(renderToStaticMarkup(React.createElement(ArchiveLeaveSummary,{items:[]})),/Belum ada data cuti pribadi/);
});
