export const EXTRA_TYPES = { lupa_absen: 'Surat Lupa Absen', tugas_belajar: 'Surat Tugas Belajar', lainnya: 'Dokumen Lainnya' };
export const extraFileKey = file => JSON.stringify([file.name, file.size, file.lastModified]);

export function addExtraFiles(current, files, storedCount = 0, makeId = () => crypto.randomUUID()) {
  const seen = new Set(current.map(item => extraFileKey(item.file)));
  const additions = [];
  for (const file of Array.from(files || [])) {
    if (!/\.(pdf|png|jpe?g)$/i.test(file.name) || !file.size || file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: pilih PDF/JPG/PNG maksimal 10 MB per file.`);
    const key = extraFileKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    additions.push({ id: makeId(), file, type: '', attempted: false });
  }
  if (storedCount + current.length + additions.length > 10) throw new Error('Maksimal 10 dokumen pendukung lainnya per pegawai dan periode.');
  return [...current, ...additions];
}
