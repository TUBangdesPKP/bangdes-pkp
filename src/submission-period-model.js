export const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export const submissionIsReadOnly = period => !!period && period.status !== 'DIBUKA';
export const submissionEntryStep = (period, admin) => admin ? 2 : 5;
export const readOnlySubmissionStep = step => [1, 3, 4, 5].includes(step);
export const selectedSubmissionEmployee = (selection, modul, period, admin) =>
  admin && selection?.modul === modul && selection?.periode === period?.periodeEvent ? selection.employee : null;

export function submissionPeriodCard(modul, year, month, status = 'DITUTUP') {
  if (!['uang-makan','tukin'].includes(modul) || !Number.isInteger(year) || year < 2000 || year > 9999 || !Number.isInteger(month) || month < 1 || month > 12) throw new Error('Bulan atau tahun submisi tidak valid.');
  const meal = modul === 'uang-makan';
  const start = new Date(Date.UTC(year, meal ? month - 1 : month - 3, meal ? 1 : 11));
  const end = new Date(Date.UTC(year, meal ? month : month - 2, meal ? 0 : 10));
  const numeric = date => `${String(date.getUTCDate()).padStart(2,'0')}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${date.getUTCFullYear()}`;
  const label = date => `${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()].slice(0,3)} ${date.getUTCFullYear()}`;
  const key = `${year}-${String(month).padStart(2,'0')}`;
  return { id: `${meal ? 'um' : 'tukin'}-${key}`, year, month, status,
    title: `Bukti Dukung ${meal ? 'Uang Makan' : 'Tukin'} Bulan ${MONTH_NAMES[month-1]} ${year}`,
    periodeLabel: `${label(start)} – ${label(end)}`, periodeEvent: `${numeric(start)} s/d ${numeric(end)}`,
    startDate: numeric(start), endDate: numeric(end), periodeFolder: `Periode_${key}`,
    tipe: meal ? 'Uang Makan' : 'Tunjangan Kinerja', expectedDays: Math.round((end-start)/86400000)+1 };
}
