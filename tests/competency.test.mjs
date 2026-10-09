import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {analyzeCompetency, competencyNameKey, filterCompetency, JP_CSV_URL, loadCompetencyTraining, parseCompetencyCsv, canManageCompetency, chosenTrainingEmployee, trainingEmployeeLabel} from '../src/competency-model.js';

const people = [
  {NIP: '199001012020011001', Nama: 'Zeta, S.T.', SubUnitKerja: 'Wilayah I'},
  {NIP: '199001012020011002', Nama: 'Ar. Alfa, S.T.', SubUnitKerja: 'Tata Usaha'},
  {NIP: '199001012020011003', Nama: 'Beta', SubUnitKerja: 'Wilayah I'},
];
const csv = 'Nama,Sertifikasi / Diklat,Tahun,,Jumlah JP\n"Alfa, ST.","Pelatihan, A",2026,,"19,5"\n"Alfa, ST.",Pelatihan B,2026,,0.5\n"Zeta, S.T.",Tahun Lama,2025,,40\n"Zeta, S.T.",Tahun Baru,2026,,6\n"Zeta, S.T.",JP Kosong,2026,,\n';

test('JP editor only accepts an exact selection from the searchable employee list', () => {
  const label = trainingEmployeeLabel(people[0]);
  assert.equal(chosenTrainingEmployee(people, label), people[0]);
  assert.equal(chosenTrainingEmployee(people, 'Zeta'), null);
  assert.equal(chosenTrainingEmployee(people, 'Nama bebas'), null);
  assert.equal(chosenTrainingEmployee([...people, people[0]], label), null);
  assert.equal(canManageCompetency(null), false);
  assert.equal(canManageCompetency({...people[0], sessionToken: 'test', Akun_Role: 'pegawai'}), false);
  assert.equal(canManageCompetency({NIP: 'SUPERADMIN', Akun_Role: 'admin', adminSessionToken: 'test'}), false);
  assert.equal(canManageCompetency({...people[0], sessionToken: 'test', Akun_Role: 'Admin'}), true);
});

test('parses observed CSV headers, quoted training titles, decimal JP, and missing values', () => {
  const rows = parseCompetencyCsv('\uFEFF' + csv);
  assert.equal(rows.length, 5);
  assert.equal(rows[0].title, 'Pelatihan, A');
  assert.equal(rows[0].jp, 19.5);
  assert.equal(rows[4].jp, null);
  assert.equal(rows[0].sourceRow, 2);
  assert.equal(parseCompetencyCsv('Nama,Sertifikasi / Diklat,Tahun,Jumlah JP\nBeta,Pelatihan,2027,22')[0].jp, 22);
  assert.equal(competencyNameKey('Ar. Alfa, S.T.'), competencyNameKey('Alfa, ST.'));
  assert.equal(parseCompetencyCsv('Nama,Sertifikasi / Diklat,Tahun,,Jumlah JP\n').length, 0);
  assert.throws(() => parseCompetencyCsv('<html>Login</html>'), /CSV/);
  assert.throws(() => parseCompetencyCsv('No,Nama,Total JP,Pemenuhan JP\n1,Alfa,20,Memenuhi'), /Kolom/);
  assert.throws(() => parseCompetencyCsv('Nama,Sertifikasi / Diklat,Tahun,,Jumlah JP\n"unterminated'), /Format/);
});

test('preserves master order, zero-training employees, exact annual totals and 20 JP threshold', () => {
  const result = analyzeCompetency(people, parseCompetencyCsv(csv), 2026);
  assert.deepEqual(result.employees.map(row => row.name), people.map(row => row.Nama));
  assert.deepEqual(result.employees.map(row => row.total), [6, 20, 0]);
  assert.deepEqual(result.employees.map(row => row.met), [false, true, false]);
  assert.equal(result.employees[0].pending, 1);
  assert.equal(result.employees[0].courses.length, 2);
  assert.deepEqual(result.years, [2026, 2025]);
  assert.equal(analyzeCompetency(people, parseCompetencyCsv(csv), 2025).employees[0].total, 40);
  assert.equal(analyzeCompetency(people, parseCompetencyCsv(csv), 2027).employees.every(row => row.total === 0), true);
  const nearly = parseCompetencyCsv('Nama,Sertifikasi / Diklat,Tahun,,Jumlah JP\nBeta,Test,2026,,19.999');
  assert.equal(analyzeCompetency(people, nearly, 2026).employees[2].met, false);
});

