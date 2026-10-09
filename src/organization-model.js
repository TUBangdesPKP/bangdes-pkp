const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
const key = value => clean(value).toLowerCase().replace(/[.,]/g, '');

export const ORGANIZATION_UNITS = [
  {id:'rentek', title:'Subdirektorat Perencanaan Teknis'},
  {id:'wilayah1', title:'Subdirektorat Wilayah I'},
  {id:'wilayah2', title:'Subdirektorat Wilayah II'},
  {id:'wilayah3', title:'Subdirektorat Wilayah III'},
  {id:'fungsional', title:'Fungsional dan Pelaksana'},
  {id:'tu', title:'Subbagian Tata Usaha'},
];

function unitId(value) {
  const text = key(value);
  if (/perencanaan teknis|\brentek\b/.test(text)) return 'rentek';
  if (/tata usaha|^tu$/.test(text)) return 'tu';
  const region = text.match(/\bwilayah\s+(iii|ii|i|3|2|1)\b/);
  if (region) return `wilayah${{i:1,ii:2,iii:3}[region[1]] || region[1]}`;
  if (/fungsional|pelaksana|^direktorat pembangunan perumahan perdesaan$/.test(text)) return 'fungsional';
  return '';
}

export function organizationModel(people = []) {
  const units = ORGANIZATION_UNITS.map(unit => ({...unit, leaders:[], staff:[]}));
  const directors = [], unassigned = [], seen = new Set();
  let duplicates = 0;
  for (const row of people) {
    const nip = clean(row.NIP).replace(/^'/,''), name = clean(row.Nama);
    if (!name || !/^\d{18}$/.test(nip)) continue;
    if (seen.has(nip)) { duplicates++; continue; }
    seen.add(nip);
    const person = {nip, name, job:clean(row.Jabatan), grade:clean(row.GolonganRuang)};
    const job = key(person.job).replace(/^(?:plt|plh)\s+/, '').replace(/\bsub bagian\b/g,'subbagian').replace(/\bsub direktorat\b/g,'subdirektorat');
    if (/^direktur pembangunan perumahan perdesaan\b/.test(job)) { directors.push(person); continue; }
    const head = /^(?:kepala subdirektorat|kasubdit|kepala subbagian|kasubbag)\b/.test(job);
    // Leadership follows the explicit job, not an employee's supervisor name.
    const id = head ? unitId(job) : unitId(row.SubUnitKerja);
    const group = units.find(unit => unit.id === id);
    if (!group) { unassigned.push(person); continue; }
    group[head && id !== 'fungsional' ? 'leaders' : 'staff'].push(person);
  }
  return {directors, units, unassigned, duplicates, total:seen.size};
}
