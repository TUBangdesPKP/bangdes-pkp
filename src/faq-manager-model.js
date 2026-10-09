export function findFaqManager(people) {
  if (!Array.isArray(people)) return null;
  // Select Ghina Sekarsari, not another employee with the same first name.
  const matches = people.filter(person => /^ghina\s+sekarsar[iy]\b/i.test(String(person?.Nama || '').trim().replace(/\s+/g,' ')));
  if (matches.length !== 1) return null;
  const person = matches[0];
  return {name:String(person.Nama).trim(),job:String(person.Jabatan || '').trim(),photo:String(person.Foto_Pegawai || '').trim()};
}
