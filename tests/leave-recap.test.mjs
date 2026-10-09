import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {BASE_LEAVE_TYPES, leaveRecapModel, loadLeaveRecap} from '../src/leave-recap-model.js';

const people=[
  {NIP:'199001012020011001',Nama:'Zeta',SubUnitKerja:'Wilayah I'},
  {NIP:'199001012020011002',Nama:'Alfa',SubUnitKerja:'Tata Usaha'},
  {NIP:'199001012020011003',Nama:'Beta',SubUnitKerja:'Wilayah I'},
];
const totals=[
  {nip:people[0].NIP,type:'Cuti Tahunan',year:2026,days:5},
  {nip:people[0].NIP,type:'Cuti Sakit',year:2026,days:2},
  {nip:people[0].NIP,type:'Cuti Tahunan',year:2025,days:4},
  {nip:people[1].NIP,type:'Cuti Besar',year:2026,days:10},
  {nip:people[1].NIP,type:'Cuti Sakit',year:null,days:1},
];
test('leave matrix preserves master order, supports dynamic types and includes zero leave employees',()=>{
  const model=leaveRecapModel([...people,people[0],{NIP:'SUPERADMIN',Nama:'Admin'},{}],totals);
  assert.deepEqual(model.rows.map(row=>row.name),['Zeta','Alfa','Beta']);
  assert.deepEqual(model.types,[...BASE_LEAVE_TYPES,'Cuti Besar']);
  assert.deepEqual(model.rows.map(row=>row.total),[11,11,0]);
  assert.equal(model.rows[0].days['Cuti Tahunan'],9);
  assert.equal(model.totalDays,22);assert.equal(model.withLeave,2);
  assert.equal(model.hasUnknownYear,true);assert.deepEqual(model.years,[2026,2025]);
});
test('year, subunit and name/NIP filters combine without changing employee order',()=>{
  const current=leaveRecapModel(people,totals,{year:'2026',unit:'Wilayah I'});
  assert.deepEqual(current.rows.map(row=>row.name),['Zeta','Beta']);assert.equal(current.totalDays,7);
  assert.equal(leaveRecapModel(people,totals,{year:'2025',search:people[0].NIP}).totalDays,4);
  assert.equal(leaveRecapModel(people,totals,{year:'unknown',search:'ALFA'}).totalDays,1);
  assert.equal(leaveRecapModel(people,totals,{year:'2027'}).totalDays,0);
  assert.equal(leaveRecapModel(people,totals,{search:'absent'}).rows.length,0);
  const unknown=leaveRecapModel(people,[...totals,{nip:'199001012020011009',type:'Cuti Tahunan',year:2026,days:30}]);
  assert.equal(unknown.unmatched,1);assert.equal(unknown.totalDays,22);
});
test('leave loading accepts only versioned aggregated responses; failures never become zero days',async()=>{
  const fetchRequest=async(url,options)=>{
    assert.equal(url,'https://test.invalid');assert.deepEqual(JSON.parse(options.body),{action:'rekap_cuti_kepegawaian'});
    return {ok:true,json:async()=>({status:'success',leaveRecapVersion:1,totals,warnings:{invalidRows:1}})};
  };
  assert.equal((await loadLeaveRecap('https://test.invalid',fetchRequest)).totals.length,5);
  for(const payload of [{status:'success'}, {status:'success',leaveRecapVersion:1,totals:[{...totals[0],days:-1}]}, {status:'success',leaveRecapVersion:1,totals:[{...totals[0],year:'2026'}]}, {status:'error',message:'Backend belum diperbarui'}]) {
    await assert.rejects(loadLeaveRecap('test',async()=>({ok:true,json:async()=>payload})));
  }
});
test('leave UI renders a scrollable per-type matrix, filters, sequential numbering and icon-only refresh',async()=>{
  const bundle=await build({configFile:false,plugins:[react()],logLevel:'error',ssr:{noExternal:true},build:{ssr:'src/leave-recap.jsx',write:false,emptyOutDir:false,rollupOptions:{external:['react','react/jsx-runtime','lucide-react']}}});
  const code=bundle.output.find(item=>item.type==='chunk').code.replace(/(from|import) (["'])(react(?:\/jsx-runtime)?|lucide-react)\2/g,(_,keyword,quote,specifier)=>`${keyword} ${JSON.stringify(import.meta.resolve(specifier))}`);
  const {LeaveRecapView,LeaveRecapTable,LeaveRecapPage}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const html=renderToStaticMarkup(React.createElement(LeaveRecapView,{people,totals}));
  for(const value of ['Tahun','Semua tahun','Subunit Kerja','Nama atau NIP','Cuti Tahunan','Cuti Sakit','Cuti Karena Alasan Penting','Cuti Besar','Total Hari','Nama / NIP'])assert.ok(html.includes(value),value);
  assert.ok(html.indexOf('>Zeta<')<html.indexOf('>Alfa<'));
  assert.match(html,/overflow-auto max-h-\[65vh\]/);assert.doesNotMatch(html,/https:|Tambah|Hapus|kolom [A-Z]|NaN|Infinity/);
  const filtered=renderToStaticMarkup(React.createElement(LeaveRecapTable,{model:leaveRecapModel(people,totals,{search:'Beta'})}));
  assert.match(filtered,/text-slate-500">1<\/td>/);assert.doesNotMatch(filtered,/>3<\/td>/);
  const loading=renderToStaticMarkup(React.createElement(LeaveRecapPage,{endpoint:'test',loadPeople:async()=>({data:people})}));
  assert.match(loading,/aria-label="Muat ulang rekap cuti"/);assert.match(loading,/Memuat rekap cuti/);
  assert.doesNotMatch(loading,/Tabel Rekap Cuti|0 Hari/);
});
