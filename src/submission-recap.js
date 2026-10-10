export function confirmSubmittedRecap({ modul, periode }, submittedCount, confirm = message => window.confirm(message)) {
  if (!Number.isInteger(submittedCount) || submittedCount < 1) return false;
  return confirm(`Yakin akan membuat rekap untuk ${submittedCount} Pegawai yang sudah Submit?\n\n${modul === 'tukin' ? 'Tunjangan Kinerja' : 'Uang Makan'} — ${periode}`);
}