test('combines status, subunit and name/NIP filters without changing source order', () => {
  const {employees} = analyzeCompetency(people, parseCompetencyCsv(csv), 2026);
  assert.deepEqual(filterCompetency(employees, {status: 'unmet', unit: 'Wilayah I'}).map(row => row.order), [1,3]);
  assert.equal(filterCompetency(employees, {status: 'met', unit: 'Wilayah I'}).length, 0);
  assert.equal(filterCompetency(employees, {search: 'ALFA'})[0].nip, people[1].NIP);
  assert.equal(filterCompetency(employees, {search: people[0].NIP})[0].name, people[0].Nama);
});

test('never guesses ambiguous names or overrides a conflicting NIP; supplied NIP stays exact text', () => {
  const names = [...people, {...people[1], NIP: '199001012020011004', Nama: 'Alfa, ST.'}];
  const result = analyzeCompetency(names, parseCompetencyCsv(csv), 2026);
  assert.equal(result.unmatched.length, 2);
  const nipCsv = `Nama,NIP,Sertifikasi / Diklat,Tahun,Jumlah JP\nAlfa,${people[1].NIP},Test,2026,20\nBeta,199001012020011009,Conflict,2026,20`;
  const byNip = analyzeCompetency(names, parseCompetencyCsv(nipCsv), 2026);
  assert.equal(byNip.employees[1].total, 20);
  assert.equal(byNip.employees[2].total, 0);
  assert.equal(byNip.unmatched.length, 1);
});

test('reports invalid source data and master duplicates instead of silently adding JP', () => {
  const rows = parseCompetencyCsv('Nama,Sertifikasi / Diklat,Tahun,,Jumlah JP\nBeta,A,abc,,20\nBeta,B,2026,,-2\nBeta,C,2026,,unknown\nTidak Cocok,D,2026,,20\nBeta,,2026,,20');
  const result = analyzeCompetency([...people, people[0], {Nama: 'Admin', NIP: 'SUPERADMIN'}, {}], rows, 2026);
  assert.equal(result.employees.length, 3);
  assert.equal(result.duplicates, 1);
  assert.equal(result.invalidYear.length, 1);
  assert.equal(result.unmatched.length, 2);
  assert.equal(result.employees[2].pending, 2);
  assert.equal(result.employees[2].total, 0);
});

test('loads only the fixed public detail sheet and propagates failures rather than returning zero JP', async () => {
  const controller = new AbortController();
  const rows = await loadCompetencyTraining({signal: controller.signal, fetchRequest: async (url, options) => {
    assert.equal(url, JP_CSV_URL); assert.match(url, /gid=0&single=true&output=csv/);
    assert.equal(options.credentials, 'omit'); assert.equal(options.signal, controller.signal);
    return {ok: true, text: async () => csv};
  }});
  assert.equal(rows.length, 5);
  await assert.rejects(loadCompetencyTraining({fetchRequest: async () => ({ok: false})}), /belum dapat dimuat/);
  await assert.rejects(loadCompetencyTraining({fetchRequest: async () => {throw new Error('Offline');}}), /Offline/);
});

