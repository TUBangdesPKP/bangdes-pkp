import Papa from 'papaparse';

export const JP_TARGET = 20;
export const JP_SOURCE_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSHOup2kT_VyLCt2xWpq6Mr3Otn-akrg4IYw97r7Wi0FGXay4KJO-wcaqTVJiFpWej96_uET-52roqK/pubhtml';
// Pin the detail sheet, not the all-years summary, even if the owner reorders tabs.
export const JP_CSV_URL = JP_SOURCE_URL.replace('/pubhtml', '/pub?gid=0&single=true&output=csv');
const text = value => String(value ?? '').trim();
const headerKey = value => text(value).toLowerCase().replace(/[^a-z0-9]/g, '');
export const competencyNameKey = value => text(value).normalize('NFKC').toLowerCase()
  .replace(/^(?:(?:ir|ar|dr|drs|dra|prof)\.\s*)+/, '').replace(/[^\p{L}\p{N}]/gu, '');

function jpValue(value) {
  const raw = text(value).replace(/\s*JP$/i, '').trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(raw)) return null;
  const number = Number(raw.replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

export function parseCompetencyCsv(csv) {
  if (typeof csv !== 'string' || /^\s*</.test(csv)) throw new Error('Sumber pelatihan tidak mengembalikan data CSV.');
  const parsed = Papa.parse(csv.replace(/^\uFEFF/, ''), {skipEmptyLines: 'greedy', dynamicTyping: false});
  if (parsed.errors.length) throw new Error('Format data pelatihan belum dapat dibaca. Periksa spreadsheet sumber.');
  const headerIndex = parsed.data.findIndex(row => {
    const keys = row.map(headerKey);
    return ['nama', 'sertifikasidiklat', 'tahun', 'jumlahjp'].every(key => keys.includes(key));
  });
  if (headerIndex < 0) throw new Error('Kolom Nama, Sertifikasi / Diklat, Tahun, atau Jumlah JP tidak ditemukan.');
  const keys = parsed.data[headerIndex].map(headerKey);
  const read = (row, key) => text(row[keys.indexOf(key)]);
  return parsed.data.slice(headerIndex + 1).filter(row => row.some(value => text(value))).map((row, index) => {
    const yearText = read(row, 'tahun');
    return {
      id: `training-${headerIndex + index + 2}`, sourceRow: headerIndex + index + 2,
      name: read(row, 'nama'), nip: read(row, 'nip').replace(/^'/, '').replace(/\s/g, ''),
      title: read(row, 'sertifikasidiklat'), year: /^(19|20|21)\d{2}$/.test(yearText) ? Number(yearText) : null,
      jp: jpValue(read(row, 'jumlahjp')),
    };
  });
}

export async function loadCompetencyTraining({signal, fetchRequest = fetch} = {}) {
  const response = await fetchRequest(JP_CSV_URL, {signal, cache: 'no-store', credentials: 'omit'});
  if (!response.ok) throw new Error('Spreadsheet pelatihan belum dapat dimuat. Silakan coba lagi.');
  return parseCompetencyCsv(await response.text());
}

export function analyzeCompetency(people, training, year) {
  const seen = new Set();
  let duplicates = 0;
  const employees = people.filter(person => {
    const nip = text(person.NIP);
    if (!text(person.Nama) || !nip || /^(admin|superadmin)$/i.test(nip)) return false;
    if (seen.has(nip)) { duplicates++; return false; }
    seen.add(nip); return true;
  }).map((person, index) => ({
    nip: text(person.NIP), name: text(person.Nama), unit: text(person.SubUnitKerja) || 'Subunit belum diisi',
    order: index + 1, courses: [], total: 0, pending: 0,
  }));
  const byNip = new Map(employees.map(person => [person.nip, person]));
  const byName = new Map();
  employees.forEach(person => {
    const key = competencyNameKey(person.name);
    byName.set(key, [...(byName.get(key) || []), person]);
  });
  const unmatched = [], invalidYear = [];
  training.forEach(course => {
    if (!course.year) { invalidYear.push(course); return; }
    if (course.year !== Number(year)) return;
    // Never fall back to a name when a supplied NIP conflicts with the master.
    const matches = course.nip ? [byNip.get(course.nip)].filter(Boolean) : byName.get(competencyNameKey(course.name)) || [];
    if (matches.length !== 1 || !course.title) { unmatched.push(course); return; }
    const person = matches[0];
    person.courses.push(course);
    if (course.jp === null) person.pending++;
    else person.total += course.jp;
  });
  employees.forEach(person => {
    person.total = Math.round(person.total * 1e9) / 1e9;
    person.met = person.total >= JP_TARGET;
  });
  return {employees, unmatched, invalidYear, duplicates,
    units: [...new Set(employees.map(person => person.unit))],
    years: [...new Set([Number(year), ...training.map(course => course.year).filter(Boolean)])].sort((a,b) => b-a)};
}

export function filterCompetency(employees, {unit = '', status = '', search = ''} = {}) {
  const query = text(search).toLowerCase();
  return employees.filter(person => (!unit || person.unit === unit)
    && (!status || (status === 'met' ? person.met : !person.met))
    && (!query || `${person.name} ${person.nip}`.toLowerCase().includes(query)));
}
