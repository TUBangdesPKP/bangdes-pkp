import { isRecapAdmin } from './monthly-recap-model.js';

export function dashboardModules(role) {
  return [
    { view: 'profil-saya', label: 'Profil Saya', icon: 'profile' },
    ...(isRecapAdmin(role) ? [
      { view: 'rekap', label: 'Rekap Bulanan', icon: 'recap' },
      { view: 'penghitungan', label: 'Penghitungan Uang Makan dan Tunjangan Kinerja', icon: 'calculation' },
    ] : []),
    { view: 'absensi-uang-makan', label: 'Rekap Uang Makan', icon: 'meal' },
    { view: 'absensi-tunjangan-kinerja', label: 'Rekap Tunjangan Kinerja', icon: 'allowance' },
    { view: 'arsip-surat-tugas', label: 'Arsip Surat Tugas', icon: 'spt' },
    { view: 'arsip-surat-cuti', label: 'Arsip Surat Cuti', icon: 'cuti' },
  ];
}

export const canManageSubmission = (view, role) => view === 'penghitungan' && isRecapAdmin(role);