test('UI includes filters and safe expandable training detail, and hides other years', async () => {
  const bundle = await build({configFile: false, plugins: [react()], logLevel: 'error', ssr: {noExternal: true}, build: {ssr: 'src/competency.jsx', write: false, emptyOutDir: false, rollupOptions: {external: ['react','react/jsx-runtime','lucide-react','papaparse']}}});
  const code = bundle.output.find(item => item.type === 'chunk').code.replace(/(from|import) (["'])(react(?:\/jsx-runtime)?|lucide-react|papaparse)\2/g, (_, keyword, quote, specifier) => `${keyword} ${JSON.stringify(import.meta.resolve(specifier))}`);
  const {CompetencyView, CompetencyTable, CompetencyPage} = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  const training = parseCompetencyCsv(csv);
  const html = renderToStaticMarkup(React.createElement(CompetencyView, {people, training, initialYear: 2026}));
  for (const label of ['Tahun','Subunit Kerja','Status Pemenuhan','Nama atau NIP','Memenuhi','Belum Memenuhi','JP belum diisi']) assert.ok(html.includes(label), label);
  assert.doesNotMatch(html, /Tahun Lama|NaN|Infinity/);
  assert.doesNotMatch(html, /Urutan mengikuti spreadsheet|Klik nama untuk melihat|JP kosong atau tidak valid tidak ditambahkan/);
  assert.ok(html.indexOf('Zeta, S.T.') < html.indexOf('Ar. Alfa, S.T.'));
  const employees = analyzeCompetency(people, training, 2026).employees;
  employees[0].courses[0].title = '<script>alert(1)</script>';
  const expanded = renderToStaticMarkup(React.createElement(CompetencyTable, {employees, year: 2026, expanded: people[0].NIP, onSelect: () => {}}));
  assert.match(expanded, /aria-expanded="true"/);
  assert.match(expanded, /&lt;script&gt;/); assert.doesNotMatch(expanded, /<script>/);
  assert.match(expanded, new RegExp(`<tr id="jp-detail-${people[0].NIP}"`));
  const loading = renderToStaticMarkup(React.createElement(CompetencyPage, {loadPeople: async () => ({data: people})}));
  assert.match(loading, /Memuat data pegawai dan pelatihan/);
  assert.doesNotMatch(loading, /Belum Memenuhi/);
  assert.doesNotMatch(loading, /Sumber:|href="https:\/\/docs.google.com/);
  assert.match(loading, /Tambah Data Pelatihan/);
  assert.match(loading, /aria-label="Muat ulang data"/);
  assert.doesNotMatch(loading, />Muat ulang data</);
  const filtered = renderToStaticMarkup(React.createElement(CompetencyTable, {employees: [employees[2]], year: 2026, onSelect: () => {}}));
  assert.match(filtered, /text-slate-500">1<\/td>/);
  assert.doesNotMatch(filtered, /text-slate-500">3<\/td>|Hapus pelatihan/);
  const managed = renderToStaticMarkup(React.createElement(CompetencyTable, {employees, year: 2026, expanded: people[0].NIP, onSelect: () => {}, onDelete: () => {}}));
  assert.match(managed, /aria-label="Hapus pelatihan/);
});

test('JP popup requires employee login for guests and gives admins searchable master names and four fields', async () => {
  const bundle = await build({configFile: false, plugins: [react()], logLevel: 'error', ssr: {noExternal: true}, build: {ssr: 'src/competency-editor.jsx', write: false, emptyOutDir: false, rollupOptions: {external: ['react','react/jsx-runtime','lucide-react','papaparse']}}});
  const code = bundle.output.find(item => item.type === 'chunk').code.replace(/(from|import) (["'])(react(?:\/jsx-runtime)?|lucide-react|papaparse)\2/g, (_, keyword, quote, specifier) => `${keyword} ${JSON.stringify(import.meta.resolve(specifier))}`);
  const {CompetencyDialog} = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  const guest = renderToStaticMarkup(React.createElement(CompetencyDialog, {people}));
  assert.match(guest, /Login Admin Pegawai/); assert.match(guest, /type="password"/);
  assert.doesNotMatch(guest, /Masuk dengan NIP pegawai|Akun username admin lama/);
  assert.doesNotMatch(guest, /jp-pegawai-options/);
  const admin = {...people[0], Akun_Role: 'Admin', sessionToken: 'NEVER-RENDER-THIS'};
  const form = renderToStaticMarkup(React.createElement(CompetencyDialog, {people, user: admin, revision: 'test'}));
  assert.match(form, /list="jp-pegawai-options"/); assert.match(form, /<datalist/);
  for (const person of people) assert.ok(form.includes(trainingEmployeeLabel(person)));
  for (const label of ['Nama Sertifikat / Pelatihan', 'Tahun Pelaksanaan', 'Jumlah Jam Pelajaran (JP)', 'Simpan Pelatihan']) assert.ok(form.includes(label));
  assert.doesNotMatch(form, /NEVER-RENDER-THIS/);
  const course = parseCompetencyCsv(csv)[0];
  const confirmation = renderToStaticMarkup(React.createElement(CompetencyDialog, {people, user: admin, course, revision: 'test'}));
  assert.match(confirmation, /Hapus Data Pelatihan\?/); assert.ok(confirmation.includes(course.title));
  assert.match(confirmation, /Ya, Hapus Pelatihan/);
});
