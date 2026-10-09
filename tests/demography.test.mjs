import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDemography, demographyFields, UNKNOWN } from '../src/demography-model.js';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'vite';
import react from '@vitejs/plugin-react';

test('master demographic headers survive normalization and cache roundtrips',()=>{
  const row={'Jenis ASN':'PPPK','Golongan/ Ruang':'IX','Gender':'Perempuan','Pendidikan Terakhir':'S2',Generasi:'Generasi Y',Umur:'35 Tahun 4 Bulan'};
  const normalized=demographyFields(row);
  assert.deepEqual(demographyFields(normalized),normalized);
  assert.equal(normalized.JenisASN,'PPPK');assert.equal(normalized.GolonganRuang,'IX');
  assert.equal(demographyFields({Golongan:'III',Ruang:'a'}).GolonganRuang,'III/a');
  assert.equal(demographyFields({Golongan:'IX',Ruang:'-'}).GolonganRuang,'IX');
});

test('all demographic totals include unknown categories and ignore empty or repeated employees',()=>{
  const data=[{NIP:'1',Nama:'Uji A',Jabatan:'Analis\t Perumahan',...demographyFields({'Jenis ASN':'PNS','Golongan/ Ruang':'III/a',Gender:'Laki-Laki','Pendidikan Terakhir':'s-1',Generasi:'Generasi Y',Umur:'35 Tahun 3 Bulan'})},
    {NIP:'2',Nama:'Uji B',Jabatan:'Analis Perumahan',JenisASN:'PPPK',Gender:'P',Generasi:'Generasi Z',Umur:'24 Tahun'},
    {NIP:'3',Nama:'Uji C'}, {NIP:'1',Nama:'Duplikat'}, {}, {NIP:'SUPERADMIN',Nama:'Bukan Pegawai'}];
  const result=analyzeDemography(data);
  assert.equal(result.total,3);assert.equal(result.duplicates,1);
  for(const key of ['status','grades','education','jobs','gender'])assert.equal(result[key].reduce((sum,row)=>sum+row.value,0),3,key);
  assert.equal(result.jobs.find(row=>row.label==='Analis Perumahan').value,2);
  assert.equal(result.education.find(row=>row.label==='S1').value,1);
  assert.equal(result.pyramid.reduce((sum,row)=>sum+row.total,0),3);
  assert.equal(result.pyramid.find(row=>row.label===UNKNOWN).other,1);
  assert.equal(result.pyramid.find(row=>row.label==='Gen Y').ageRange,'35–35 tahun');
});

test('generation is authoritative from the sheet, not guessed from NIP or age; unclassified genders remain counted',()=>{
  const result=analyzeDemography([{NIP:'197001011234567890',Generasi:'Gen Z',Gender:'Tidak tercantum',Umur:'-'}]);
  assert.equal(result.pyramid.find(row=>row.label==='Gen Z').total,1);
  assert.equal(result.pyramid.find(row=>row.label==='Gen X').total,0);
  assert.equal(result.pyramid.find(row=>row.label==='Gen Z').other,1);
  assert.equal(result.pyramid.find(row=>row.label==='Gen Z').ageRange,null);
  assert.equal(analyzeDemography([]).total,0);
});

test('demographic charts render in mockup order with readable counts and no individual identity',async()=>{
  const bundle=await build({configFile:false,plugins:[react()],logLevel:'error',ssr:{noExternal:true},build:{ssr:'src/demography.jsx',write:false,emptyOutDir:false,rollupOptions:{external:['react','react/jsx-runtime','lucide-react']}}});
  const code=bundle.output.find(item=>item.type==='chunk').code.replace(/(from|import) (["'])(react(?:\/jsx-runtime)?|lucide-react)\2/g,(_,keyword,quote,specifier)=>`${keyword} ${JSON.stringify(import.meta.resolve(specifier))}`);
  const {DemographyCharts}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const data=[{NIP:'IDENTITAS-RAHASIA',Nama:'Nama tidak ditampilkan',JenisASN:'PNS',Gender:'Laki-Laki',Generasi:'Gen X',Jabatan:'Analis',PendidikanTerakhir:'S2',GolonganRuang:'IV/b',Umur:'50 Tahun'}];
  const html=renderToStaticMarkup(React.createElement(DemographyCharts,{data}));
  const titles=['Status Pegawai','Golongan/Ruang Pegawai','Tingkat Pendidikan Terakhir','Jenis Kelamin','Jabatan','Rentang Umur / Generasi'];
  let index=-1;
  for(const title of titles){const next=html.indexOf(`aria-label="${title}"`);assert.ok(next>index,title);index=next;}
  assert.match(html,/100%/);assert.match(html,/50–50 tahun/);
  assert.equal((html.match(/role="img"/g)||[]).length,6);
  assert.doesNotMatch(html,/IDENTITAS-RAHASIA|Nama tidak ditampilkan/);
  const empty=renderToStaticMarkup(React.createElement(DemographyCharts,{data:[]}));
  assert.match(empty,/Belum ada data pegawai/);assert.doesNotMatch(empty,/NaN|Infinity/);
});
