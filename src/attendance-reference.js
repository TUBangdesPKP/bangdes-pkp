export const isAttendancePdf = file => /\.pdf$/i.test(file?.name || '');
export const MAX_ATTENDANCE_PDF_BYTES = 10 * 1024 * 1024;

export function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('File tidak dapat dibaca. Pilih ulang dokumen.'));
    reader.onabort = () => reject(new Error('Pembacaan file dibatalkan.'));
    reader.readAsDataURL(file);
  });
}

export async function attendanceReferencePayload(file) {
  if (!isAttendancePdf(file)) return {};
  if (!file.size || file.size > MAX_ATTENDANCE_PDF_BYTES) throw new Error('PDF presensi harus berukuran 1 byte–10 MB.');
  const data = await readFileDataUrl(file);
  return { referencePdf: { fileName: file.name, fileBase64: String(data).split(',')[1] } };
}
