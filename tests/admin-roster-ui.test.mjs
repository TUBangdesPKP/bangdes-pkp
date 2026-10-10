import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { submissionTheme } from '../src/submission-theme.js';

test('admin Tukin cards and banner use khaki/black, while meal and personal recap keep teal', async()=>{
  const {AdminPeriodCards}=await component('src/submission-periods.jsx');
  const tukin=renderToStaticMarkup(React.createElement(AdminPeriodCards,{modul:'tukin',year:2026,onSelect:()=>{}}));
  const meal=renderToStaticMarkup(React.createElement(AdminPeriodCards,{modul:'uang-makan',year:2026,onSelect:()=>{}}));
  assert.equal((tukin.match(/bg-\[#D5C58A\] text-black/g)||[]).length,12);
  assert.equal((meal.match(/bg-\[#143E50\] text-white/g)||[]).length,12);
  assert.equal(submissionTheme('tukin',true).bannerStyle.backgroundColor,'#D5C58A');
  assert.equal(submissionTheme('tukin',true).bannerStyle.color,'#000000');
  assert.equal(submissionTheme('tukin',false).bannerStyle.backgroundColor,'#084C61');
  assert.equal(submissionTheme('uang-makan',true).bannerStyle.backgroundColor,'#084C61');
});

async function component(path) {
  const bundle = await build({configFile:false,plugins:[react()],logLevel:'error',ssr:{noExternal:true},build:{ssr:path,write:false,emptyOutDir:false,rollupOptions:{external:['react','react/jsx-runtime','lucide-react']}}});
  const code = bundle.output.find(item => item.type === 'chunk').code.replace(/from (["'])(react(?:\/jsx-runtime)?|lucide-react)\1/g, (_, quote, specifier) => `from ${JSON.stringify(import.meta.resolve(specifier))}`);
  return import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
}
test('roster has six columns, separated ASN groups, alphabetical row order and actionable status cards', async () => {
  const { SubmissionEmployeeCards, SubmissionSummary } = await component('src/submission-summary.jsx');
  const employees = [{nip:'2',nama:'Zahra',jenisAsn:'PNS',submitted:false},{nip:'3',nama:'Citra',jenisAsn:'PPPK',submitted:true},{nip:'1',nama:'Adi',jenisAsn:'PNS',submitted:true}];
  const selected = [], tree = SubmissionEmployeeCards({ employees, onSelectEmployee: row => selected.push(row) });
  tree.props.children[0].props.children[1].props.children[0].props.onClick();
  assert.equal(selected[0].nama, 'Adi');
  const html = renderToStaticMarkup(React.createElement(SubmissionEmployeeCards, { employees, onSelectEmployee: () => {} }));
  assert.match(html,/xl:grid-cols-6/); assert.match(html,/Pegawai PNS/); assert.match(html,/Pegawai PPPK/);
  assert.ok(html.indexOf('Adi') < html.indexOf('Zahra')); assert.match(html,/Adi — Sudah submit/); assert.match(html,/Zahra — Belum submit/);
  assert.equal((html.match(/<button /g)||[]).length,3);
  const initial = renderToStaticMarkup(React.createElement(SubmissionSummary,{endpoint:'test',context:{modul:'uang-makan',periode:'test'},user:{sessionToken:'test'},adminKey:'nonempty-but-not-verified',onAdminKeyChange:()=>{}}));
  assert.match(initial,/<button disabled=""[^>]*>[\s\S]*Buat Rekapan PNS/);
  assert.doesNotMatch(initial,/Kunci hanya untuk|Pegawai sudah terhitung|<table|type="password"|Verifikasi kunci/);
  assert.match(initial,/Download Bukti Dukung Uang Makan/);
  const tukin = renderToStaticMarkup(React.createElement(SubmissionSummary,{endpoint:'test',context:{modul:'tukin',periode:'test'},user:{adminSessionToken:'test'}}));
  assert.match(tukin,/Download Bukti Dukung Tukin/);
});
test('year is a centered labeled select, and presensi accepts file drop and keyboard picker', async () => {
  const { YearSelect } = await component('src/year-select.jsx');
  const years = renderToStaticMarkup(React.createElement(YearSelect,{value:2026,onChange:()=>{}}));
  assert.match(years,/Pilih Tahun/); assert.match(years,/<select/); assert.match(years,/text-align-last:center/); assert.doesNotMatch(years,/type="number"/);
  const { AttendanceFileDropzone } = await component('src/attendance-file-dropzone.jsx');
  const drop = renderToStaticMarkup(React.createElement(AttendanceFileDropzone,{onFiles:()=>{}}));
  assert.match(drop,/drag &amp; drop file presensi/); assert.match(drop,/accept=".pdf,.xlsx,.xls"/); assert.doesNotMatch(drop,/multiple/);
});
