export function manualArchiveFileSelection(files) {
  const selected = Array.from(files || []);
  if (!selected.length) return {file:null,error:''};
  if (selected.length !== 1) return {file:null,error:'Pilih satu file untuk setiap formulir manual. Gunakan Tambah Manual Lainnya untuk dokumen berikutnya.'};
  const file = selected[0];
  if (!/\.(pdf|jpe?g|png)$/i.test(file.name || '')) return {file:null,error:'Format file harus PDF, JPG, atau PNG.'};
  if (!Number.isFinite(file.size) || file.size <= 0) return {file:null,error:'File kosong atau tidak dapat dibaca. Pilih file lain.'};
  if (file.size > 10 * 1024 * 1024) return {file:null,error:'Ukuran file maksimal 10 MB.'};
  return {file,error:''};
}
